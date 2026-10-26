/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

/** Decisão do grupo (application.yml): a operadora simulada sempre recusa este número. */
const CARTAO_RECUSADO = {
  numero: '4000 0000 0000 0002',
  nomeImpresso: 'ANA P RIBEIRO',
  bandeira: 'Visa',
  cvv: '123',
};

describe('Demonstração · Gerenciar vendas eletrônicas', () => {
  it('5. Compra REPROVADA, com itens desbloqueados e sem baixa de estoque', () => {
    cy.discoPorTitulo('Whole Lotta Red').then((disco) => {
      cy.etapa('Whole Lotta Red tem 9 cópias em estoque');
      expect(disco.estoque).to.eq(9);

      cy.etapa('A Ana compra uma com o PROMO-AP-20 e um cartão novo, o 4000 0000 0000 0002');
      cy.entrarComoCliente('/');
      cy.adicionarAoCarrinho('Whole Lotta Red', 1);
      cy.irParaPagamento('Casa');
      cy.conferirValor('resumo-total', 457);
      cy.selecionarCupom('PROMO-AP-20');
      cy.get('[data-testid="btn-adicionar-cartao-checkout"]').click();
      cy.preencherCartao(CARTAO_RECUSADO);
      cy.get('[data-testid="btn-salvar-cartao"]').click();

      cy.finalizarPedido().then((id) => {
        cy.etapa('RN0044 e RN0028: EM PROCESSAMENTO, a unidade fica bloqueada — só 8 estão livres');
        cy.request({
          method: 'POST',
          url: `${API()}/estoque/disponibilidade`,
          body: { clienteId: 2, itens: [{ discoId: disco.id, quantidade: 9 }] },
          failOnStatusCode: false,
        })
          .its('body.mensagens')
          .should('include', 'RN0044: só há 8 unidade(s) livre(s) de Whole Lotta Red; as demais estão reservadas em outras compras.');

        cy.etapa('RN0037: a operadora recusa o cartão final 0002');
        cy.validarPagamentos();

        cy.etapa('RN0038: a compra fica REPROVADA, com o motivo em Meus pedidos');
        cy.visit('/pedidos');
        cy.get(`[data-testid="pedido-linha"][data-pedido-id="${id}"]`).within(() => {
          cy.get('[data-testid="pedido-status"]').should('have.attr', 'data-status', 'REPROVADA');
          cy.get('button[aria-expanded]').click();
          cy.get('[data-testid="motivo-reprovacao"]').should(
            'contain',
            'A operadora recusou o cartão final 0002.',
          );
        });

        cy.etapa('RN0028: sem baixa — o estoque continua 9 — e as 9 cópias estão livres de novo');
        cy.discoPorTitulo('Whole Lotta Red').its('estoque').should('eq', 9);
        cy.request('POST', `${API()}/estoque/disponibilidade`, {
          clienteId: 2,
          itens: [{ discoId: disco.id, quantidade: 9 }],
        })
          .its('status')
          .should('eq', 200);

        cy.etapa('A compra não aconteceu: o PROMO-AP-20 volta para a Ana');
        cy.visit('/cupons');
        cy.get('[data-testid="cupom-cartao"][data-codigo="PROMO-AP-20"]').should(
          'have.attr',
          'data-utilizado',
          'false',
        );
      });
    });
  });
});
