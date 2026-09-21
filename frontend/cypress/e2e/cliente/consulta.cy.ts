/// <reference types="cypress" />

describe('Consulta de clientes (RF0024)', () => {
  beforeEach(() => {
    cy.abrirCuradoriaClientes();
  });

  it('RF0024 - lista todos os clientes quando não há filtro', () => {
    cy.get('[data-testid="cliente-linha"]').should('have.length', 3);
  });

  it('RF0024 - filtra por nome, ignorando acento e caixa', () => {
    cy.get('[data-testid="filtro-nome"]').type('NOGUEIRA');
    cy.get('[data-testid="cliente-linha"]').should('have.length', 1);
    cy.get('[data-testid="cliente-nome"]').should('contain', 'Carla Nogueira');
  });

  it('RF0024 - filtra por e-mail', () => {
    cy.get('[data-testid="btn-filtros"]').click();
    cy.get('[data-testid="filtro-email"]').type('bruno.tavares');
    cy.get('[data-testid="cliente-linha"]').should('have.length', 1);
    cy.get('[data-testid="cliente-email"]').should('contain', 'bruno.tavares@email.com');
  });

  it('RF0024 - filtra por CPF mesmo com máscara', () => {
    cy.get('[data-testid="btn-filtros"]').click();
    cy.get('[data-testid="filtro-cpf"]').type('123.456.789-01');
    cy.get('[data-testid="cliente-linha"]').should('have.length', 1);
    cy.get('[data-testid="cliente-nome"]').should('contain', 'Ana Paula Ribeiro');
  });

  it('RF0024 - filtra por telefone', () => {
    cy.get('[data-testid="btn-filtros"]').click();
    cy.get('[data-testid="filtro-telefone"]').type('3256');
    cy.get('[data-testid="cliente-linha"]').should('have.length', 1);
    cy.get('[data-testid="cliente-nome"]').should('contain', 'Bruno Tavares');
  });

  it('RF0024 e RNF0035 - filtra pelo código do cliente', () => {
    cy.get('[data-testid="btn-filtros"]').click();
    cy.get('[data-testid="filtro-codigo"]').type('CLI-000003');
    cy.get('[data-testid="cliente-linha"]').should('have.length', 1);
    cy.get('[data-testid="cliente-nome"]').should('contain', 'Carla Nogueira');
  });

  it('RF0024 - filtra por status, separando ativos de inativos', () => {
    cy.get('[data-testid="btn-filtros"]').click();
    cy.get('[data-testid="filtro-status"]').contains('Inativos').click();
    cy.get('[data-testid="cliente-linha"]').should('have.length', 1);
    cy.get('[data-testid="cliente-nome"]').should('contain', 'Carla Nogueira');

    cy.get('[data-testid="filtro-status"]').contains('Ativos').click();
    cy.get('[data-testid="cliente-linha"]').should('have.length', 2);
  });

  it('RF0024 e RN0027 - filtra por ranking mínimo', () => {
    cy.get('[data-testid="btn-filtros"]').click();
    cy.get('[data-testid="filtro-ranking"]').find('input[value="4"]').then(($entrada) => {
      cy.get(`label[for="${$entrada.attr('id')}"]`).click();
    });
    cy.get('[data-testid="cliente-linha"]').should('have.length', 1);
    cy.get('[data-testid="cliente-nome"]').should('contain', 'Ana Paula Ribeiro');
  });

  it('RF0024 - combina filtros: nome, status e ranking mínimo ao mesmo tempo', () => {
    cy.get('[data-testid="filtro-nome"]').type('a');
    cy.get('[data-testid="cliente-linha"]').should('have.length', 3);

    cy.get('[data-testid="btn-filtros"]').click();
    cy.get('[data-testid="filtro-status"]').contains('Ativos').click();
    cy.get('[data-testid="cliente-linha"]').should('have.length', 2);

    cy.get('[data-testid="filtro-ranking"]').find('input[value="4"]').then(($entrada) => {
      cy.get(`label[for="${$entrada.attr('id')}"]`).click();
    });
    cy.get('[data-testid="cliente-linha"]').should('have.length', 1);
    cy.get('[data-testid="cliente-nome"]').should('contain', 'Ana Paula Ribeiro');

    cy.get('[data-testid="btn-limpar-filtros"]').click();
    cy.get('[data-testid="cliente-linha"]').should('have.length', 3);
  });

  it('RF0024 - filtro sem correspondência mostra a lista vazia', () => {
    cy.get('[data-testid="filtro-nome"]').type('cliente inexistente');
    cy.get('[data-testid="lista-vazia"]').should('be.visible');
  });
});
