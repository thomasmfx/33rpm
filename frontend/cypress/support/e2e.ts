import './commands';
import './demonstracao';

// A massa volta ao estado conhecido antes de cada teste: sem isso a suíte não repete
beforeEach(() => {
  cy.resetarBanco();
});

// O hot reload do Vite abre um WebSocket próprio; quando ele cai, a rejeição vem do
// cliente do servidor de desenvolvimento, não da loja, e não deve derrubar o teste
Cypress.on('uncaught:exception', (erro) => !erro.message.includes('WebSocket closed without opened'));
