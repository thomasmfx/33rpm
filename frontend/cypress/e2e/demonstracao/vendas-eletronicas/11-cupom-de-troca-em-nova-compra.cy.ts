/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Gerenciar vendas eletrônicas', () => {
  it('11. Uso do cupom de troca gerado em uma nova compra', () => {
    cy.etapa('A Ana trocou Diamond Life: a troca foi autorizada e recebida pela curadoria');
    cy.pedidoEntregue([{ titulo: 'Diamond Life', quantidade: 1 }]).then((id) => {
      cy.request(`${API()}/pedidos/${id}`).then(({ body: pedido }) => {
        cy.request('POST', `${API()}/trocas`, {
          pedidoId: id,
          clienteId: 1,
          motivo: 'Faixa 3 pulando',
          itens: [{ itemPedidoId: pedido.itens[0].id, quantidade: 1 }],
        }).then(({ body: troca }) => {
          cy.request('PUT', `${API()}/trocas/${troca.id}/status`, {
            status: { descricao: 'TROCA AUTORIZADA' },
          });
          cy.request('PUT', `${API()}/trocas/${troca.id}/status`, {
            status: { descricao: 'TROCADO' },
            retornoEstoque: true,
          });
        });
      });

      cy.etapa('RF0045: o cupom TROCA-T000001, de R$ 249,00, está em Meus cupons');
      cy.entrarComoCliente('/cupons');
      cy.get('[data-testid="cupom-cartao"][data-codigo="TROCA-T000001"]')
        .should('have.attr', 'data-utilizado', 'false')
        .and('contain', '249,00')
        .and('contain', 'Troca #1');

      cy.etapa('Numa nova compra, Mezmerize: R$ 239,00 + R$ 28,00 de frete');
      cy.adicionarAoCarrinho('Mezmerize', 1);
      cy.irParaPagamento('Casa');
      cy.conferirValor('resumo-total', 267);

      cy.etapa('RF0037: usa o cupom da troca — restam R$ 18,00 para o Visa final 1002');
      cy.selecionarCupom('TROCA-T000001');
      cy.conferirValor('resumo-total', 18);
      cy.marcarCartao('1002');

      cy.finalizarPedido().then((novo) => {
        cy.etapa('RN0037: o cupom de troca é verdadeiro e só desta compra — APROVADA');
        cy.validarPagamentos();
        cy.request(`${API()}/pedidos/${novo}`)
          .its('body')
          .then((compra) => {
            expect(compra.status.descricao).to.eq('APROVADA');
            expect(compra.cupons.map((cupom: { codigo: string }) => cupom.codigo)).to.deep.eq([
              'TROCA-T000001',
            ]);
            expect(compra.pagamentos[0]).to.include({ finalNumero: '1002', valor: 18 });
          });

        cy.etapa('O cupom aparece como utilizado em Meus cupons');
        cy.visit('/cupons');
        cy.get('[data-testid="cupom-cartao"][data-codigo="TROCA-T000001"]').should(
          'have.attr',
          'data-utilizado',
          'true',
        );
      });
    });
  });
});
