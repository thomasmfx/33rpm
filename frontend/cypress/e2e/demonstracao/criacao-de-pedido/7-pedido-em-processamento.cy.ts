/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Criação de pedido', () => {
  it('7. O pedido finalizado foi registrado com status EM PROCESSAMENTO', () => {
    cy.etapa('A Ana compra Astroworld com o endereço Casa e o Visa final 1002');
    cy.entrarComoCliente('/');
    cy.adicionarAoCarrinho('Astroworld', 1);
    cy.irParaPagamento('Casa');
    cy.marcarCartao('1002');

    cy.etapa('RF0038: finaliza a compra');
    cy.finalizarPedido().then((id) => {
      cy.etapa('A confirmação mostra o pedido EM PROCESSAMENTO');
      cy.get('[data-testid="confirmacao-pedido"]').should('have.attr', 'data-pedido-id', String(id));
      cy.get('[data-testid="pedido-status"]')
        .should('have.attr', 'data-status', 'EM PROCESSAMENTO')
        .and('contain', 'Em processamento');
      cy.conferirValor('confirmacao-total', 417);

      cy.etapa('Em Meus pedidos, o mesmo status');
      cy.visit('/pedidos');
      cy.get(`[data-testid="pedido-linha"][data-pedido-id="${id}"]`)
        .find('[data-testid="pedido-status"]')
        .should('have.attr', 'data-status', 'EM PROCESSAMENTO');

      cy.etapa('E no banco, pela API');
      cy.request(`${API()}/pedidos/${id}`).its('body.status.descricao').should('eq', 'EM PROCESSAMENTO');
    });
  });
});
