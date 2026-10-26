/// <reference types="cypress" />

import { BRUNO } from '../../../support/commands';

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Gerenciar vendas eletrônicas', () => {
  it('3. Compra com cupom promocional e cartão, com menos de R$ 10,00 no cartão (permitido)', () => {
    cy.etapa('O Bruno entra e inclui Ride The Lightning: R$ 259,00 + R$ 28,00 de frete para o Rio');
    cy.entrarComoCliente('/', BRUNO);
    cy.adicionarAoCarrinho('Ride The Lightning', 1);
    cy.irParaPagamento('Apartamento');
    cy.conferirValor('resumo-total', 287);

    cy.etapa('RF0037: aplica o cupom promocional PROMO-BT-280 — restam R$ 7,00');
    cy.selecionarCupom('PROMO-BT-280');
    cy.conferirValor('resumo-total', 7);

    cy.etapa('RF0036: sem cartão no perfil, cadastra um só para esta compra');
    cy.get('[data-testid="btn-adicionar-cartao-checkout"]').click();
    cy.preencherCartao({
      numero: '4111 1111 1111 1111',
      nomeImpresso: 'BRUNO TAVARES',
      bandeira: 'Visa',
      cvv: '321',
    });
    cy.get('[data-testid="btn-salvar-cartao"]').click();

    cy.etapa('RN0035: com cupom, os R$ 7,00 abaixo do mínimo vão inteiros para um cartão');
    cy.get('[data-testid="pendencias-pagamento"]').should('not.exist');
    cy.get('[data-testid="btn-pagar"]').should('contain', '7,00');

    cy.finalizarPedido().then((id) => {
      cy.etapa('RN0037: o cupom é verdadeiro e o cartão é aceito — APROVADA');
      cy.validarPagamentos();
      cy.request(`${API()}/pedidos/${id}`)
        .its('body')
        .then((pedido) => {
          expect(pedido.status.descricao).to.eq('APROVADA');
          expect(pedido.cupons.map((cupom: { codigo: string }) => cupom.codigo)).to.deep.eq([
            'PROMO-BT-280',
          ]);
          expect(pedido.pagamentos).to.have.length(1);
          expect(pedido.pagamentos[0]).to.include({ finalNumero: '1111', valor: 7 });
        });
    });
  });
});
