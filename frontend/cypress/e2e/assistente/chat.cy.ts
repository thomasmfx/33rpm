/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

interface InteracaoApi {
  id: number;
  clienteId: number;
  pergunta: string;
  sugestoes: { disco: { id: number; titulo: string } }[];
}

describe('Assistente de recomendação: chat (RNF0044)', () => {
  it('RNF0044 - sem sessão de cliente, o assistente convida a entrar', () => {
    cy.visit('/');
    cy.abrirAssistente();
    cy.get('[data-testid="chat-sem-sessao"]')
      .should('contain', 'Entre na sua conta de cliente')
      .find('a')
      .should('have.attr', 'href', '/login');
    cy.get('[data-testid="chat-mensagem"]').should('not.exist');
  });

  it('RNF0044 - a Ana pergunta pelo chat e recebe discos do acervo, gravados no servidor', () => {
    cy.entrarComoCliente('/');
    cy.abrirAssistente();
    cy.perguntarAoAssistente('Me indica uns discos de rock').within(() => {
      cy.get('[data-testid="sugestao-disco"]')
        .should('have.length.at.least', 1)
        .first()
        .should('have.attr', 'href')
        .and('match', /^\/disco\/\d+$/);
    });

    cy.request<InteracaoApi[]>(`${API()}/assistente/interacoes`).then(({ body }) => {
      expect(body).to.have.length(1);
      expect(body[0].clienteId).to.eq(1);
      expect(body[0].pergunta).to.eq('Me indica uns discos de rock');
      expect(body[0].sugestoes.length).to.be.at.least(1);
    });
  });

  it('RNF0044 - a conversa continua depois de fechar e abrir o painel', () => {
    cy.entrarComoCliente('/');
    cy.abrirAssistente();
    cy.perguntarAoAssistente('Quero algo pra ouvir na chuva');
    cy.get('button[aria-label="Fechar assistente"]').click();
    cy.abrirAssistente();
    cy.contains('p', 'Quero algo pra ouvir na chuva').should('be.visible');
    cy.get('[data-testid="resposta-assistente"]').should('have.length', 1);
  });

  it('RNF0044 - o servidor recusa mensagem vazia, longa demais e de quem não entrou', () => {
    const enviar = (corpo: object) =>
      cy.request({
        method: 'POST',
        url: `${API()}/assistente/mensagens`,
        body: corpo,
        failOnStatusCode: false,
      });

    enviar({ clienteId: 1, mensagem: '   ' }).then(({ status, body }) => {
      expect(status).to.eq(400);
      expect(body.mensagens).to.include('Escreva uma mensagem para o assistente.');
    });
    enviar({ clienteId: 1, mensagem: 'a'.repeat(501) }).then(({ status, body }) => {
      expect(status).to.eq(400);
      expect(body.mensagens).to.include('A mensagem pode ter até 500 caracteres.');
    });
    enviar({ mensagem: 'Oi' }).then(({ status, body }) => {
      expect(status).to.eq(400);
      expect(body.mensagens).to.include('Entre na sua conta para conversar com o assistente.');
    });
    // Carla é a cliente inativa da massa
    enviar({ clienteId: 3, mensagem: 'Oi' }).then(({ status, body }) => {
      expect(status).to.eq(400);
      expect(body.mensagens).to.include('Cadastro inativo. Procure a curadoria.');
    });
  });

  it('RNF0044 - o assistente é do cliente e fica fora da curadoria', () => {
    cy.entrarComoAdministrador('/curadoria/clientes');
    cy.get('[data-testid="btn-novo-cliente"]').should('be.visible');
    cy.get('button[aria-label="Abrir assistente de recomendação"]').should('not.exist');
  });
});
