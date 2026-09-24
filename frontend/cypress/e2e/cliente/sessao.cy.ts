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
      cy.preencherCadastro(dados.novo, dados.endereco);
      cy.get('[data-testid="btn-criar-conta"]').click();

      cy.location('pathname').should('eq', '/');
      cy.contains('Renata Bittencourt').should('be.visible');

      cy.request(`${Cypress.env('apiUrl')}/clientes?email=renata.bittencourt`)
        .its('body')
        .should('have.length', 1);
    });
  });

  it('o administrador entra pelo mesmo login e cai na curadoria', () => {
    cy.visit('/login');
    cy.get('[data-testid="login-email"]').type('admin@33rpm.com.br');
    cy.get('[data-testid="login-senha"]').type('Admin@123');
    cy.get('[data-testid="btn-entrar"]').click();

    cy.location('pathname').should('eq', '/curadoria/clientes');
    cy.contains('Thomas Moisés Fernandes').should('be.visible');
    cy.get('[data-testid="btn-novo-cliente"]').should('be.visible');
  });

  it('cliente conectado não abre a curadoria', () => {
    cy.visit('/login');
    cy.get('[data-testid="login-email"]').type('ana.ribeiro@email.com');
    cy.get('[data-testid="login-senha"]').type('Senha@123');
    cy.get('[data-testid="btn-entrar"]').click();
    cy.location('pathname').should('eq', '/');

    cy.visit('/curadoria/clientes');
    cy.get('[data-testid="acesso-restrito"]')
      .should('contain', 'Esta área é só para administradores')
      .and('contain', 'conectado como cliente');
    cy.get('[data-testid="btn-novo-cliente"]').should('not.exist');
  });
});
