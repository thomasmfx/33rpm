/// <reference types="cypress" />

function abrirEdicaoDe(nome: string) {
  cy.linhaDoCliente(nome).find('[data-testid="btn-editar"]').click();
}

describe('Alteração de cliente (RF0022)', () => {
  beforeEach(() => {
    cy.abrirCuradoriaClientes();
  });

  it('RF0022 - altera dados cadastrais e mantém o código (RNF0035)', () => {
    abrirEdicaoDe('Ana Paula Ribeiro');
    cy.get('[data-testid="input-nome"]').clear().type('Ana Paula Ribeiro Lima');
    cy.get('[data-testid="input-email"]').clear().type('ana.lima@email.com');
    cy.get('[data-testid="btn-salvar-cliente"]').click();

    cy.get('[data-testid="alerta-erro"]').should('not.exist');
    cy.linhaDoCliente('Ana Paula Ribeiro Lima')
      .find('[data-testid="cliente-codigo"]')
      .should('have.text', 'CLI-000001');

    cy.request(`${Cypress.env('apiUrl')}/clientes?codigo=CLI-000001`).then(
      (resposta) => {
        expect(resposta.body[0].nome).to.eq('Ana Paula Ribeiro Lima');
        expect(resposta.body[0].email).to.eq('ana.lima@email.com');
      },
    );
  });

  it('RF0022 - o CPF não é editável', () => {
    abrirEdicaoDe('Ana Paula Ribeiro');
    cy.get('[data-testid="input-cpf"]').should('be.disabled');
  });

  it('RF0022 - alteração para e-mail de outro cliente é recusada', () => {
    abrirEdicaoDe('Ana Paula Ribeiro');
    cy.get('[data-testid="input-email"]').clear().type('bruno.tavares@email.com');
    cy.get('[data-testid="btn-salvar-cliente"]').click();

    cy.get('[data-testid="alerta-erro"]').should(
      'contain',
      'Já existe um cliente com este e-mail.',
    );
  });

  it('RF0028 - altera apenas a senha, sem editar o resto do cadastro', () => {
    abrirEdicaoDe('Ana Paula Ribeiro');
    cy.get('[data-testid="input-senha"]').clear().type('NovaSenha@2026');
    cy.get('[data-testid="input-confirmar-senha"]').clear().type('NovaSenha@2026');
    cy.get('[data-testid="btn-alterar-somente-senha"]').click();

    // o modal só fecha depois que o servidor confirma a troca
    cy.get('[data-testid="btn-alterar-somente-senha"]').should('not.exist');
    cy.linhaDoCliente('Ana Paula Ribeiro').should('exist');

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/clientes/login`,
      body: { email: 'ana.ribeiro@email.com', senha: 'NovaSenha@2026' },
      failOnStatusCode: false,
    })
      .its('status')
      .should('eq', 200);

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/clientes/login`,
      body: { email: 'ana.ribeiro@email.com', senha: 'Senha@123' },
      failOnStatusCode: false,
    })
      .its('status')
      .should('eq', 401);
  });

  it('RF0028 - a senha nova também precisa ser forte (RNF0031)', () => {
    abrirEdicaoDe('Ana Paula Ribeiro');
    cy.get('[data-testid="input-senha"]').clear().type('123');
    cy.get('[data-testid="input-confirmar-senha"]').clear().type('123');
    cy.get('[data-testid="btn-alterar-somente-senha"]').click();

    cy.contains('mínimo 8 caracteres').should('be.visible');
  });

  it('RNF0034 - adiciona endereço sem editar os demais dados cadastrais', () => {
    cy.fixture('clientes').then((dados) => {
      abrirEdicaoDe('Bruno Tavares');
      cy.adicionarEndereco(dados.enderecoEntrega);
      cy.get('[data-testid="btn-alterar-somente-enderecos"]').click();

      cy.get('[data-testid="btn-alterar-somente-enderecos"]').should('not.exist');
      cy.linhaDoCliente('Bruno Tavares').should('exist');
      cy.request(`${Cypress.env('apiUrl')}/clientes?codigo=CLI-000002`).then(
        (resposta) => {
          const cliente = resposta.body[0];
          expect(cliente.nome).to.eq('Bruno Tavares');
          expect(cliente.enderecos).to.have.length(2);
          expect(
            cliente.enderecos.map((endereco: { nome: string }) => endereco.nome),
          ).to.include('Escritório');
        },
      );
    });
  });
});
