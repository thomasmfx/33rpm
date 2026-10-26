/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Gerenciar vendas eletrônicas', () => {
  it('9. Troca de um item de um pedido e troca de uma compra inteira', () => {
    cy.etapa('A Ana tem duas compras entregues: Damn com AM, e Stankonia');
    cy.pedidoEntregue([
      { titulo: 'Damn', quantidade: 1 },
      { titulo: 'AM', quantidade: 1 },
    ]).then((comDoisDiscos) => {
      cy.pedidoEntregue([{ titulo: 'Stankonia', quantidade: 1 }]).then((compraInteira) => {
        const linha = (id: number) => cy.get(`[data-testid="pedido-linha"][data-pedido-id="${id}"]`);
        cy.entrarComoCliente('/pedidos');

        cy.etapa('RF0041: na compra de dois discos, pede a troca só de AM');
        linha(comDoisDiscos).within(() => {
          cy.get('button[aria-expanded]').click();
          cy.get('[data-testid="btn-solicitar-troca"]').click();
          cy.contains('label', 'AM · Arctic Monkeys').click();
          cy.get('[data-testid="troca-motivo"]').type('A capa de AM veio rasgada');
          cy.get('[data-testid="btn-enviar-troca"]').click();

          cy.etapa('RN0041: o item gera um pedido de troca EM TROCA; a compra segue ENTREGUE');
          cy.get('[data-testid="troca-pedido"]')
            .should('have.length', 1)
            .and('have.attr', 'data-status', 'EM TROCA')
            .and('contain', 'AM · 1×')
            .and('not.contain', 'Damn');
          cy.get('[data-testid="pedido-status"]').should('have.attr', 'data-status', 'ENTREGUE');
          cy.get('[data-testid="pedido-troca-andamento"]').should('be.visible');
        });

        cy.etapa('RF0041: na compra de Stankonia, pede a troca da compra inteira');
        linha(compraInteira).within(() => {
          cy.get('button[aria-expanded]').click();
          cy.get('[data-testid="btn-solicitar-troca"]').click();
          cy.get('[data-testid="troca-modo-inteira"]').check({ force: true });
          cy.get('[data-testid="troca-motivo"]').type('Desisti do disco');
          cy.get('[data-testid="btn-enviar-troca"]').click();

          cy.etapa('RN0041: trocada inteira, a própria compra passa a EM TROCA');
          cy.get('[data-testid="pedido-status"]').should('have.attr', 'data-status', 'EM TROCA');
          cy.get('[data-testid="troca-pedido"]')
            .should('have.attr', 'data-status', 'EM TROCA')
            .and('contain', 'compra inteira');
        });

        cy.etapa('No servidor, os dois pedidos de troca');
        cy.request(`${API()}/trocas?status=EM TROCA`)
          .its('body')
          .then((trocas: { pedidoId: number; compraInteira: boolean }[]) => {
            expect(trocas.map(({ pedidoId, compraInteira: inteira }) => [pedidoId, inteira])).to.deep.eq([
              [compraInteira, true],
              [comDoisDiscos, false],
            ]);
          });
      });
    });
  });
});
