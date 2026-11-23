/// <reference types="cypress" />

export {};

describe('Demonstração · Recomendação com IA generativa', () => {
  it('7. Avaliação de uma resposta como útil ou não útil, com demonstração do feedback registrado', () => {
    cy.etapa('RNF0044 item 3: a Ana avalia uma resposta como útil');
    cy.entrarComoCliente('/');
    cy.abrirAssistente();
    cy.perguntarAoAssistente('Me indica um disco de jazz').within(() => {
      cy.get('[data-testid="avaliar-util"]').click();
      cy.get('[data-testid="avaliacao-registrada"]').should('be.visible');
    });

    cy.etapa('RNF0044 item 3: e outra como não útil');
    cy.perguntarAoAssistente('Algo pra ouvir correndo').within(() => {
      cy.get('[data-testid="avaliar-nao-util"]').click();
      cy.get('[data-testid="avaliacao-registrada"]').should('be.visible');
    });

    cy.etapa('A curadoria vê o feedback registrado, com cliente, pergunta e avaliação');
    cy.entrarComoAdministrador('/curadoria/assistente');
    cy.contains('[data-testid="linha-feedback"]', 'Me indica um disco de jazz')
      .should('contain', 'Ana Paula Ribeiro')
      .find('[data-testid="avaliacao"]')
      .should('contain', 'Útil');
    cy.contains('[data-testid="linha-feedback"]', 'Algo pra ouvir correndo')
      .find('[data-testid="avaliacao"]')
      .should('contain', 'Não útil');
    cy.get('[data-testid="exemplos-feedback"]').should('have.attr', 'data-valor', '1');
    cy.get('[data-testid="feedbacks-descartados"]').should('have.attr', 'data-valor', '1');
  });
});
