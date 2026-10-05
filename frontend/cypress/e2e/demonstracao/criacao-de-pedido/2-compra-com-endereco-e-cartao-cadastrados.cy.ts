/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Criação de pedido', () => {
  it('2. Uma compra com endereço e cartão previamente cadastrados', () => {
    cy.etapa('A Ana entra na loja e inclui OK Computer no carrinho');
    cy.entrarComoCliente('/');
    cy.adicionarAoCarrinho('OK Computer', 1);

    cy.etapa('RF0033: a compra começa pelo carrinho');
    cy.get('[data-testid="link-carrinho"]').click();
    cy.get('[data-testid="btn-finalizar-compra"]').click();

    cy.etapa('RF0035: escolhe o endereço Casa, já cadastrado no perfil');
    cy.contains('[data-testid="opcao-endereco"]', 'Casa').click();
    cy.get('[data-testid="btn-continuar-entrega"]').click();

    cy.etapa('RF0034: frete para São Paulo — Sudeste R$ 20,00 + 1 kg iniciado R$ 8,00');
    cy.conferirValor('frete-valor', 28);
    cy.get('[data-testid="btn-continuar-pagamento"]').click();
    cy.conferirValor('resumo-total', 367);

    cy.etapa('RF0036: paga com o Visa final 1002, já cadastrado no perfil');
    cy.marcarCartao('1002');

    cy.etapa('Finaliza a compra');
    cy.finalizarPedido().then((id) => {
      cy.get('[data-testid="pedido-status"]').should('have.attr', 'data-status', 'EM PROCESSAMENTO');

      cy.etapa('O pedido gravado usa o endereço e o cartão do perfil');
      cy.request(`${API()}/pedidos/${id}`)
        .its('body')
        .then((pedido) => {
          expect(pedido).to.include({ subtotal: 339, frete: 28, total: 367, enderecoId: 1 });
          expect(pedido.pagamentos[0]).to.include({ cartaoId: 1, finalNumero: '1002', valor: 367 });
        });
    });
  });
});
