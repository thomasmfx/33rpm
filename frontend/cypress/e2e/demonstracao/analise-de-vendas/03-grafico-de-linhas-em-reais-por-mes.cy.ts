/// <reference types="cypress" />
import { primeiroDia, ultimoDia } from '../../../support/analise';

export {};

describe('Demonstração · Análise de vendas por categoria', () => {
  it('3. Apresentação do resultado em gráfico de linhas, com valores em reais agrupados por mês', () => {
    const inicio = primeiroDia(6);
    const fim = ultimoDia(1);
    const categorias = ['Rock', 'Hip Hop'];

    cy.etapa('A base tem vendas de várias categorias, em meses e status diferentes');
    cy.registrarVendas();

    cy.etapa('O administrador consulta Rock e Hip Hop de seis meses');
    cy.abrirAnalise();
    cy.consultarAnalise({ inicio, fim, categorias });

    cy.etapa('RNF0043: um gráfico de linhas, uma linha por categoria');
    cy.get('[data-testid="grafico-vendas"] .recharts-line').should('have.length', categorias.length);

    cy.etapa('RN0071: o eixo horizontal traz os seis meses, em mês/ano');
    cy.get('[data-testid="grafico-vendas"] .recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value')
      .should('have.length', 6)
      .each(($mes) => expect($mes.text()).to.match(/^[A-Z]{3} \d{2}$/));

    cy.etapa('O eixo vertical está em reais');
    cy.get('[data-testid="grafico-vendas"] .recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value')
      .should('have.length.greaterThan', 1)
      .each(($valor) => expect($valor.text()).to.contain('R$'));

    cy.etapa('RNF0046: ao passar o cursor sobre o gráfico, o tooltip mostra o valor em reais');
    cy.get('[data-testid="grafico-vendas"] .recharts-surface').trigger('mousemove', 'center');
    cy.get('.recharts-tooltip-wrapper').should('be.visible').and('contain', 'R$');
  });
});
