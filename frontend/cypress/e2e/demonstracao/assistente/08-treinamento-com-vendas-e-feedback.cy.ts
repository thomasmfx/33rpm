/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Recomendação com IA generativa', () => {
  it('8. Apresentação do treinamento ou ajuste fino: dados utilizados, procedimento realizado e como novos dados de vendas e feedback passam a ser incorporados ao modelo', () => {
    cy.concluirTreinos();

    cy.etapa('Dados: as compras da Ana e do Bruno e uma resposta avaliada como útil');
    cy.historicosDaDemonstracao();
    cy.conversarPelaApi(1, 'Me recomenda uns discos').then((id) => cy.avaliarPelaApi(id, true));

    cy.etapa('RNF0044 item 3: a curadoria mostra os exemplos que o treino vai usar e o procedimento');
    cy.entrarComoAdministrador('/curadoria/assistente');
    cy.get('[data-testid="exemplos-vendas"]').should('have.attr', 'data-valor', '10');
    cy.get('[data-testid="exemplos-acervo"]').should('have.attr', 'data-valor', '10');
    cy.get('[data-testid="exemplos-feedback"]').should('have.attr', 'data-valor', '1');
    cy.contains('Como o ajuste fino é feito').should('be.visible');
    cy.request(`${API()}/assistente/dataset`)
      .its('body')
      .then((jsonl: string) => expect(jsonl.trim().split('\n')).to.have.length(21));

    cy.modoSimulado().then((simulado) => {
      // com o Vertex AI, o treino leva dezenas de minutos e tem custo: a demonstração para aqui
      if (!simulado) return;

      cy.etapa('RNF0044 item 3: a curadoria treina, e o chat passa a usar o modelo ajustado');
      cy.get('[data-testid="btn-treinar"]').click();
      cy.get('[data-testid="linha-treino"]')
        .first()
        .should('have.attr', 'data-status', 'EM TREINAMENTO');
      cy.get('[data-testid="btn-atualizar-treinos"]').click();
      cy.get('[data-testid="linha-treino"]').first().should('have.attr', 'data-status', 'CONCLUIDO');
      cy.get('[data-testid="modelo-em-uso"]').should('contain', 'Ajustado no treino');

      cy.etapa('Personalização contínua: venda e feedback novos contam para o próximo treino');
      cy.compraEntregue('bruno', 'Purple Rain', 0);
      cy.conversarPelaApi(2, 'Algo parecido com Pet Sounds').then((id) =>
        cy.avaliarPelaApi(id, true),
      );
      cy.reload();
      cy.get('[data-testid="exemplos-novos"]').should('have.attr', 'data-valor', '2');
      cy.contains('só entram no modelo quando a curadoria treinar de novo').should('be.visible');
    });
  });
});
