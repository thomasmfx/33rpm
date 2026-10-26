/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Gerenciar vendas eletrônicas', () => {
  it('4. Compra paga com cupons de troca de valor superior ao da compra, com emissão do cupom de diferença', () => {
    cy.etapa('A Ana inclui Back To Black e vai ao pagamento: R$ 279,00 + R$ 28,00 de frete');
    cy.entrarComoCliente('/');
    cy.adicionarAoCarrinho('Back To Black', 1);
    cy.irParaPagamento('Casa');
    cy.conferirValor('resumo-total', 307);

    cy.etapa('Usa os cupons de troca TROCA-AP-300 e TROCA-AP-045: R$ 345,00 contra R$ 307,00');
    cy.selecionarCupom('TROCA-AP-300');
    cy.selecionarCupom('TROCA-AP-045');

    cy.etapa('RN0036: os cupons cobrem tudo, nenhum é dispensável, e a diferença vira cupom de troca');
    cy.conferirValor('aviso-troco', 38);
    cy.get('[data-testid="pendencias-pagamento"]').should('not.exist');
    cy.get('[data-testid="btn-pagar"]').should('contain', 'Confirmar pedido');

    cy.finalizarPedido().then((id) => {
      cy.etapa('A confirmação avisa que os R$ 38,00 voltam como cupom de troca na aprovação');
      cy.conferirValor('aviso-diferenca', 38);
      cy.request(`${API()}/cupons?clienteId=1`)
        .its('body')
        .then((cupons: { codigo: string }[]) => {
          expect(cupons.map((cupom) => cupom.codigo)).not.to.include(
            `TROCA-P${String(id).padStart(6, '0')}`,
          );
        });

      cy.etapa('RN0037: a validação confere os cupons de troca — verdadeiros e só desta compra');
      cy.validarPagamentos();
      cy.request(`${API()}/pedidos/${id}`).its('body.status.descricao').should('eq', 'APROVADA');

      cy.etapa('RN0036 (CDU03 P8.2): aprovada a compra, o cupom da diferença é emitido');
      cy.request(`${API()}/pedidos/${id}`)
        .its('body.cupomGerado')
        .should('include', { codigo: `TROCA-P${String(id).padStart(6, '0')}`, valor: 38 });

      cy.etapa('Em Meus cupons, os dois usados e o novo, disponível para a próxima compra');
      cy.visit('/cupons');
      cy.get('[data-testid="cupom-cartao"][data-codigo="TROCA-AP-300"]').should(
        'have.attr',
        'data-utilizado',
        'true',
      );
      cy.get('[data-testid="cupom-cartao"][data-codigo="TROCA-AP-045"]').should(
        'have.attr',
        'data-utilizado',
        'true',
      );
      cy.get(`[data-testid="cupom-cartao"][data-codigo="TROCA-P${String(id).padStart(6, '0')}"]`)
        .should('have.attr', 'data-utilizado', 'false')
        .and('contain', '38,00');
    });
  });
});
