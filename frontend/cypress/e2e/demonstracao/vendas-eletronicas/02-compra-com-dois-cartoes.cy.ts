/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Gerenciar vendas eletrônicas', () => {
  it('2. Compra com dois ou mais cartões, incluindo a tentativa de pagar menos de R$ 10,00 em um deles (deve ser bloqueada)', () => {
    cy.etapa('A Ana tem dois cartões no perfil: Visa final 1002 e Mastercard final 5100');
    cy.cadastrarSegundoCartao();

    cy.etapa('Inclui Blonde e vai ao pagamento: R$ 459,00 + R$ 28,00 de frete');
    cy.entrarComoCliente('/');
    cy.adicionarAoCarrinho('Blonde', 1);
    cy.irParaPagamento('Casa');
    cy.conferirValor('resumo-total', 487);
    cy.marcarCartao('1002');
    cy.marcarCartao('5100');

    cy.etapa('RN0034: R$ 480,00 no Visa deixaria R$ 7,00 no Mastercard — a compra é bloqueada');
    cy.valorNoCartao('1002', '480');
    cy.get('[data-testid="pendencias-pagamento"]').should(
      'contain',
      'RN0034: cada cartão precisa receber ao menos R$ 10,00.',
    );
    cy.get('[data-testid="btn-pagar"]').should('be.disabled');

    cy.etapa('Com R$ 400,00 no Visa e R$ 87,00 no Mastercard, a compra é liberada');
    cy.valorNoCartao('1002', '400');
    cy.get('[data-testid="pendencias-pagamento"]').should('not.exist');

    cy.finalizarPedido().then((id) => {
      cy.etapa('RN0037 e RN0038: os dois cartões são aceitos pela operadora e a compra é APROVADA');
      cy.validarPagamentos();
      cy.request(`${API()}/pedidos/${id}`)
        .its('body')
        .then((pedido) => {
          expect(pedido.status.descricao).to.eq('APROVADA');
          const porCartao = Object.fromEntries(
            pedido.pagamentos.map((pago: { finalNumero: string; valor: number }) => [
              pago.finalNumero,
              pago.valor,
            ]),
          );
          expect(porCartao).to.deep.eq({ '1002': 400, '5100': 87 });
        });
    });
  });
});
