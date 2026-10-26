/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Gerenciar vendas eletrônicas', () => {
  it('1. Compra aprovada com um cartão', () => {
    cy.etapa('Igor tem 12 cópias em estoque');
    cy.discoPorTitulo('Igor').its('estoque').should('eq', 12);

    cy.etapa('A Ana compra Igor com o endereço Casa e o Visa final 1002: R$ 349,00 + R$ 28,00');
    cy.entrarComoCliente('/');
    cy.adicionarAoCarrinho('Igor', 1);
    cy.irParaPagamento('Casa');
    cy.conferirValor('resumo-total', 377);
    cy.marcarCartao('1002');

    cy.etapa('RF0038: finalizada, a compra fica EM PROCESSAMENTO');
    cy.finalizarPedido().then((id) => {
      cy.get('[data-testid="pedido-status"]').should('have.attr', 'data-status', 'EM PROCESSAMENTO');

      cy.etapa('RN0037: o sistema valida o pagamento (a rotina roda sozinha; aqui, sem esperar a operadora)');
      cy.validarPagamentos();

      cy.etapa('RN0038: pagamento válido, a compra fica APROVADA em Meus pedidos');
      cy.visit('/pedidos');
      cy.get(`[data-testid="pedido-linha"][data-pedido-id="${id}"]`)
        .find('[data-testid="pedido-status"]')
        .should('have.attr', 'data-status', 'APROVADA');

      cy.etapa('RF0053: só a compra aprovada dá baixa no estoque — de 12 para 11');
      cy.discoPorTitulo('Igor').its('estoque').should('eq', 11);
      cy.request(`${API()}/pedidos/${id}`).its('body.validacao.aprovado').should('eq', true);
    });
  });
});
