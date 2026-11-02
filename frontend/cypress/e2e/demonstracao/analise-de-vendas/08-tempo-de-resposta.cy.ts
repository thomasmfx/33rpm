/// <reference types="cypress" />
import { primeiroDia, ultimoDia } from '../../../support/analise';

export {};

const API = () => Cypress.env('apiUrl');
const CATEGORIAS = ['Hip Hop', 'Rock', 'Electronic', 'Funk / Soul', 'Jazz'];

function consultaDe24Meses(): string {
  const parametros = new URLSearchParams({ inicio: primeiroDia(23), fim: ultimoDia(0) });
  CATEGORIAS.forEach((categoria) => parametros.append('categorias', categoria));
  return `${API()}/analises/vendas?${parametros}`;
}

describe('Demonstração · Análise de vendas por categoria', () => {
  it('8. Tempo de resposta da consulta de até 1 segundo', () => {
    cy.etapa('A base tem vendas de várias categorias, em meses e status diferentes');
    cy.registrarVendas();

    cy.etapa('RNF0011: a consulta mais pesada, 24 meses e as cinco categorias, responde em até 1 segundo');
    cy.request(consultaDe24Meses()).its('status').should('eq', 200);
    for (let tentativa = 0; tentativa < 3; tentativa += 1) {
      cy.request(consultaDe24Meses()).then((resposta) => {
        expect(resposta.body.meses, 'meses').to.have.length(24);
        expect(resposta.duration, 'tempo de resposta em ms').to.be.lessThan(1000);
      });
    }

    cy.etapa('Na tela, o gráfico de 24 meses também aparece com todas as categorias');
    cy.abrirAnalise();
    cy.consultarAnalise({ inicio: primeiroDia(23), fim: ultimoDia(0), categorias: CATEGORIAS });
    cy.get('[data-testid="tabela-vendas"] tbody tr').should('have.length', 24);
    cy.get('[data-testid="grafico-vendas"] .recharts-line').should('have.length', CATEGORIAS.length);
  });
});
