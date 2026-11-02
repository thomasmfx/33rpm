/// <reference types="cypress" />
import { primeiroDia, rotuloDoMes, ultimoDia } from '../../../support/analise';

export {};

describe('Demonstração · Análise de vendas por categoria', () => {
  it('6. Compra que passa a ENTREGUE dentro do período refletida na consulta seguinte', () => {
    const inicio = primeiroDia(3);
    const fim = ultimoDia(1);
    const celulaDoMes = `[data-testid="tabela-vendas"] td[data-categoria="Hip Hop"][data-periodo="${rotuloDoMes(2)}"]`;

    cy.etapa('A Ana comprou Culture II há dois meses, e a compra está EM TRANSPORTE');
    cy.registrarVenda({
      itens: [{ titulo: 'Culture II', quantidade: 1 }],
      mesesAtras: 2,
      status: 'EM TRANSPORTE',
    }).then((id) => {
      cy.etapa('O administrador consulta Hip Hop: o mês da compra está em R$ 0,00');
      cy.abrirAnalise();
      cy.consultarAnalise({ inicio, fim, categorias: ['Hip Hop'] });
      cy.get(celulaDoMes).should('have.attr', 'data-valor', '0');

      cy.etapa('RF0040 e RN0040: na curadoria, confirma a entrega — ENTREGUE');
      cy.entrarComoAdministrador('/curadoria/pedidos');
      cy.get('[data-testid="busca-pedidos"]').type(String(id));
      const linha = () => cy.get(`[data-testid="pedido-linha-admin"][data-pedido-id="${id}"]`);
      linha().find('[data-testid="btn-proximo-passo"]').should('contain', 'Confirmar entrega').click();
      linha().should('have.attr', 'data-status', 'ENTREGUE');

      cy.etapa('Na consulta seguinte, o valor de Culture II entra no mês da compra');
      cy.abrirAnalise();
      cy.consultarAnalise({ inicio, fim, categorias: ['Hip Hop'] });
      cy.discoPorTitulo('Culture II').then((disco) => {
        cy.get(celulaDoMes).should('have.attr', 'data-valor', String(disco.precoVenda));
      });
    });
  });
});
