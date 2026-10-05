/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Criação de pedido', () => {
  it('5. Pagamento com cartão de crédito e cupons, incluindo o caso de valor inferior a R$ 10,00 no cartão previsto na RN0035', () => {
    cy.etapa('A Ana tem dois cartões no perfil: Visa final 1002 e Mastercard final 5100');
    cy.cadastrarSegundoCartao();

    cy.etapa('Inclui The Score e vai ao pagamento: R$ 329,00 + R$ 28,00 de frete');
    cy.entrarComoCliente('/');
    cy.adicionarAoCarrinho('The Score', 1);
    cy.irParaPagamento('Casa');
    cy.conferirValor('resumo-total', 357);

    cy.etapa('RF0037: aplica o cupom de troca TROCA-AP-300 e o promocional PROMO-AP-50');
    cy.selecionarCupom('TROCA-AP-300');
    cy.selecionarCupom('PROMO-AP-50');

    cy.etapa('RN0035: os cupons entram pelo valor cheio e sobram R$ 7,00 — dividir em dois cartões é recusado');
    cy.marcarCartao('1002');
    cy.marcarCartao('5100');
    cy.get('[data-testid="pendencias-pagamento"]').should(
      'contain',
      'RN0035: com cupons, a sobra de R$ 7,00 fica em um único cartão.',
    );
    cy.get('[data-testid="btn-pagar"]').should('be.disabled');

    cy.etapa('Com um único cartão, os R$ 7,00 abaixo do mínimo são aceitos');
    cy.get('[data-testid="cartao-opcao"][data-final="5100"] [data-testid="cartao-checkbox"]').uncheck({
      force: true,
    });
    cy.get('[data-testid="pendencias-pagamento"]').should('not.exist');
    cy.get('[data-testid="btn-pagar"]').should('contain', '7,00');

    cy.etapa('Finaliza: R$ 350,00 em cupons e R$ 7,00 no Visa');
    cy.finalizarPedido().then((id) => {
      cy.request(`${API()}/pedidos/${id}`)
        .its('body')
        .then((pedido) => {
          const cupons = pedido.cupons.map((cupom: { codigo: string }) => cupom.codigo);
          expect(cupons).to.have.members(['TROCA-AP-300', 'PROMO-AP-50']);
          expect(pedido.pagamentos).to.have.length(1);
          expect(pedido.pagamentos[0]).to.include({ finalNumero: '1002', valor: 7 });
        });
    });
  });
});
