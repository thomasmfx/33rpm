/// <reference types="cypress" />
import { primeiroDia, rotuloDoMes, ultimoDia } from '../../../support/analise';

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Análise de vendas por categoria', () => {
  it('5. Compra com status diferente de ENTREGUE não contabilizada no gráfico', () => {
    const inicio = primeiroDia(6);
    const fim = ultimoDia(1);
    const categorias = ['Rock', 'Hip Hop', 'Electronic', 'Funk / Soul'];

    cy.etapa('A base tem compras ENTREGUE e compras APROVADA, EM TRANSPORTE e REPROVADA');
    cy.registrarVendas();
    cy.request(`${API()}/pedidos`)
      .its('body')
      .then((pedidos: { status: { descricao: string } }[]) => {
        const status = new Set(pedidos.map((pedido) => pedido.status.descricao));
        expect([...status]).to.include.members(['ENTREGUE', 'EM TRANSPORTE', 'APROVADA', 'REPROVADA']);
      });

    cy.etapa('O administrador consulta as quatro categorias de maior acervo');
    cy.abrirAnalise();
    cy.consultarAnalise({ inicio, fim, categorias });

    cy.etapa('RN0074: Culture II, EM TRANSPORTE há dois meses, não entra em Hip Hop');
    cy.get(
      `[data-testid="tabela-vendas"] td[data-categoria="Hip Hop"][data-periodo="${rotuloDoMes(2)}"]`,
    ).should('have.attr', 'data-valor', '0');

    cy.etapa('Are You Experienced, APROVADA, e Favourite Worst Nightmare, REPROVADA, também ficam fora de Rock');
    cy.get(
      `[data-testid="tabela-vendas"] td[data-categoria="Rock"][data-periodo="${rotuloDoMes(3)}"]`,
    ).should('have.attr', 'data-valor', '0');
    cy.get(
      `[data-testid="tabela-vendas"] td[data-categoria="Rock"][data-periodo="${rotuloDoMes(2)}"]`,
    ).should('have.attr', 'data-valor', '329');

    cy.etapa('O total de cada mês é só o das compras ENTREGUE da base');
    cy.vendasDaBase(categorias, inicio, fim).then((esperado) => {
      cy.conferirAnalise(esperado);
    });
  });
});
