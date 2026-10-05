// Ritmo da suíte de demonstração (cypress/e2e/demonstracao), escolhido por --env ritmo:
//   passo  pausa no início de cada etapa; o ▶ do Cypress segue para a próxima
//   lento  não pausa, mas digita devagar e segura cada etapa na tela por um tempo
// Sem ritmo, como no npm run e2e, a etapa só deixa o título no log.
const ritmo = Cypress.env('ritmo') as 'passo' | 'lento' | undefined;

if (ritmo) {
  // os 10 ms por tecla do padrão passam rápido demais para quem assiste
  Cypress.Keyboard.defaults({ keystrokeDelay: 60 });
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      etapa(titulo: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('etapa', (titulo: string) => {
  cy.log(`**${titulo}**`);
  // cy.pause só existe no Cypress aberto: em cypress run não há quem clique no ▶
  if (ritmo === 'passo' && Cypress.config('isInteractive')) {
    cy.pause();
  } else if (ritmo === 'lento') {
    cy.wait(1500, { log: false });
  }
});

export {};
