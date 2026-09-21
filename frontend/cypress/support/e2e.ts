import './commands';

// A massa volta ao estado conhecido antes de cada teste: sem isso a suíte não repete
beforeEach(() => {
  cy.resetarBanco();
});
