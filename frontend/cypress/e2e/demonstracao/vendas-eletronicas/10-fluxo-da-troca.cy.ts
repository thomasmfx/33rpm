/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Gerenciar vendas eletrônicas', () => {
  it('10. Fluxo da troca: solicitação, visualização pelo administrador, autorização com notificação ao cliente, confirmação do recebimento, emissão do cupom e reentrada no estoque', () => {
    cy.etapa('A compra de Love Sick foi entregue; com a baixa, o estoque foi de 11 para 10');
    cy.pedidoEntregue([{ titulo: 'Love Sick', quantidade: 1 }]).then((id) => {
      cy.discoPorTitulo('Love Sick').its('estoque').should('eq', 10);
      const linhaDaTroca = () => cy.get(`[data-testid="troca-linha"][data-pedido-id="${id}"]`);

      cy.etapa('RF0041: a Ana pede a troca em Meus pedidos');
      cy.entrarComoCliente('/pedidos');
      cy.get(`[data-testid="pedido-linha"][data-pedido-id="${id}"]`).within(() => {
        cy.get('button[aria-expanded]').click();
        cy.get('[data-testid="btn-solicitar-troca"]').click();
        cy.contains('label', 'Love Sick').click();
        cy.get('[data-testid="troca-motivo"]').type('O disco chegou empenado');
        cy.get('[data-testid="btn-enviar-troca"]').click();
        cy.get('[data-testid="troca-pedido"]').should('have.attr', 'data-status', 'EM TROCA');
      });

      cy.etapa('RF0043: o administrador vê os pedidos de troca EM TROCA');
      cy.entrarComoAdministrador('/curadoria/pedidos');
      cy.get('[data-testid="filtro-trocas"]').click();
      linhaDaTroca()
        .should('have.attr', 'data-status', 'EM TROCA')
        .and('contain', 'Love Sick · 1×')
        .and('contain', 'Ana Paula Ribeiro');

      cy.etapa('RF0042: autoriza a troca — TROCA AUTORIZADA');
      linhaDaTroca().find('[data-testid="btn-proximo-passo-troca"]').should('contain', 'Autorizar troca').click();
      cy.get('[data-testid="alerta-curadoria-pedidos"]').should('contain', 'o cliente foi notificado');
      linhaDaTroca().should('have.attr', 'data-status', 'TROCA AUTORIZADA');

      cy.etapa('RN0046: a Ana recebe a notificação da autorização');
      cy.entrarComoCliente('/');
      cy.get('[data-testid="contador-notificacoes"]').should('have.text', '1');
      cy.get('[data-testid="btn-notificacoes"]').click();
      cy.get('[data-testid="notificacao-item"]')
        .should('have.attr', 'data-lida', 'false')
        .and('contain', `Sua troca no pedido #${id} foi autorizada`)
        // rolar até o item tiraria o sino da tela, e o menu se fecha sem a âncora
        .click({ scrollBehavior: false });
      cy.location('pathname').should('eq', '/pedidos');
      cy.get('[data-testid="contador-notificacoes"]').should('not.exist');

      cy.etapa('RF0044: os discos chegam; o administrador informa que voltam ao estoque');
      cy.entrarComoAdministrador('/curadoria/pedidos');
      cy.get('[data-testid="filtro-trocas"]').click();
      linhaDaTroca().find('[data-testid="btn-proximo-passo-troca"]').should('contain', 'Receber itens').click();
      cy.get('[data-testid="detalhes-troca"]').within(() => {
        cy.get('[data-testid="btn-confirmar-recebimento"]').should('be.disabled');
        cy.get('[data-testid="retorno-estoque-sim"]').click();
        cy.get('[data-testid="btn-confirmar-recebimento"]').click();
      });

      cy.etapa('RN0042: a troca fica TROCADO');
      linhaDaTroca().should('have.attr', 'data-status', 'TROCADO');

      cy.etapa('RF0045: o cupom de troca de R$ 349,00 é gerado para a Ana');
      cy.entrarComoCliente('/cupons');
      cy.get('[data-testid="cupom-cartao"][data-codigo="TROCA-T000001"]')
        .should('have.attr', 'data-utilizado', 'false')
        .and('contain', '349,00');

      cy.etapa('RF0054: o disco volta ao estoque — de 10 para 11');
      cy.discoPorTitulo('Love Sick').its('estoque').should('eq', 11);
      cy.request(`${API()}/pedidos/${id}`)
        .its('body.trocas.0')
        .should('include', { retornoEstoque: true });
    });
  });
});
