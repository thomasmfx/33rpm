/// <reference types="cypress" />

describe('Entrada na loja (autenticação simples)', () => {
  it('entra com e-mail e senha corretos', () => {
    cy.visit('/login');
    cy.get('[data-testid="login-email"]').type('ana.ribeiro@email.com');
    cy.get('[data-testid="login-senha"]').type('Senha@123');
    cy.get('[data-testid="btn-entrar"]').click();

    cy.location('pathname').should('eq', '/');
    cy.contains('Ana Paula Ribeiro').should('be.visible');
  });

  it('recusa senha errada sem dizer qual campo falhou', () => {
    cy.visit('/login');
    cy.get('[data-testid="login-email"]').type('ana.ribeiro@email.com');
    cy.get('[data-testid="login-senha"]').type('SenhaErrada@1');
    cy.get('[data-testid="btn-entrar"]').click();

    cy.get('[data-testid="alerta-login"]').should('contain', 'E-mail ou senha inválidos.');
  });

  it('RF0023 - cliente inativo não entra na loja', () => {
    cy.visit('/login');
    cy.get('[data-testid="login-email"]').type('carla.nogueira@email.com');
    cy.get('[data-testid="login-senha"]').type('Senha@123');
    cy.get('[data-testid="btn-entrar"]').click();

    cy.get('[data-testid="alerta-login"]').should('contain', 'Cadastro inativo');
  });

  it('RF0021 - o próprio cliente cria a conta e já entra na loja', () => {
    cy.fixture('clientes').then((dados) => {
      cy.visit('/cadastro');
      cy.preencherDados(dados.novo);
      cy.adicionarEndereco(dados.endereco);
      cy.get('[data-testid="btn-salvar-cliente"]').click();

      cy.location('pathname').should('eq', '/');
      cy.contains('Renata Bittencourt').should('be.visible');

      cy.request(`${Cypress.env('apiUrl')}/clientes?email=renata.bittencourt`)
        .its('body')
        .should('have.length', 1);
    });
  });
});
