/// <reference types="cypress" />
import { BRUNO, DEMONSTRACAO_BRUNO } from '../../../support/assistente';

export {};

const API = () => Cypress.env('apiUrl');

interface CategoriaApi {
  id: number;
  desc: string;
  tipo: string;
}

interface SugestaoApi {
  tipo: string;
  motivo: string;
}

describe('Demonstração · Recomendação com IA generativa', () => {
  it('2. Recomendação personalizada para um cliente, coerente com seu histórico de compras e preferências', () => {
    cy.etapa('RNF0044 item 1: o Bruno tem um histórico de rock e declara Rock e Psychedelic Rock');
    cy.historicosDaDemonstracao();
    cy.request<{ categorias: CategoriaApi[] }>(`${API()}/dominios`).then(({ body }) => {
      const escolhidas = body.categorias
        .filter(
          (categoria) =>
            (categoria.desc === 'Rock' && categoria.tipo === 'genero') ||
            (categoria.desc === 'Psychedelic Rock' && categoria.tipo === 'estilo'),
        )
        .map((categoria) => ({ id: categoria.id }));
      cy.request('PUT', `${API()}/clientes/2/preferencias`, { preferencias: escolhidas });
    });

    cy.etapa('RNF0044 item 2: ele pede uma recomendação pelo chat');
    cy.entrarComoCliente('/', BRUNO);
    cy.abrirAssistente();
    cy.perguntarAoAssistente('Me recomenda uns discos?').within(() => {
      cy.get('[data-testid="sugestao-disco"]').should('have.length.at.least', 1);
      // disco que ele já tem não volta como sugestão
      DEMONSTRACAO_BRUNO.forEach((titulo) =>
        cy.get('[data-testid="sugestao-disco"]').should('not.contain', titulo),
      );
    });

    cy.etapa('RNF0044 item 1: ao menos uma sugestão é do gosto dele, com o motivo à mostra');
    cy.request<{ sugestoes: SugestaoApi[] }[]>(`${API()}/assistente/interacoes`)
      .its('body.0.sugestoes')
      .then((sugestoes: SugestaoApi[]) => {
        expect(sugestoes.some((sugestao) => sugestao.tipo === 'afinidade')).to.eq(true);
        sugestoes.forEach((sugestao) => expect(sugestao.motivo).to.not.be.empty);
      });
  });
});
