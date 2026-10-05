// Abre no Cypress só a suíte de demonstração (cypress/e2e/demonstracao), no ritmo pedido:
//   npm run demo        passo a passo: pausa no início de cada etapa
//   npm run demo:lento  sem pausas, mas devagar o bastante para acompanhar
import cypress from 'cypress';

// o terminal do VS Code define a variável, e com ela o binário do Cypress roda como Node e não abre
delete process.env.ELECTRON_RUN_AS_NODE;

await cypress.open({
  testingType: 'e2e',
  config: { specPattern: 'cypress/e2e/demonstracao/**/*.cy.ts' },
  env: { ritmo: process.argv[2] ?? 'passo' },
});
