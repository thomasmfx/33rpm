/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Recomendação com IA generativa', () => {
  it('1. Demonstração da integração com a IA generativa escolhida e justificativa da escolha', () => {
    cy.request<{ descricao: string }>(`${API()}/assistente/situacao`)
      .its('body.descricao')
      .then((descricao) => {
        cy.etapa('RNF0044 item 1: a curadoria mostra a IA generativa que responde no chat');
        cy.entrarComoAdministrador('/curadoria/assistente');
        cy.get('[data-testid="modelo-em-uso"]').should('contain', descricao);

        cy.etapa('RNF0044 item 1: a Ana conversa e a resposta vem da IA, pelo backend');
        cy.intercept('POST', '**/assistente/mensagens').as('mensagem');
        cy.entrarComoCliente('/');
        cy.abrirAssistente();
        cy.perguntarAoAssistente('Oi! Como você pode me ajudar?');
        // o navegador só fala com a API da loja: a credencial do Google fica no servidor
        cy.wait('@mensagem').then(({ request, response }) => {
          expect(request.url).to.contain('/api/assistente/mensagens');
          expect(response?.body.modelo).to.contain(descricao);
        });
      });
  });
});
