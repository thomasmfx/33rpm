/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Gerenciar vendas eletrônicas', () => {
  it('8. Tentativa de solicitar a troca de um pedido que não está ENTREGUE (deve ser bloqueada)', () => {
    cy.etapa('A compra de Debí Tirar Más Fotos foi aprovada e despachada: está EM TRANSPORTE');
    cy.comprarPelaApi([{ titulo: 'Debí Tirar Más Fotos', quantidade: 1 }]).then((id) => {
      cy.validarPagamentos();
      cy.avancarPedido(id, 'EM TRANSPORTE');

      cy.etapa('Em Meus pedidos, a Ana abre a compra');
      cy.entrarComoCliente('/pedidos');
      cy.get(`[data-testid="pedido-linha"][data-pedido-id="${id}"]`).within(() => {
        cy.get('[data-testid="pedido-status"]').should('have.attr', 'data-status', 'EM TRANSPORTE');
        cy.get('button[aria-expanded]').click();

        cy.etapa('RN0043: a troca fica bloqueada até a entrega');
        cy.get('[data-testid="btn-solicitar-troca"]').should('be.disabled');
        cy.get('[data-testid="aviso-troca-bloqueada"]').should(
          'contain',
          'A troca só pode ser pedida depois da entrega (RN0043)',
        );
      });

      cy.etapa('RN0043: o servidor também recusa o pedido de troca feito direto na API');
      cy.request(`${API()}/pedidos/${id}`).then(({ body: pedido }) => {
        cy.request({
          method: 'POST',
          url: `${API()}/trocas`,
          body: {
            pedidoId: id,
            clienteId: 1,
            motivo: 'Quero trocar antes de receber',
            itens: [{ itemPedidoId: pedido.itens[0].id, quantidade: 1 }],
          },
          failOnStatusCode: false,
        }).then((resposta) => {
          expect(resposta.status).to.eq(400);
          expect(resposta.body.mensagens).to.include(
            'RN0043: só compras ENTREGUE podem ter itens trocados; esta está EM TRANSPORTE.',
          );
        });
      });
      cy.request(`${API()}/trocas?pedidoId=${id}`).its('body').should('have.length', 0);
    });
  });
});
