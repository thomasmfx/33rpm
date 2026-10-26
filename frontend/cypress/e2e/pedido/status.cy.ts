/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Status da compra pelo administrador (RF0039, RF0040, RN0039, RN0040)', () => {
  const avancar = (id: number, status: string) =>
    cy.request({
      method: 'PUT',
      url: `${API()}/pedidos/${id}/status`,
      body: { status: { descricao: status } },
      failOnStatusCode: false,
    });

  it('RN0039 e RN0040 - o administrador só despacha a compra aprovada e só entrega a que está em transporte', () => {
    cy.comprarPelaApi([{ titulo: 'Hardstone Psycho', quantidade: 1 }]).then((id) => {
      avancar(id, 'EM TRANSPORTE')
        .its('body.mensagens')
        .should('deep.eq', [
          'RN0039: só compras APROVADA seguem para EM TRANSPORTE; esta está EM PROCESSAMENTO.',
        ]);

      cy.validarPagamentos();
      avancar(id, 'ENTREGUE')
        .its('body.mensagens')
        .should('deep.eq', ['RN0040: só compras EM TRANSPORTE podem ser entregues; esta está APROVADA.']);
      avancar(id, 'TROCADO').its('status').should('eq', 400);

      avancar(id, 'EM TRANSPORTE').its('body.status.descricao').should('eq', 'EM TRANSPORTE');
      avancar(id, 'ENTREGUE').its('body.status.descricao').should('eq', 'ENTREGUE');
      avancar(id, 'EM TRANSPORTE').its('status').should('eq', 400);
    });
  });

  it('RF0039 - a curadoria só oferece o despacho depois de o pagamento ser aprovado', () => {
    cy.comprarPelaApi([{ titulo: 'Un Verano Sin Ti', quantidade: 1 }]).then((id) => {
      cy.entrarComoAdministrador('/curadoria/pedidos');
      cy.get('[data-testid="filtro-processamento"]').click();
      cy.get(`[data-testid="pedido-linha-admin"][data-pedido-id="${id}"]`)
        .should('contain', 'Aguardando operadora')
        .find('[data-testid="btn-proximo-passo"]')
        .should('not.exist');

      cy.get('[data-testid="btn-validar-pagamentos"]').click();
      cy.get('[data-testid="filtro-aprovadas"]').click();
      cy.get(`[data-testid="pedido-linha-admin"][data-pedido-id="${id}"]`)
        .find('[data-testid="btn-proximo-passo"]')
        .should('contain', 'Despachar');
    });
  });

  it('RNF0011 - as consultas do pós-venda respondem em até 1 segundo', () => {
    cy.comprarPelaApi([{ titulo: 'Late Registration', quantidade: 1 }]).then(() => {
      ['/pedidos', '/trocas', '/notificacoes?clienteId=1', '/carrinhos/1'].forEach((caminho) => {
        cy.request(`${API()}${caminho}`).its('duration').should('be.lessThan', 1000);
      });
    });
  });
});
