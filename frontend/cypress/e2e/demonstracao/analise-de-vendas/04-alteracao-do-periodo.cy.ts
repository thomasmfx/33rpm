/// <reference types="cypress" />
import { primeiroDia, ultimoDia } from '../../../support/analise';

export {};

describe('Demonstração · Análise de vendas por categoria', () => {
  it('4. Alteração da data de início ou de fim resultando em um novo resultado no gráfico', () => {
    const categorias = ['Rock', 'Hip Hop'];

    cy.etapa('A base tem vendas de várias categorias, em meses e status diferentes');
    cy.registrarVendas();

    cy.etapa('O administrador consulta seis meses de Rock e Hip Hop');
    cy.abrirAnalise();
    cy.consultarAnalise({ inicio: primeiroDia(6), fim: ultimoDia(1), categorias });
    cy.vendasDaBase(categorias, primeiroDia(6), ultimoDia(1)).then((esperado) => {
      cy.conferirAnalise(esperado);
    });

    cy.etapa('RF0056: troca a data de início para três meses atrás, e o gráfico passa a ter quatro meses');
    cy.consultarAnalise({ inicio: primeiroDia(3), fim: ultimoDia(1), categorias });
    cy.vendasDaBase(categorias, primeiroDia(3), ultimoDia(1)).then((esperado) => {
      cy.conferirAnalise(esperado);
    });

    cy.etapa('Troca a data de fim para dois meses atrás, e o gráfico passa a ter dois meses');
    cy.consultarAnalise({ inicio: primeiroDia(3), fim: ultimoDia(2), categorias });
    cy.vendasDaBase(categorias, primeiroDia(3), ultimoDia(2)).then((esperado) => {
      cy.conferirAnalise(esperado);
    });
  });
});
