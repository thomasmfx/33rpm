/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

/** Decisão do grupo (application.yml): a operadora simulada sempre recusa este número. */
const CARTAO_RECUSADO = {
  numero: '4000000000000002',
  nomeImpresso: 'ANA P RIBEIRO',
  codigoSeguranca: '123',
  bandeira: { desc: 'Visa' },
};

interface LogApi {
  operacao: string;
  usuario: string;
  dadosAlterados: { status?: string; movimento?: string; motivo?: string };
}

describe('Validação do pagamento (RN0037, RN0038, RF0053, RN0028)', () => {
  it('RN0037 e RF0053 - pagamento válido aprova a compra e baixa do estoque o total de itens vendidos', () => {
    cy.discoPorTitulo('Octane').then((disco) => {
      cy.comprarPelaApi([{ titulo: 'Octane', quantidade: 2 }]).then((id) => {
        cy.discoPorTitulo('Octane').its('estoque').should('eq', disco.estoque);

        cy.validarPagamentos().then((validados) => {
          expect(validados.map((pedido) => [pedido.id, pedido.status.descricao])).to.deep.eq([
            [id, 'APROVADA'],
          ]);
        });
        cy.request(`${API()}/pedidos/${id}`)
          .its('body.validacao')
          .should('include', { aprovado: true });
        cy.discoPorTitulo('Octane').its('estoque').should('eq', disco.estoque - 2);

        cy.request<LogApi[]>(`${API()}/dev/logs?entidade=Disco&entidadeId=${disco.id}`)
          .its('body.0')
          .should('deep.include', { operacao: 'ALTERAR', usuario: 'rotina-automatica' })
          .its('dadosAlterados')
          .should('include', { movimento: 'BAIXA', estoque: disco.estoque - 2 });
      });
    });
  });

  it('RN0038 e RN0028 - cartão recusado reprova a compra, sem baixa, e o cupom volta ao cliente', () => {
    cy.discoPorTitulo('Favourite Worst Nightmare').then((disco) => {
      // 269 + 28 de frete: PROMO-AP-20 e R$ 277,00 no cartão recusado
      cy.request('POST', `${API()}/pedidos`, {
        clienteId: 1,
        itens: [{ discoId: disco.id, quantidade: 1 }],
        enderecoId: 1,
        cupons: [{ id: 3 }],
        pagamentos: [{ cartaoNovo: CARTAO_RECUSADO, valor: 277 }],
      }).then(({ body: pedido }) => {
        cy.validarPagamentos();
        cy.request(`${API()}/pedidos/${pedido.id}`)
          .its('body')
          .then((reprovado) => {
            expect(reprovado.status.descricao).to.eq('REPROVADA');
            expect(reprovado.validacao).to.include({
              aprovado: false,
              motivo: 'A operadora recusou o cartão final 0002.',
            });
          });
        cy.discoPorTitulo('Favourite Worst Nightmare').its('estoque').should('eq', disco.estoque);
        cy.request(`${API()}/cupons?clienteId=1`)
          .its('body')
          .then((cupons: { codigo: string; isUtilizado: boolean }[]) => {
            expect(cupons.find((cupom) => cupom.codigo === 'PROMO-AP-20')?.isUtilizado).to.eq(false);
          });

        // RN0037: o cupom devolvido vale de novo, porque a compra reprovada não conta como uso
        cy.request('POST', `${API()}/pedidos`, {
          clienteId: 1,
          itens: [{ discoId: disco.id, quantidade: 1 }],
          enderecoId: 1,
          cupons: [{ id: 3 }],
          pagamentos: [{ cartaoId: 1, valor: 277 }],
        }).then(({ body: segunda }) => {
          cy.validarPagamentos();
          cy.request(`${API()}/pedidos/${segunda.id}`)
            .its('body.status.descricao')
            .should('eq', 'APROVADA');
        });
      });
    });
  });

  it('RN0028 e RN0044 - a compra EM PROCESSAMENTO reserva os itens, e a reprovada os desbloqueia', () => {
    cy.discoPorTitulo('África Brasil').then((disco) => {
      const todasParaOBruno = () =>
        cy.request({
          method: 'POST',
          url: `${API()}/estoque/disponibilidade`,
          body: { clienteId: 2, itens: [{ discoId: disco.id, quantidade: disco.estoque }] },
          failOnStatusCode: false,
        });

      // 269 + 28 de frete, tudo no cartão recusado
      cy.request('POST', `${API()}/pedidos`, {
        clienteId: 1,
        itens: [{ discoId: disco.id, quantidade: 1 }],
        enderecoId: 1,
        pagamentos: [{ cartaoNovo: CARTAO_RECUSADO, valor: 297 }],
      });
      todasParaOBruno().its('status').should('eq', 400);

      cy.validarPagamentos();
      todasParaOBruno().its('status').should('eq', 200);
      cy.discoPorTitulo('África Brasil').its('estoque').should('eq', disco.estoque);
    });
  });

  it('RN0036 - o cupom da diferença nasce na aprovação, não na finalização (CDU03 P8.2)', () => {
    cy.discoPorTitulo('Nevermind').then((disco) => {
      // 289 + 28 de frete = 317, pagos com TROCA-AP-300 e TROCA-AP-045: sobram R$ 28,00
      cy.request('POST', `${API()}/pedidos`, {
        clienteId: 1,
        itens: [{ discoId: disco.id, quantidade: 1 }],
        enderecoId: 1,
        cupons: [{ id: 1 }, { id: 2 }],
      }).then(({ body: pedido }) => {
        const codigo = `TROCA-P${String(pedido.id).padStart(6, '0')}`;
        expect(pedido.troco).to.eq(28);
        expect(pedido.cupomGerado, 'na finalização').to.eq(undefined);
        cy.request(`${API()}/cupons?clienteId=1`)
          .its('body')
          .then((cupons: { codigo: string }[]) => {
            expect(cupons.map((cupom) => cupom.codigo)).not.to.include(codigo);
          });

        cy.validarPagamentos();
        cy.request(`${API()}/pedidos/${pedido.id}`)
          .its('body')
          .then((aprovado) => {
            expect(aprovado.status.descricao).to.eq('APROVADA');
            expect(aprovado.cupomGerado).to.include({ codigo, valor: 28, isUtilizado: false });
          });
        cy.request<LogApi[]>(`${API()}/dev/logs?entidade=Cupom`)
          .its('body.0')
          .should('include', { operacao: 'INSERIR', usuario: 'rotina-automatica' });
      });
    });
  });

  it('RNF0012 - a validação grava log da rotina automática com o resultado', () => {
    cy.comprarPelaApi([{ titulo: 'Let God Sort Em Out', quantidade: 1 }]).then((id) => {
      cy.validarPagamentos();
      cy.request<LogApi[]>(`${API()}/dev/logs?entidade=Pedido&entidadeId=${id}`)
        .its('body.0')
        .should('deep.include', { operacao: 'ALTERAR', usuario: 'rotina-automatica' })
        .its('dadosAlterados.status')
        .should('eq', 'APROVADA');
    });
  });
});
