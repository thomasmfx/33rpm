/// <reference types="cypress" />
import { primeiroDia, ultimoDia } from '../../../support/analise';

export {};

describe('Demonstração · Análise de vendas por categoria', () => {
  it('1. Consulta de uma categoria em um período válido, com valores mensais iguais à soma das vendas ENTREGUE registradas na base', () => {
    const inicio = primeiroDia(6);
    const fim = ultimoDia(1);

    cy.etapa('A base tem vendas de várias categorias, em meses e status diferentes');
    cy.registrarVendas();

    cy.etapa('O administrador abre o Dashboard da curadoria');
    cy.abrirAnalise();

    cy.etapa('RF0055 e RF0056: informa a data de início e a de fim e escolhe só Rock');
    cy.consultarAnalise({ inicio, fim, categorias: ['Rock'] });

    cy.etapa('RN0071: cada mês é a soma das vendas ENTREGUE de Rock registradas na base');
    cy.vendasDaBase(['Rock'], inicio, fim).then((esperado) => {
      cy.conferirAnalise(esperado);
    });
  });
});
