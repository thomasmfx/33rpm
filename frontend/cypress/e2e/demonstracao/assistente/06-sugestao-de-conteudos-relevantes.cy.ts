/// <reference types="cypress" />

export {};

describe('Demonstração · Recomendação com IA generativa', () => {
  it('6. Sugestão de conteúdos relevantes pelo chatbot', () => {
    cy.etapa('A Ana já comprou discos de soul');
    cy.compraEntregue('ana', 'Songs In The Key Of Life', 2);
    cy.compraEntregue('ana', 'Back To Black', 1);

    cy.etapa('RNF0044 item 2: ela descreve um clima e o assistente sugere discos do acervo');
    cy.entrarComoCliente('/');
    cy.abrirAssistente();
    cy.perguntarAoAssistente('Quero um vinil pra ouvir num domingo de chuva').within(() => {
      cy.get('[data-testid="sugestao-disco"]').should('have.length.at.least', 1);
    });

    cy.etapa('Cada sugestão traz o motivo; a descoberta, fora do gosto de costume, vem marcada');
    cy.get('[data-testid="resposta-assistente"]')
      .last()
      .find('[data-testid="sugestao-disco"]')
      .each((cartao) => expect(cartao.text()).to.not.be.empty);
  });
});
