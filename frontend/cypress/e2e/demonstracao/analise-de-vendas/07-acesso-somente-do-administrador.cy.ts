/// <reference types="cypress" />

export {};

describe('Demonstração · Análise de vendas por categoria', () => {
  it('7. Acesso ao gráfico permitido ao administrador e negado a outros perfis', () => {
    cy.etapa('O administrador abre o Dashboard e vê o gráfico de vendas');
    cy.abrirAnalise();
    cy.get('[data-testid="grafico-vendas"]').should('be.visible');
    cy.get('[data-testid="acesso-restrito"]').should('not.exist');

    cy.etapa('A Ana, que é cliente, tenta abrir o mesmo endereço: acesso restrito');
    // a página de acesso restrito não tem o cabeçalho que entrarComoCliente espera
    cy.entrarComoCliente('/');
    cy.visit('/curadoria/dashboard');
    cy.get('[data-testid="acesso-restrito"]').should('be.visible').and('contain', 'Página indisponível');
    cy.get('[data-testid="grafico-vendas"]').should('not.exist');

    cy.etapa('Quem não entrou também não vê o gráfico');
    cy.clearLocalStorage();
    cy.visit('/curadoria/dashboard');
    cy.get('[data-testid="acesso-restrito"]').should('be.visible');
    cy.get('[data-testid="grafico-vendas"]').should('not.exist');
  });
});
