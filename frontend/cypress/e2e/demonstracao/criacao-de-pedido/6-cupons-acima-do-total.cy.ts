/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Criação de pedido', () => {
  it('6. Uso de cupons cujo valor supere o da compra, com a emissão de cupom de troca para a diferença', () => {
    cy.etapa('A Ana inclui Graduation e vai ao pagamento: R$ 309,00 + R$ 28,00 de frete');
    cy.entrarComoCliente('/');
    cy.adicionarAoCarrinho('Graduation', 1);
    cy.irParaPagamento('Casa');
    cy.conferirValor('resumo-total', 337);

    cy.etapa('Aplica TROCA-AP-300 e TROCA-AP-045: R$ 345,00 em cupons, R$ 8,00 acima do total');
    cy.selecionarCupom('TROCA-AP-300');
    cy.selecionarCupom('TROCA-AP-045');

    cy.etapa('RN0036: os dois cupons são necessários, e a diferença de R$ 8,00 vira cupom de troca');
    cy.conferirValor('aviso-troco', 8);
    cy.get('[data-testid="pendencias-pagamento"]').should('not.exist');
    cy.get('[data-testid="cartao-opcao"]').should('not.exist');

    cy.etapa('Finaliza sem cartão: a confirmação avisa que os R$ 8,00 voltam como cupom de troca');
    cy.finalizarPedido().then((id) => {
      const codigo = `TROCA-P${String(id).padStart(6, '0')}`;
      cy.conferirValor('aviso-diferenca', 8);

      cy.etapa('RN0036 (CDU03 P8.2): o cupom da diferença é emitido quando o pagamento é aprovado');
      cy.validarPagamentos();
      cy.request(`${API()}/pedidos/${id}`)
        .its('body.cupomGerado')
        .should('include', { codigo, valor: 8, isUtilizado: false });

      cy.etapa('Em Meus cupons, o cupom de troca novo está disponível e os usados aparecem como utilizados');
      cy.visit('/cupons');
      cy.get(`[data-testid="cupom-cartao"][data-codigo="${codigo}"]`)
        .should('have.attr', 'data-tipo', 'troca')
        .and('have.attr', 'data-utilizado', 'false');
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
    });
  });
});
