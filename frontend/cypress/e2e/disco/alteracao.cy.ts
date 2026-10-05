/// <reference types="cypress" />

import type { DiscoApi } from '../../support/commands';

const API = () => Cypress.env('apiUrl');

// o cabeçalho fixo do modal cobre o campo que o Cypress rola até o topo
describe('Alteração de disco (RF0014, RN0014)', { scrollBehavior: 'center' }, () => {
  beforeEach(() => {
    // Take Care com 12 × R$ 179,90 no grupo Importado: preço R$ 377,79
    cy.cadastrarDiscoSemEstoque('Take Care').then((disco) => {
      cy.request('POST', `${API()}/estoque/entradas`, {
        discoId: disco.id,
        fornecedor: { nome: 'Import LP Distribuidora' },
        quantidade: 12,
        valorCusto: 179.9,
        dataEntrada: '2026-08-20',
      });
      cy.request<DiscoApi>(`${API()}/discos/${disco.id}`).its('body').as('disco');
    });
  });

  it('RF0014 - altera os dados cadastrais sem mudar o código', function () {
    const disco = this.disco as DiscoApi;
    cy.entrarComoAdministrador('/curadoria/inventario');
    cy.linhaDoDisco('Take Care').find('[data-testid="btn-editar-disco"]').click();
    cy.get('[data-testid="disco-numero-faixas"]').clear().type('18');
    cy.intercept('PUT', `**/api/discos/${disco.id}`).as('alterar');
    cy.get('[data-testid="btn-salvar-disco"]').click();
    cy.wait('@alterar').its('response.statusCode').should('eq', 200);

    cy.request(`${API()}/discos/${disco.id}`)
      .its('body')
      .should('include', { numeroFaixas: 18, codigo: disco.codigo, precoVenda: 377.79 });
  });

  it('RN0014 - preço abaixo da margem só com autorização do gerente de vendas', function () {
    const disco = this.disco as DiscoApi;
    cy.fixture('disco').then(({ autorizacao }) => {
      cy.entrarComoAdministrador('/curadoria/inventario');
      cy.linhaDoDisco('Take Care').find('[data-testid="btn-editar-disco"]').click();
      cy.get('[data-testid="disco-preco"]').clear().type('349,90');

      // sem a autorização o servidor recusa
      cy.intercept('PUT', `**/api/discos/${disco.id}`).as('alterar');
      cy.get('[data-testid="disco-autorizacao"]').should('be.visible').clear();
      cy.request({
        method: 'PUT',
        url: `${API()}/discos/${disco.id}`,
        failOnStatusCode: false,
        body: { ...disco, precoVenda: 349.9, autorizacaoGerente: null },
      }).then((resposta) => {
        expect(resposta.status).to.eq(400);
        expect(resposta.body.mensagens).to.include(
          'RN0014: preço abaixo da margem do grupo exige autorização do gerente de vendas.',
        );
      });

      cy.get('[data-testid="disco-autorizacao"]').type(autorizacao);
      cy.get('[data-testid="btn-salvar-disco"]').click();
      cy.wait('@alterar').its('response.statusCode').should('eq', 200);

      cy.request(`${API()}/discos/${disco.id}`)
        .its('body')
        .should('include', { precoVenda: 349.9, autorizacaoGerente: autorizacao });
    });
  });
});
