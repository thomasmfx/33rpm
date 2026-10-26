/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

interface LogApi {
  operacao: string;
  usuario: string;
  dadosAlterados: { status: string };
}

const solicitar = (corpo: object) =>
  cy.request({ method: 'POST', url: `${API()}/trocas`, body: corpo, failOnStatusCode: false });

const avancar = (trocaId: number, status: string, retornoEstoque?: boolean) =>
  cy.request({
    method: 'PUT',
    url: `${API()}/trocas/${trocaId}/status`,
    body: { status: { descricao: status }, retornoEstoque },
    failOnStatusCode: false,
  });

/** O id de cada item da compra, pelo título do disco. */
const itensDo = (pedidoId: number) =>
  cy
    .request(`${API()}/pedidos/${pedidoId}`)
    .its('body.itens')
    .then((itens: { id: number; titulo: string }[]) =>
      Object.fromEntries(itens.map((item) => [item.titulo, item.id])),
    );

describe('Troca e devolução (RF0041 a RF0045, RF0054, RN0041 a RN0043, RN0046)', () => {
  it('RN0041 - não troca mais unidades do que comprou, nem a compra inteira depois de uma troca parcial', () => {
    cy.pedidoEntregue([
      { titulo: 'To Pimp A Butterfly', quantidade: 2 },
      { titulo: 'The Slow Rush', quantidade: 1 },
    ]).then((id) => {
      itensDo(id).then((itens) => {
        const pedido = { pedidoId: id, clienteId: 1, motivo: 'Vieram riscados' };

        solicitar({ ...pedido, itens: [{ itemPedidoId: itens['To Pimp A Butterfly'], quantidade: 3 }] })
          .its('body.mensagens')
          .should('deep.eq', ['RN0041: só há 2 unidade(s) de To Pimp A Butterfly para trocar nesta compra.']);

        solicitar({ ...pedido, itens: [{ itemPedidoId: itens['To Pimp A Butterfly'], quantidade: 1 }] })
          .its('status')
          .should('eq', 201);
        solicitar({ ...pedido, itens: [{ itemPedidoId: itens['To Pimp A Butterfly'], quantidade: 2 }] })
          .its('body.mensagens')
          .should('deep.eq', ['RN0041: só há 1 unidade(s) de To Pimp A Butterfly para trocar nesta compra.']);
        solicitar({ ...pedido, compraInteira: true })
          .its('body.mensagens')
          .should('deep.eq', ['RN0041: parte desta compra já foi para troca; escolha os itens que faltam.']);
        solicitar({ ...pedido, motivo: ' ', itens: [{ itemPedidoId: itens['The Slow Rush'], quantidade: 1 }] })
          .its('body.mensagens')
          .should('deep.eq', ['Informe o motivo da troca.']);

        // RN0041: a troca de itens não muda o status da compra
        cy.request(`${API()}/pedidos/${id}`).its('body.status.descricao').should('eq', 'ENTREGUE');
      });
    });
  });

  it('RN0042 - a troca segue a ordem: o recebimento só depois da autorização, e só uma vez', () => {
    cy.pedidoEntregue([{ titulo: 'God Does Like Ugly', quantidade: 1 }]).then((id) => {
      itensDo(id).then((itens) => {
        solicitar({
          pedidoId: id,
          clienteId: 1,
          motivo: 'Capa amassada',
          itens: [{ itemPedidoId: itens['God Does Like Ugly'], quantidade: 1 }],
        }).then(({ body: troca }) => {
          avancar(troca.id, 'TROCADO', true)
            .its('body.mensagens')
            .should('deep.eq', ['RN0042: só trocas autorizadas têm o recebimento confirmado; esta está EM TROCA.']);
          avancar(troca.id, 'TROCA AUTORIZADA').its('body.status.descricao').should('eq', 'TROCA AUTORIZADA');
          avancar(troca.id, 'TROCA AUTORIZADA')
            .its('body.mensagens')
            .should('deep.eq', ['RF0042: só trocas EM TROCA podem ser autorizadas; esta está TROCA AUTORIZADA.']);
          avancar(troca.id, 'TROCADO')
            .its('body.mensagens')
            .should('deep.eq', ['RF0044: informe se os itens trocados voltam ao estoque.']);
          avancar(troca.id, 'TROCADO', true).its('body.status.descricao').should('eq', 'TROCADO');
          avancar(troca.id, 'TROCADO', true).its('status').should('eq', 400);
        });
      });
    });
  });

  it('RF0044 e RF0045 - recebida sem retorno ao estoque, a troca gera o cupom e o estoque fica como está', () => {
    cy.pedidoEntregue([{ titulo: 'Nada Como Um Dia Após O Outro Dia', quantidade: 1 }]).then((id) => {
      cy.discoPorTitulo('Nada Como Um Dia Após O Outro Dia').then((depoisDaVenda) => {
        itensDo(id).then((itens) => {
          solicitar({
            pedidoId: id,
            clienteId: 1,
            motivo: 'Disco quebrado no transporte',
            itens: [{ itemPedidoId: itens['Nada Como Um Dia Após O Outro Dia'], quantidade: 1 }],
          }).then(({ body: troca }) => {
            avancar(troca.id, 'TROCA AUTORIZADA');
            avancar(troca.id, 'TROCADO', false)
              .its('body.cupomGerado')
              .should('include', { codigo: `TROCA-T${String(troca.id).padStart(6, '0')}`, valor: 379 });
          });
        });
        cy.discoPorTitulo('Nada Como Um Dia Após O Outro Dia')
          .its('estoque')
          .should('eq', depoisDaVenda.estoque);
      });
    });
  });

  it('RN0041 e RN0042 - na troca da compra inteira, a compra acompanha EM TROCA, TROCA AUTORIZADA e TROCADO', () => {
    cy.pedidoEntregue([
      { titulo: 'Long.Live.A$AP', quantidade: 1 },
      { titulo: 'It Takes A Nation Of Millions To Hold Us Back', quantidade: 1 },
    ]).then((id) => {
      const status = () => cy.request(`${API()}/pedidos/${id}`).its('body.status.descricao');
      solicitar({ pedidoId: id, clienteId: 1, motivo: 'Comprei por engano', compraInteira: true }).then(
        ({ body: troca }) => {
          expect(troca.itens).to.have.length(2);
          // 389 + 339: o frete não entra no cupom
          expect(troca.valor).to.eq(728);
          status().should('eq', 'EM TROCA');
          avancar(troca.id, 'TROCA AUTORIZADA');
          status().should('eq', 'TROCA AUTORIZADA');
          avancar(troca.id, 'TROCADO', true);
          status().should('eq', 'TROCADO');
        },
      );
    });
  });

  it('RF0042 - na lista de vendas, a compra com troca parcial mostra o passo da troca no filtro Todos', () => {
    cy.pedidoEntregue([
      { titulo: 'The Miseducation Of Lauryn Hill', quantidade: 1 },
      { titulo: 'Man On The Moon: The End Of Day', quantidade: 1 },
    ]).then((id) => {
      itensDo(id).then((itens) => {
        solicitar({
          pedidoId: id,
          clienteId: 1,
          motivo: 'Um dos discos veio empenado',
          itens: [{ itemPedidoId: itens['Man On The Moon: The End Of Day'], quantidade: 1 }],
        });
      });
      const linha = () => cy.get(`[data-testid="pedido-linha-admin"][data-pedido-id="${id}"]`);

      cy.entrarComoAdministrador('/curadoria/pedidos');
      cy.get('[data-testid="busca-pedidos"]').type(String(id));

      // RN0041: a compra segue ENTREGUE, e o botão é o da troca dela
      linha()
        .should('have.attr', 'data-status', 'ENTREGUE')
        .find('[data-testid="btn-proximo-passo-troca"]')
        .should('contain', 'Autorizar troca');
      cy.get('[data-testid="filtro-acao"]').click();
      linha().should('exist');
      cy.get('[data-testid="filtro-todos"]').click();

      linha().find('[data-testid="btn-proximo-passo-troca"]').click();
      cy.get('[data-testid="alerta-curadoria-pedidos"]').should('contain', 'o cliente foi notificado');
      linha()
        .should('have.attr', 'data-status', 'ENTREGUE')
        .find('[data-testid="btn-proximo-passo-troca"]')
        .should('contain', 'Receber itens');
    });
  });

  it('RF0042 e RF0044 - na lista de vendas, o botão da compra trocada inteira autoriza e recebe a troca', () => {
    cy.pedidoEntregue([{ titulo: 'At. Long. Last. A$AP', quantidade: 1 }]).then((id) => {
      solicitar({ pedidoId: id, clienteId: 1, motivo: 'Presente repetido', compraInteira: true });
      const linha = () => cy.get(`[data-testid="pedido-linha-admin"][data-pedido-id="${id}"]`);

      cy.entrarComoAdministrador('/curadoria/pedidos');
      linha()
        .should('have.attr', 'data-status', 'EM TROCA')
        .find('[data-testid="btn-proximo-passo-troca"]')
        .should('contain', 'Autorizar troca')
        .click();
      linha()
        .should('have.attr', 'data-status', 'TROCA AUTORIZADA')
        .find('[data-testid="btn-proximo-passo-troca"]')
        .should('contain', 'Receber itens')
        .click();
      cy.get('[data-testid="detalhes-troca"]').within(() => {
        cy.get('[data-testid="retorno-estoque-sim"]').click();
        cy.get('[data-testid="btn-confirmar-recebimento"]').click();
      });
      linha().should('have.attr', 'data-status', 'TROCADO');
      linha().find('button[data-testid^="btn-proximo-passo"]').should('not.exist');
    });
  });

  it('RN0046 e RNF0012 - a autorização notifica o cliente, e cada passo da troca fica no log', () => {
    cy.pedidoEntregue([{ titulo: 'Good Kid, M.A.A.D City (Deluxe Edition)', quantidade: 1 }]).then((id) => {
      itensDo(id).then((itens) => {
        solicitar({
          pedidoId: id,
          clienteId: 1,
          motivo: 'Encarte faltando',
          itens: [{ itemPedidoId: itens['Good Kid, M.A.A.D City (Deluxe Edition)'], quantidade: 1 }],
        }).then(({ body: troca }) => {
          cy.request(`${API()}/notificacoes?clienteId=1`).its('body').should('have.length', 0);
          avancar(troca.id, 'TROCA AUTORIZADA');

          cy.request(`${API()}/notificacoes?clienteId=1`)
            .its('body')
            .then((notificacoes) => {
              expect(notificacoes).to.have.length(1);
              expect(notificacoes[0]).to.include({ pedidoId: id, isLida: false });
              expect(notificacoes[0].mensagem).to.contain(`Sua troca no pedido #${id} foi autorizada`);
              cy.request('PUT', `${API()}/notificacoes/${notificacoes[0].id}/leitura`)
                .its('body.isLida')
                .should('eq', true);
            });

          avancar(troca.id, 'TROCADO', true);
          cy.request<LogApi[]>(`${API()}/dev/logs?entidade=Troca&entidadeId=${troca.id}`)
            .its('body')
            .then((logs) => {
              expect(logs.map((log) => `${log.operacao} ${log.dadosAlterados.status} ${log.usuario}`)).to.deep.eq([
                'ALTERAR TROCADO curadoria',
                'ALTERAR TROCA AUTORIZADA curadoria',
                'INSERIR EM TROCA ana.ribeiro@email.com',
              ]);
            });
        });
      });
    });
  });
});
