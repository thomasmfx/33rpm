/// <reference types="cypress" />
import { HISTORICO_ANA, HISTORICO_BRUNO } from '../../support/assistente';

export {};

const API = () => Cypress.env('apiUrl');

interface ExemploDeTreino {
  systemInstruction: { parts: { text: string }[] };
  contents: { role: 'user' | 'model'; parts: { text: string }[] }[];
}

function linhas(jsonl: string): ExemploDeTreino[] {
  return jsonl
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((linha) => JSON.parse(linha) as ExemploDeTreino);
}

describe('Assistente de recomendação: ajuste fino com vendas e feedback (RNF0044 item 3)', () => {
  // treinar com o Vertex AI configurado criaria jobs reais, com custo e sem conclusão na hora
  before(function () {
    cy.modoSimulado().then((simulado) => {
      if (!simulado) this.skip();
    });
  });

  beforeEach(() => {
    cy.concluirTreinos();
  });

  it('RNF0044 - cada compra a partir da segunda vira exemplo, com as compras seguintes como resposta', () => {
    cy.historicosDoAssistente();

    cy.request(`${API()}/assistente/situacao`)
      .its('body')
      .should('include', {
        exemplosVendas: 10,
        exemplosAcervo: 10,
        exemplosFeedback: 0,
        feedbacksDescartados: 0,
      });

    cy.discoPorTitulo('The Score').then((theScore) =>
      cy.discoPorTitulo('Late Registration').then((lateRegistration) =>
        cy.discoPorTitulo('Damn').then((damn) => {
          cy.request(`${API()}/assistente/dataset`)
            .its('body')
            .then((jsonl: string) => {
              const exemplos = linhas(jsonl);
              // por compra a partir da segunda, um exemplo de venda e um do acervo
              expect(exemplos).to.have.length(
                (HISTORICO_ANA.length - 1 + HISTORICO_BRUNO.length - 1) * 2,
              );

              // o primeiro exemplo da Ana: só o Illmatic no perfil, e a resposta são as três
              // compras seguintes
              const primeiro = exemplos.find((exemplo) => {
                const instrucao = exemplo.systemInstruction.parts[0].text;
                const perfil = instrucao.slice(instrucao.lastIndexOf('PERFIL DO CLIENTE'));
                return perfil.includes('Nome: Ana') && (perfil.match(/^- /gm) ?? []).length === 1;
              }) as ExemploDeTreino;
              expect(primeiro.systemInstruction.parts[0].text).to.contain('| Illmatic | Nas |');
              expect(primeiro.contents[0].role).to.eq('user');
              expect(primeiro.contents[1].role).to.eq('model');
              const resposta = JSON.parse(primeiro.contents[1].parts[0].text);
              expect(resposta.texto).to.contain('Ana');
              expect(resposta.sugestoes.map((s: { discoId: number }) => s.discoId)).to.have.members(
                [theScore.id, lateRegistration.id, damn.id],
              );
            });
        }),
      ),
    );
  });

  it('RNF0044 - cada venda leva um exemplo de dúvida, busca ou fora do tema, respondido com o acervo do exemplo', () => {
    cy.historicosDoAssistente();

    cy.request(`${API()}/assistente/dataset`)
      .its('body')
      .then((jsonl: string) => {
        const respostas = linhas(jsonl).map((exemplo) => {
          const instrucao = exemplo.systemInstruction.parts[0].text;
          const acervo = [...instrucao.slice(instrucao.indexOf('ACERVO')).matchAll(/^(\d+) \| /gm)]
            .map((achado) => Number(achado[1]));
          const resposta = JSON.parse(exemplo.contents[1].parts[0].text) as {
            texto: string;
            sugestoes: { discoId: number }[];
          };
          return { acervo, resposta };
        });

        // a IA só pode sugerir o que está no acervo que ela recebeu
        respostas.forEach(({ acervo, resposta }) => {
          expect(resposta.texto).to.not.equal('');
          resposta.sugestoes.forEach(({ discoId }) => expect(acervo).to.include(discoId));
        });
        // dúvidas e perguntas fora do tema não trazem disco
        expect(respostas.filter(({ resposta }) => resposta.sugestoes.length === 0))
          .to.have.length.greaterThan(0);
      });
  });

  it('RNF0044 - o feedback útil entra no treino e o não útil fica fora', () => {
    cy.historicosDoAssistente();
    cy.conversarPelaApi(1, 'Me recomenda uns discos').then((id) => cy.avaliarPelaApi(id, true));
    cy.conversarPelaApi(2, 'Quero algo calmo pra estudar').then((id) => cy.avaliarPelaApi(id, false));
    cy.conversarPelaApi(2, 'Tem algo do Pink Floyd?');

    cy.request(`${API()}/assistente/situacao`)
      .its('body')
      .should('include', { exemplosVendas: 10, exemplosFeedback: 1, feedbacksDescartados: 1 });
    cy.request(`${API()}/assistente/dataset`)
      .its('body')
      .then((jsonl: string) => {
        const perguntas = linhas(jsonl).map((exemplo) => exemplo.contents[0].parts[0].text);
        expect(perguntas).to.have.length(21);
        expect(perguntas).to.include('Me recomenda uns discos');
        expect(perguntas).to.not.include('Quero algo calmo pra estudar');
        expect(perguntas).to.not.include('Tem algo do Pink Floyd?');
      });
  });

  it('RNF0044 - a curadoria treina o modelo e o chat passa a responder com o modelo ajustado', () => {
    cy.historicosDoAssistente();
    cy.conversarPelaApi(1, 'Me recomenda uns discos').then((id) => cy.avaliarPelaApi(id, true));

    cy.entrarComoAdministrador('/curadoria/assistente');
    cy.get('[data-testid="exemplos-vendas"]').should('have.attr', 'data-valor', '10');
    cy.get('[data-testid="exemplos-acervo"]').should('have.attr', 'data-valor', '10');
    cy.get('[data-testid="exemplos-feedback"]').should('have.attr', 'data-valor', '1');

    cy.get('[data-testid="btn-treinar"]').click();
    cy.get('[data-testid="aviso-treino"]').should('contain', 'enviado com 21 exemplos');
    cy.get('[data-testid="linha-treino"]')
      .first()
      .should('have.attr', 'data-status', 'EM TREINAMENTO')
      .and('contain', '10 de vendas')
      .and('contain', '10 do acervo')
      .and('contain', '1 de feedback');
    cy.get('[data-testid="btn-treinar"]').should('be.disabled');
    cy.get('[data-testid="treino-em-andamento"]')
      .should('contain', 'em andamento')
      .find('[role="progressbar"]')
      .should('exist');

    cy.get('[data-testid="btn-atualizar-treinos"]').click();
    cy.get('[data-testid="linha-treino"]').first().should('have.attr', 'data-status', 'CONCLUIDO');
    cy.get('[data-testid="treino-em-andamento"]').should('not.exist');
    cy.get('[data-testid="aviso-treino"]').should('contain', 'concluído');
    cy.get('[data-testid="modelo-em-uso"]').should('contain', 'Ajustado no treino');
    cy.get('[data-testid="exemplos-novos"]').should('have.attr', 'data-valor', '0');

    cy.request<{ id: number }[]>(`${API()}/assistente/treinamentos`).then(({ body }) => {
      cy.request(`${API()}/assistente/treinamentos/${body[0].id}/dataset`).then((resposta) => {
        expect(resposta.headers['content-disposition']).to.contain('.jsonl');
        expect(linhas(resposta.body as string)).to.have.length(21);
      });

      cy.intercept('POST', '**/assistente/mensagens').as('mensagem');
      cy.entrarComoCliente('/');
      cy.abrirAssistente();
      cy.perguntarAoAssistente('E agora, o que eu ouço?');
      cy.wait('@mensagem')
        .its('response.body.modelo')
        .should('contain', `ajustado no treino ${body[0].id}`);
    });
  });

  it('RNF0044 - novas vendas depois do treino contam para o próximo', () => {
    cy.historicosDoAssistente();
    cy.request('POST', `${API()}/assistente/treinamentos`);
    cy.concluirTreinos();
    cy.compraEntregue('bruno', 'Purple Rain', 0);

    cy.request(`${API()}/assistente/situacao`)
      .its('body')
      .should('include', { exemplosVendas: 11, exemplosNovos: 1 });
  });

  it('RNF0044 - sem exemplos suficientes, o treino é recusado', () => {
    cy.request({
      method: 'POST',
      url: `${API()}/assistente/treinamentos`,
      failOnStatusCode: false,
    }).then(({ status, body }) => {
      expect(status).to.eq(400);
      expect(body.mensagens[0]).to.contain('pelo menos 10 exemplos');
    });
  });
});
