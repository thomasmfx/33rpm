/// <reference types="cypress" />

describe('Inativação de cliente (RF0023)', () => {
  beforeEach(() => {
    cy.abrirCuradoriaClientes();
  });

  it('RF0023 - inativa o cliente e ele sai da lista de ativos', () => {
    cy.linhaDoCliente('Ana Paula Ribeiro')
      .find('[data-testid="btn-alternar-status"]')
      .click();
    cy.contains('Inativar cliente').should('be.visible');
    cy.get('[data-testid="btn-confirmar-status"]').click();

    cy.get('[data-testid="btn-filtros"]').click();
    cy.get('[data-testid="filtro-status"]').contains('Ativos').click();
    cy.contains('[data-testid="cliente-linha"]', 'Ana Paula Ribeiro').should('not.exist');

    cy.get('[data-testid="filtro-status"]').contains('Inativos').click();
    cy.linhaDoCliente('Ana Paula Ribeiro').should('exist');
  });

  it('RF0023 - inativar não é excluir: o cadastro continua no banco', () => {
    cy.linhaDoCliente('Ana Paula Ribeiro')
      .find('[data-testid="btn-alternar-status"]')
      .click();
    cy.get('[data-testid="btn-confirmar-status"]').click();
    cy.contains('Inativar cliente').should('not.exist');

    cy.request(`${Cypress.env('apiUrl')}/clientes?codigo=CLI-000001`).then(
      (resposta) => {
        expect(resposta.body).to.have.length(1);
        expect(resposta.body[0].nome).to.eq('Ana Paula Ribeiro');
        expect(resposta.body[0].isAtivo).to.eq(false);
        // o histórico do cliente continua acessível: nada foi apagado
        expect(resposta.body[0].enderecos).to.have.length(1);
      },
    );
  });

  it('RF0023 - cliente inativo perde o acesso à loja', () => {
    cy.linhaDoCliente('Carla Nogueira')
      .find('[data-testid="btn-entrar-como"]')
      .should('be.disabled');

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/clientes/login`,
      body: { email: 'carla.nogueira@email.com', senha: 'Senha@123' },
      failOnStatusCode: false,
    }).then((resposta) => {
      expect(resposta.status).to.eq(401);
      expect(resposta.body.mensagens[0]).to.contain('inativo');
    });
  });

  it('RF0023 - a reativação devolve o acesso', () => {
    cy.linhaDoCliente('Carla Nogueira')
      .find('[data-testid="btn-alternar-status"]')
      .click();
    cy.contains('Reativar cliente').should('be.visible');
    cy.get('[data-testid="btn-confirmar-status"]').click();

    cy.linhaDoCliente('Carla Nogueira')
      .find('[data-testid="btn-entrar-como"]')
      .should('not.be.disabled');

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/clientes/login`,
      body: { email: 'carla.nogueira@email.com', senha: 'Senha@123' },
      failOnStatusCode: false,
    })
      .its('status')
      .should('eq', 200);
  });
});
