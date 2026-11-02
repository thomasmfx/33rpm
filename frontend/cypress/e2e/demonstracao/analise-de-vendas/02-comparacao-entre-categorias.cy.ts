/// <reference types="cypress" />
import { primeiroDia, ultimoDia } from '../../../support/analise';

export {};

describe('Demonstração · Análise de vendas por categoria', () => {
  it('2. Comparação entre duas ou mais categorias no período', () => {
    const inicio = primeiroDia(6);
    const fim = ultimoDia(1);
    const categorias = ['Rock', 'Hip Hop', 'Electronic'];

    cy.etapa('A base tem vendas de várias categorias, em meses e status diferentes');
    cy.registrarVendas();

    cy.etapa('O administrador abre o Dashboard da curadoria');
    cy.abrirAnalise();

    cy.etapa('RF0057: seleciona Rock, Hip Hop e Electronic para comparar no mesmo período');
    cy.consultarAnalise({ inicio, fim, categorias });

    cy.etapa('RNF0043: o gráfico traz uma linha por categoria, e a legenda as identifica');
    cy.get('[data-testid="grafico-vendas"] .recharts-line').should('have.length', categorias.length);
    categorias.forEach((categoria) => {
      cy.get('[data-testid="grafico-vendas"]').should('contain', categoria);
    });

    cy.etapa('Os valores de cada categoria batem com as vendas ENTREGUE da base');
    cy.vendasDaBase(categorias, inicio, fim).then((esperado) => {
      cy.conferirAnalise(esperado);
    });
  });
});
