/// <reference types="cypress" />

export {};

describe('Demonstração · Recomendação com IA generativa', () => {
  it('4. Ajuda na busca por discos pelo chat', () => {
    cy.etapa('RNF0044 item 2: a Ana procura discos de um artista pelo chat');
    cy.entrarComoCliente('/');
    cy.abrirAssistente();
    cy.perguntarAoAssistente('Vocês têm discos do Kendrick Lamar?').within(() => {
      cy.get('[data-testid="sugestao-disco"]')
        .should('have.length.at.least', 1)
        .first()
        .should('contain', 'Kendrick Lamar');
    });

    cy.etapa('O card leva à página do disco, de onde ela pode comprar');
    cy.get('[data-testid="resposta-assistente"]')
      .last()
      .find('[data-testid="sugestao-disco"]')
      .first()
      .click();
    cy.location('pathname').should('match', /^\/disco\/\d+$/);
  });
});
