/// <reference types="cypress" />

describe('Demonstração · Criação de pedido', () => {
  it('1. Inclusão de mais de um disco no carrinho e alteração da quantidade de itens', () => {
    cy.etapa('A Ana entra na loja');
    cy.entrarComoCliente('/');

    cy.etapa('RF0031 e RF0032: inclui Currents, com 1 unidade escolhida na página do disco');
    cy.adicionarAoCarrinho('Currents', 1);

    cy.etapa('Inclui Discovery, agora com 2 unidades');
    cy.adicionarAoCarrinho('Discovery', 2);
    cy.get('[data-testid="contador-carrinho"]').should('have.text', '3');

    cy.etapa('O carrinho mostra os dois discos');
    cy.get('[data-testid="link-carrinho"]').click();
    cy.get('[data-testid="item-carrinho"]').should('have.length', 2);

    cy.etapa('RF0032: aumenta Currents para 2 unidades');
    cy.itemDoCarrinho('Currents').find('[data-testid="quantidade-aumentar"]').click();
    cy.itemDoCarrinho('Currents').find('[data-testid="quantidade-valor"]').should('have.text', '2');

    cy.etapa('RF0032: diminui Discovery para 1 unidade');
    cy.itemDoCarrinho('Discovery').find('[data-testid="quantidade-diminuir"]').click();
    cy.itemDoCarrinho('Discovery').find('[data-testid="quantidade-valor"]').should('have.text', '1');

    cy.etapa('Subtotal: 2 × R$ 349,00 + 1 × R$ 409,00 = R$ 1.107,00');
    cy.conferirValor('carrinho-subtotal', 1107);
    cy.get('[data-testid="contador-carrinho"]').should('have.text', '3');
  });
});
