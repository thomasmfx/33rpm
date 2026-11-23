/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

interface InteracaoApi {
  id: number;
  isUtil?: boolean;
  dataAvaliacao?: string;
}

interface LogApi {
  operacao: string;
  usuario: string;
  dadosAlterados: { isUtil?: boolean };
}

function interacao(id: number) {
  return cy
    .request<InteracaoApi[]>(`${API()}/assistente/interacoes`)
    .its('body')
    .then((lista) => lista.find((item) => item.id === id) as InteracaoApi);
}

describe('Assistente de recomendação: feedback das respostas (RNF0044 item 3)', () => {
  it('RNF0044 - a Ana avalia a resposta como útil e o feedback é gravado com log', () => {
    cy.entrarComoCliente('/');
    cy.abrirAssistente();
    cy.perguntarAoAssistente('Me recomenda uns discos').within(() => {
      cy.contains('Esta resposta ajudou?').should('be.visible');
      cy.get('[data-testid="avaliar-util"]').click();
      cy.get('[data-testid="avaliacao-registrada"]').should('be.visible');
      cy.get('[data-testid="avaliar-util"]').should('have.attr', 'aria-pressed', 'true');
    });

    cy.request<{ id: number }[]>(`${API()}/assistente/interacoes`).then(({ body }) => {
      const id = body[0].id;
      interacao(id).then((gravada) => {
        expect(gravada.isUtil).to.eq(true);
        expect(gravada.dataAvaliacao).to.be.a('string');
      });
      // RNF0012: a avaliação é uma escrita do cliente, com o e-mail dele no log
      cy.request<LogApi[]>(`${API()}/dev/logs?entidade=InteracaoAssistente&entidadeId=${id}`)
        .its('body')
        .then((logs) => {
          const alteracao = logs.find((log) => log.operacao === 'ALTERAR');
          expect(alteracao?.usuario).to.eq('ana.ribeiro@email.com');
          expect(alteracao?.dadosAlterados.isUtil).to.eq(true);
        });
    });
  });

  it('RNF0044 - o cliente muda de ideia e marca a mesma resposta como não útil', () => {
    cy.intercept('PUT', '**/assistente/interacoes/*/avaliacao').as('avaliar');
    cy.entrarComoCliente('/');
    cy.abrirAssistente();
    cy.perguntarAoAssistente('Algo parecido com Currents').within(() => {
      cy.get('[data-testid="avaliar-util"]').click();
      cy.get('[data-testid="avaliacao-registrada"]').should('be.visible');
      cy.get('[data-testid="avaliar-nao-util"]').click();
      cy.get('[data-testid="avaliar-nao-util"]').should('have.attr', 'aria-pressed', 'true');
      cy.get('[data-testid="avaliar-util"]').should('have.attr', 'aria-pressed', 'false');
    });
    // o botão muda antes de a avaliação chegar ao servidor
    cy.wait(['@avaliar', '@avaliar']);
    cy.request<InteracaoApi[]>(`${API()}/assistente/interacoes`)
      .its('body.0.isUtil')
      .should('eq', false);
  });

  it('RNF0044 - avaliação sem útil nem não útil é recusada', () => {
    cy.conversarPelaApi(1, 'Oi').then((id) => {
      cy.request({
        method: 'PUT',
        url: `${API()}/assistente/interacoes/${id}/avaliacao`,
        body: {},
        failOnStatusCode: false,
      }).then(({ status, body }) => {
        expect(status).to.eq(400);
        expect(body.mensagens).to.include('Avalie a resposta como útil ou não útil.');
      });
    });
  });

  it('RNF0044 - a curadoria acompanha o feedback, filtrado pela avaliação', () => {
    cy.conversarPelaApi(1, 'Quero algo calmo pra estudar').then((id) => cy.avaliarPelaApi(id, false));
    cy.conversarPelaApi(1, 'Me indica rap brasileiro').then((id) => cy.avaliarPelaApi(id, true));
    cy.conversarPelaApi(1, 'Tem algo do Pink Floyd?');

    cy.entrarComoAdministrador('/curadoria/assistente');
    cy.get('[data-testid="linha-feedback"]').should('have.length', 3);

    cy.get('[data-testid="filtro-avaliacao"]').contains('Não úteis').click();
    cy.get('[data-testid="linha-feedback"]')
      .should('have.length', 1)
      .and('contain', 'Quero algo calmo pra estudar')
      .and('contain', 'Ana Paula Ribeiro')
      .find('[data-testid="avaliacao"]')
      .should('contain', 'Não útil');

    cy.get('[data-testid="filtro-avaliacao"]').contains('Sem avaliação').click();
    cy.get('[data-testid="linha-feedback"]')
      .should('have.length', 1)
      .and('contain', 'Tem algo do Pink Floyd?');
  });
});
