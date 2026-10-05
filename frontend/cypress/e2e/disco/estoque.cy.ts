/// <reference types="cypress" />

import type { DiscoApi } from '../../support/commands';

const API = () => Cypress.env('apiUrl');

function registrarEntrada(discoId: number, entrada: Record<string, unknown>) {
  return cy.request({
    method: 'POST',
    url: `${API()}/estoque/entradas`,
    failOnStatusCode: false,
    body: {
      discoId,
      fornecedor: { nome: 'Import LP Distribuidora' },
      quantidade: 12,
      valorCusto: 179.9,
      dataEntrada: '2026-08-20',
      ...entrada,
    },
  });
}

function discoPorId(id: number) {
  return cy.request<DiscoApi>(`${API()}/discos/${id}`).its('body');
}

// o cabeçalho fixo do modal cobre o campo que o Cypress rola até o topo
describe('Entrada em estoque e valor de venda (RF0051, RF0052, RN0013, RN0050, RN0051, RN0061, RN0062, RNF0064)', { scrollBehavior: 'center' }, () => {
  beforeEach(() => {
    // Take Care no grupo Importado (+110%), cadastrado pela própria API de disco
    cy.cadastrarDiscoSemEstoque('Take Care').as('disco');
  });

  it('RF0051, RF0052, RN0013 e RN0050 - a entrada soma ao estoque e forma o preço pela margem do grupo', function () {
    const disco = this.disco as DiscoApi;
    cy.entrarComoAdministrador('/curadoria/inventario');
    cy.fixture('disco').then(({ entradaTakeCare }) => {
      cy.linhaDoDisco('Take Care')
        .should('have.attr', 'data-disco-id', String(disco.id))
        .find('[data-testid="btn-nova-entrada"]')
        .click();
      cy.get('[data-testid="entrada-quantidade"]').clear().type(entradaTakeCare.quantidade);
      cy.get('[data-testid="entrada-custo"]').clear().type(entradaTakeCare.valorCusto);
      cy.escolherOpcao('entrada-fornecedor', entradaTakeCare.fornecedor);
      cy.get('[data-testid="entrada-data"]').click();
      cy.get('table button').not('[data-outside]').contains(/^1$/).click();

      // R$ 179,90 + 110% = R$ 377,79, calculado pelo servidor antes de gravar
      cy.conferirValor('entrada-previa-preco', 377.79);
      cy.intercept('POST', '**/api/estoque/entradas').as('entrada');
      cy.get('[data-testid="btn-salvar-entrada"]').click();
      cy.wait('@entrada').its('response.statusCode').should('eq', 201);
    });

    discoPorId(disco.id).should('include', { estoque: 12, precoVenda: 377.79 });
    cy.request(`${API()}/estoque/entradas?discoId=${disco.id}`).its('body').should('have.length', 1);
  });

  it('RN0051 - com custos diferentes vale o maior: custo maior sobe o preço, custo menor não baixa', function () {
    const disco = this.disco as DiscoApi;
    registrarEntrada(disco.id, {}).its('status').should('eq', 201);
    discoPorId(disco.id).should('include', { estoque: 12, precoVenda: 377.79 });

    registrarEntrada(disco.id, { quantidade: 3, valorCusto: 200 }).its('status').should('eq', 201);
    discoPorId(disco.id).should('include', { estoque: 15, precoVenda: 420 });

    registrarEntrada(disco.id, { quantidade: 5, valorCusto: 150 }).its('status').should('eq', 201);
    discoPorId(disco.id).should('include', { estoque: 20, precoVenda: 420 });
  });

  it('RN0050, RN0061, RN0062 e RNF0064 - recusa entrada sem os dados obrigatórios', function () {
    const disco = this.disco as DiscoApi;
    const recusas: [Record<string, unknown>, string][] = [
      [{ quantidade: 0 }, 'A quantidade deve ser maior que zero (RN0061).'],
      [{ valorCusto: 0 }, 'Informe um valor de custo maior que zero (RN0062).'],
      [{ dataEntrada: null }, 'Informe a data de entrada (RNF0064).'],
      [{ fornecedor: null }, 'Informe o fornecedor da entrada (RN0050).'],
    ];
    recusas.forEach(([campo, mensagem]) => {
      registrarEntrada(disco.id, campo).then((resposta) => {
        expect(resposta.status).to.eq(400);
        expect(resposta.body.mensagens).to.include(mensagem);
      });
    });

    discoPorId(disco.id).should('include', { estoque: 0, precoVenda: 0 });
    cy.request(`${API()}/estoque/entradas?discoId=${disco.id}`).its('body').should('have.length', 0);
  });
});
