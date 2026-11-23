/// <reference types="cypress" />
import { BRUNO } from '../../../support/assistente';

export {};

function titulosSugeridos(): Cypress.Chainable<string[]> {
  return cy
    .get('[data-testid="resposta-assistente"]')
    .last()
    .find('[data-testid="sugestao-disco"] strong')
    .then((titulos) => [...titulos].map((titulo) => titulo.innerText));
}

describe('Demonstração · Recomendação com IA generativa', () => {
  it('3. Recomendações diferentes para dois clientes com históricos distintos', () => {
    cy.etapa('A Ana comprou soul e R&B; o Bruno comprou rock e metal');
    cy.historicosDaDemonstracao();

    cy.etapa('RNF0044 item 1: a Ana pede uma recomendação');
    cy.entrarComoCliente('/');
    cy.abrirAssistente();
    cy.perguntarAoAssistente('Que discos combinam comigo?');
    titulosSugeridos().then((daAna) => {
      expect(daAna).to.have.length.at.least(1);

      cy.etapa('RNF0044 item 1: o Bruno faz a mesma pergunta e recebe outros discos');
      cy.entrarComoCliente('/', BRUNO);
      cy.abrirAssistente();
      cy.perguntarAoAssistente('Que discos combinam comigo?');
      titulosSugeridos().then((doBruno) => {
        expect(doBruno).to.have.length.at.least(1);
        expect(doBruno).to.not.deep.equal(daAna);
      });
    });
  });
});
