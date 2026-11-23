/// <reference types="cypress" />

export {};

describe('Demonstração · Recomendação com IA generativa', () => {
  it('5. Resposta a dúvidas sobre discos feitas pelo professor', () => {
    cy.etapa('RNF0044 item 2: a Ana pergunta sobre um disco do acervo');
    cy.entrarComoCliente('/');
    cy.abrirAssistente();
    cy.perguntarAoAssistente('Quem gravou o Thriller e de que ano ele é?')
      .find('p')
      .first()
      .should('contain', 'Michael Jackson')
      .and('contain', '1982');

    cy.etapa('A conversa segue: a pergunta seguinte se apoia na anterior');
    cy.perguntarAoAssistente('E qual é o estilo dele?').find('p').first().should('not.be.empty');
  });
});
