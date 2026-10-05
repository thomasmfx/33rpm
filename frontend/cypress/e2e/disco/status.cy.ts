/// <reference types="cypress" />

import type { DiscoApi } from '../../support/commands';

const API = () => Cypress.env('apiUrl');

function mudarStatus(disco: DiscoApi, categoria: RegExp, justificativa: string): void {
  cy.linhaDoDisco(disco.titulo)
    .find(disco.isAtivo ? '[data-testid="btn-inativar-disco"]' : '[data-testid="btn-ativar-disco"]')
    .click();
  cy.get('[data-testid="btn-confirmar-status"]').should('be.disabled');
  cy.get('[data-testid="status-categoria"]').contains('button', categoria).click();
  cy.get('[data-testid="status-justificativa"]').type(justificativa);
  cy.get('[data-testid="btn-confirmar-status"]').should('be.enabled').click();
}

// o cabeçalho fixo do modal cobre o campo que o Cypress rola até o topo
describe('Inativação e ativação de disco (RF0012, RF0013, RF0016, RN0015, RN0016, RN0017)', { scrollBehavior: 'center' }, () => {
  it('RF0012 e RN0015 - inativa com categoria e justificativa e o disco sai da loja', () => {
    cy.discoPorTitulo('Huncho Jack, Jack Huncho').then((disco) => {
      cy.entrarComoAdministrador('/curadoria/inventario');
      cy.intercept('PUT', `**/api/discos/${disco.id}/inativacao`).as('inativar');
      mudarStatus(disco, /baixa demanda/i, 'Giro baixo nos últimos meses, sem reposição prevista.');
      cy.wait('@inativar').its('response.statusCode').should('eq', 200);

      cy.request(`${API()}/discos/${disco.id}`)
        .its('body')
        .then((atual) => {
          expect(atual.isAtivo).to.eq(false);
          expect(atual.motivoStatus.categoria.desc).to.eq('BAIXA DEMANDA');
          expect(atual.motivoStatus.automatico).to.eq(false);
        });

      // RF0012: disco inativo não aparece para o cliente
      cy.entrarComoCliente(`/disco/${disco.id}`);
      cy.contains('Disco não encontrado').should('be.visible');
    });
  });

  it('RN0015 - o servidor exige categoria e justificativa para inativar', () => {
    cy.discoPorTitulo('So Much Fun').then((disco) => {
      const inativar = (motivoStatus: Record<string, unknown>) =>
        cy.request({
          method: 'PUT',
          url: `${API()}/discos/${disco.id}/inativacao`,
          failOnStatusCode: false,
          body: { motivoStatus },
        });

      inativar({ justificativa: 'Sem saída há três meses.' }).then((resposta) => {
        expect(resposta.status).to.eq(400);
        expect(resposta.body.mensagens).to.include('Informe a categoria da inativação (RN0015).');
      });
      inativar({ categoria: { desc: 'BAIXA DEMANDA' }, justificativa: 'curta' }).then((resposta) => {
        expect(resposta.status).to.eq(400);
        expect(resposta.body.mensagens).to.include(
          'A justificativa precisa ter ao menos 10 caracteres (RN0015).',
        );
      });
      cy.request(`${API()}/discos/${disco.id}`).its('body.isAtivo').should('eq', true);
    });
  });

  it('RF0016 e RN0017 - reativa com categoria e justificativa e o disco volta para a loja', () => {
    cy.discoPorTitulo('SOS').then((disco) => {
      expect(disco.isAtivo).to.eq(false);
      cy.entrarComoAdministrador('/curadoria/inventario');
      cy.intercept('PUT', `**/api/discos/${disco.id}/ativacao`).as('ativar');
      mudarStatus(disco, /reposição de estoque/i, 'Nova remessa confirmada pelo fornecedor.');
      cy.wait('@ativar').its('response.statusCode').should('eq', 200);

      cy.request(`${API()}/discos/${disco.id}`)
        .its('body')
        .then((atual) => {
          expect(atual.isAtivo).to.eq(true);
          expect(atual.motivoStatus.categoria.desc).to.eq('REPOSIÇÃO DE ESTOQUE');
        });

      cy.entrarComoCliente(`/disco/${disco.id}`);
      cy.get('[data-testid="disco-compra"]').should('be.visible');
    });
  });

  it('RN0017 - o servidor exige categoria e justificativa para ativar', () => {
    cy.discoPorTitulo('SOS').then((disco) => {
      cy.request({
        method: 'PUT',
        url: `${API()}/discos/${disco.id}/ativacao`,
        failOnStatusCode: false,
        body: { motivoStatus: { justificativa: 'Nova remessa confirmada.' } },
      }).then((resposta) => {
        expect(resposta.status).to.eq(400);
        expect(resposta.body.mensagens).to.include('Informe a categoria da ativação (RN0017).');
      });
    });
  });

  it('RF0013 e RN0016 - a inativação automática pega o disco sem estoque e sem venda, como FORA DE MERCADO', () => {
    cy.cadastrarDiscoSemEstoque('Disco Parado').then((parado) => {
      cy.entrarComoAdministrador('/curadoria/inventario');
      cy.intercept('POST', '**/api/discos/inativacao-automatica').as('rotina');
      cy.get('[data-testid="btn-inativacao-automatica"]').click();
      cy.wait('@rotina').then(({ response }) => {
        expect(response?.statusCode).to.eq(200);
        const ids = (response?.body as DiscoApi[]).map((disco) => disco.id);
        // o acervo carregado tem estoque em todos os discos ativos
        expect(ids).to.deep.eq([parado.id]);
      });
      cy.get('[data-testid="alerta-inventario"]').should('contain', 'Disco Parado');

      cy.request(`${API()}/discos/${parado.id}`)
        .its('body')
        .then((disco) => {
          expect(disco.isAtivo).to.eq(false);
          expect(disco.motivoStatus.categoria.desc).to.eq('FORA DE MERCADO');
          expect(disco.motivoStatus.automatico).to.eq(true);
        });
      cy.discoPorTitulo('Rodeo').its('isAtivo').should('eq', true);
    });
  });
});
