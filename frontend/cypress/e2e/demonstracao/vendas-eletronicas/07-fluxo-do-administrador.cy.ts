/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Gerenciar vendas eletrônicas', () => {
  it('7. Fluxo do administrador: APROVADA, EM TRANSPORTE, ENTREGUE', () => {
    cy.etapa('A Ana já finalizou a compra de Utopia, que está EM PROCESSAMENTO');
    cy.comprarPelaApi([{ titulo: 'Utopia', quantidade: 1 }]).then((id) => {
      const linha = () => cy.get(`[data-testid="pedido-linha-admin"][data-pedido-id="${id}"]`);

      cy.etapa('O administrador consulta os pedidos na curadoria');
      cy.entrarComoAdministrador('/curadoria/pedidos');
      cy.get('[data-testid="busca-pedidos"]').type(String(id));
      linha()
        .should('have.attr', 'data-status', 'EM PROCESSAMENTO')
        .and('contain', 'Aguardando operadora');

      cy.etapa('RN0037 e RN0038: a validação do pagamento deixa a compra APROVADA');
      cy.get('[data-testid="btn-validar-pagamentos"]').click();
      cy.get('[data-testid="alerta-curadoria-pedidos"]').should('contain', '1 aprovado(s)');
      linha().should('have.attr', 'data-status', 'APROVADA');

      cy.etapa('RF0039 e RN0039: seleciona a venda aprovada para despacho — EM TRANSPORTE');
      linha().find('[data-testid="btn-proximo-passo"]').should('contain', 'Despachar').click();
      linha().should('have.attr', 'data-status', 'EM TRANSPORTE');

      cy.etapa('RF0040 e RN0040: confirma a entrega — ENTREGUE');
      linha()
        .find('[data-testid="btn-proximo-passo"]')
        .should('contain', 'Confirmar entrega')
        .click();
      linha().should('have.attr', 'data-status', 'ENTREGUE');
      linha().find('[data-testid="btn-proximo-passo"]').should('not.exist');

      cy.etapa('A Ana vê a compra ENTREGUE em Meus pedidos');
      cy.entrarComoCliente('/pedidos');
      cy.get(`[data-testid="pedido-linha"][data-pedido-id="${id}"]`)
        .find('[data-testid="pedido-status"]')
        .should('have.attr', 'data-status', 'ENTREGUE');

      cy.etapa('RNF0012: cada passo ficou no log, com o usuário responsável');
      cy.request(`${API()}/dev/logs?entidade=Pedido&entidadeId=${id}`)
        .its('body')
        .then((logs: { operacao: string; usuario: string; dadosAlterados: { status: string } }[]) => {
          const passos = logs.map((log) => `${log.dadosAlterados.status} · ${log.usuario}`);
          expect(passos).to.deep.eq([
            'ENTREGUE · curadoria',
            'EM TRANSPORTE · curadoria',
            'APROVADA · rotina-automatica',
            'EM PROCESSAMENTO · ana.ribeiro@email.com',
          ]);
        });
    });
  });
});
