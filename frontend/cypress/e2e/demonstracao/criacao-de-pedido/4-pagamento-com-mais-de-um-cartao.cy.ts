/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Criação de pedido', () => {
  it('4. Pagamento com mais de um cartão de crédito, respeitando o valor mínimo de cada cartão', () => {
    cy.etapa('A Ana tem dois cartões no perfil: Visa final 1002 e Mastercard final 5100');
    cy.cadastrarSegundoCartao();

    cy.etapa('Inclui Channel Orange e vai ao pagamento com o endereço Casa');
    cy.entrarComoCliente('/');
    cy.adicionarAoCarrinho('Channel Orange', 1);
    cy.irParaPagamento('Casa');
    cy.conferirValor('resumo-total', 447);

    cy.etapa('RN0034: marca os dois cartões');
    cy.marcarCartao('1002');
    cy.marcarCartao('5100');

    cy.etapa('R$ 442,00 no Visa deixa R$ 5,00 no Mastercard: abaixo do mínimo de R$ 10,00');
    cy.valorNoCartao('1002', '442');
    cy.get('[data-testid="pendencias-pagamento"]').should(
      'contain',
      'RN0034: cada cartão precisa receber ao menos R$ 10,00.',
    );
    cy.get('[data-testid="btn-pagar"]').should('be.disabled');

    cy.etapa('Com R$ 347,00 no Visa, o Mastercard fica com R$ 100,00 e a compra é liberada');
    cy.valorNoCartao('1002', '347');
    cy.get('[data-testid="pendencias-pagamento"]').should('not.exist');

    cy.etapa('Finaliza a compra dividida entre os dois cartões');
    cy.finalizarPedido().then((id) => {
      cy.request(`${API()}/pedidos/${id}`)
        .its('body.pagamentos')
        .then((pagamentos: { finalNumero: string; valor: number }[]) => {
          const porCartao = Object.fromEntries(
            pagamentos.map((pagamento) => [pagamento.finalNumero, pagamento.valor]),
          );
          expect(porCartao).to.deep.eq({ '1002': 347, '5100': 100 });
        });
    });
  });
});
