/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

interface LogApi {
  operacao: string;
  entidade: string;
  entidadeId: number;
  usuario: string;
  dataHora: string;
  dadosAlterados: unknown;
}

describe('Finalização da compra (RF0038, RNF0011, RNF0012)', () => {
  it('RF0038 - o pedido finalizado fica EM PROCESSAMENTO na confirmação, em Meus pedidos e no banco', () => {
    cy.entrarComoCliente('/');
    cy.adicionarAoCarrinho('Songs In The Key Of Life', 1);
    cy.irParaPagamento('Casa');
    cy.marcarCartao('1002');

    cy.finalizarPedido().then((id) => {
      cy.get('[data-testid="confirmacao-pedido"]').should('have.attr', 'data-pedido-id', String(id));
      cy.get('[data-testid="pedido-status"]')
        .should('have.attr', 'data-status', 'EM PROCESSAMENTO')
        .and('contain', 'Em processamento');
      cy.conferirValor('confirmacao-total', 407);

      cy.visit('/pedidos');
      cy.get(`[data-testid="pedido-linha"][data-pedido-id="${id}"]`)
        .find('[data-testid="pedido-status"]')
        .should('have.attr', 'data-status', 'EM PROCESSAMENTO');

      cy.request(`${API()}/pedidos/${id}`).its('body.status.descricao').should('eq', 'EM PROCESSAMENTO');
    });
  });

  it('RNF0012 - a compra grava log com data, hora, usuário responsável e dados', () => {
    cy.discoPorTitulo('Are You Experienced').then((disco) => {
      // TROCA-AP-300 + PROMO-AP-20 passam dos R$ 317,00: usa dois cupons e gera um de troca
      cy.request('POST', `${API()}/pedidos`, {
        clienteId: 1,
        itens: [{ discoId: disco.id, quantidade: 1 }],
        enderecoId: 1,
        cupons: [{ id: 1 }, { id: 3 }],
      }).then(({ body: pedido }) => {
        cy.request<LogApi[]>(`${API()}/dev/logs?entidade=Pedido&entidadeId=${pedido.id}`)
          .its('body')
          .then((logs) => {
            expect(logs).to.have.length(1);
            expect(logs[0]).to.include({ operacao: 'INSERIR', usuario: 'ana.ribeiro@email.com' });
            expect(Number.isNaN(Date.parse(logs[0].dataHora)), 'data e hora').to.eq(false);
            expect(JSON.stringify(logs[0].dadosAlterados)).to.contain('317');
          });

        cy.request<LogApi[]>(`${API()}/dev/logs?entidade=Cupom`)
          .its('body')
          .then((logs) => {
            // os dois cupons consumidos pela cliente; o de troca só nasce na aprovação
            expect(logs.map((log) => `${log.operacao} ${log.usuario}`)).to.deep.eq([
              'ALTERAR ana.ribeiro@email.com',
              'ALTERAR ana.ribeiro@email.com',
            ]);
          });

        // RN0036 (CDU03 P8.2): a rotina que aprova emite o cupom da diferença e registra
        cy.validarPagamentos();
        cy.request<LogApi[]>(`${API()}/dev/logs?entidade=Cupom`)
          .its('body.0')
          .should('include', { operacao: 'INSERIR', usuario: 'rotina-automatica' });
      });
    });
  });

  it('RNF0011 - as consultas do fluxo de compra respondem em até 1 segundo', () => {
    cy.discoPorTitulo('Mezzanine').then((disco) => {
      const corpo = {
        clienteId: 1,
        itens: [{ discoId: disco.id, quantidade: 1 }],
        enderecoId: 1,
        pagamentos: [{ cartaoId: 1, valor: 417 }],
      };
      const consultas = [
        '/discos',
        `/discos/${disco.id}`,
        '/clientes/1',
        '/cupons?clienteId=1',
        '/pedidos?clienteId=1',
        '/dominios',
      ];
      consultas.forEach((caminho) => {
        cy.request(`${API()}${caminho}`).its('duration').should('be.lessThan', 1000);
      });
      cy.request('POST', `${API()}/estoque/disponibilidade`, {
        itens: [{ discoId: disco.id, quantidade: 1 }],
      })
        .its('duration')
        .should('be.lessThan', 1000);
      cy.request('POST', `${API()}/pedidos/cotacao`, corpo).its('duration').should('be.lessThan', 1000);

      cy.request('POST', `${API()}/pedidos`, corpo).then(({ body: pedido }) => {
        cy.request(`${API()}/pedidos/${pedido.id}`).its('duration').should('be.lessThan', 1000);
      });
    });
  });
});
