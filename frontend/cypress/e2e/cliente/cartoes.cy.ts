/// <reference types="cypress" />

describe('Cartões de crédito do cliente (RF0027)', () => {
  beforeEach(() => {
    cy.abrirCuradoriaClientes();
  });

  it('RF0027 e RN0024 - associa cartão ao cadastro com os campos exigidos', () => {
    cy.fixture('clientes').then((dados) => {
      cy.linhaDoCliente('Bruno Tavares').find('[data-testid="btn-editar"]').click();
      cy.adicionarCartao(dados.cartao);
      cy.get('[data-testid="btn-salvar-cliente"]').click();

      cy.get('[data-testid="btn-salvar-cliente"]').should('not.exist');
      cy.request(`${Cypress.env('apiUrl')}/clientes?codigo=CLI-000002`).then(
        (resposta) => {
          const cartoes = resposta.body[0].cartoes;
          expect(cartoes).to.have.length(1);
          expect(cartoes[0].nomeImpresso).to.eq('RENATA BITTENCOURT');
          expect(cartoes[0].codigoSeguranca).to.eq('321');
          expect(cartoes[0].isPreferencial).to.eq(true);
        },
      );
    });
  });

  it('RF0027 - só um cartão fica como preferencial', () => {
    cy.fixture('clientes').then((dados) => {
      cy.linhaDoCliente('Bruno Tavares').find('[data-testid="btn-editar"]').click();
      cy.adicionarCartao(dados.cartao);
      cy.adicionarCartao(dados.segundoCartao);
      cy.get('[data-testid="btn-salvar-cliente"]').click();

      cy.get('[data-testid="btn-salvar-cliente"]').should('not.exist');
      cy.request(`${Cypress.env('apiUrl')}/clientes?codigo=CLI-000002`).then(
        (resposta) => {
          const cartoes = resposta.body[0].cartoes;
          expect(cartoes).to.have.length(2);
          const preferenciais = cartoes.filter(
            (cartao: { isPreferencial: boolean }) => cartao.isPreferencial,
          );
          expect(preferenciais).to.have.length(1);
        },
      );
    });
  });

  it('RN0024 - número e código de segurança são validados', () => {
    cy.linhaDoCliente('Bruno Tavares').find('[data-testid="btn-editar"]').click();
    cy.get('[data-testid="aba-cartoes"]').click();
    cy.get('[data-testid="btn-adicionar-cartao"]').click();
    cy.get('[data-testid="cartao-numero"]').type('123');
    cy.get('[data-testid="cartao-cvv"]').type('1');
    cy.get('[data-testid="btn-salvar-cartao"]').click();

    cy.contains('Número de cartão inválido').should('be.visible');
    cy.contains('Informe o nome impresso no cartão').should('be.visible');
    cy.contains('Selecione a bandeira').should('be.visible');
    cy.contains('Código de segurança inválido').should('be.visible');
  });

  it('RN0025 - só bandeiras registradas no sistema podem ser escolhidas', () => {
    cy.linhaDoCliente('Bruno Tavares').find('[data-testid="btn-editar"]').click();
    cy.get('[data-testid="aba-cartoes"]').click();
    cy.get('[data-testid="btn-adicionar-cartao"]').click();
    cy.get('[data-testid="cartao-bandeira"]').click();
    cy.get('[role="option"]').should('have.length', 6);
    cy.get('[role="option"]').contains('Cabal').should('not.exist');
  });

  it('RN0025 - bandeira desconhecida é recusada pelo servidor', () => {
    cy.request({
      method: 'PUT',
      url: `${Cypress.env('apiUrl')}/clientes/2/cartoes`,
      failOnStatusCode: false,
      body: {
        cartoes: [
          {
            numero: '4111111111111111',
            nomeImpresso: 'B TAVARES',
            codigoSeguranca: '123',
            isPreferencial: true,
            bandeira: { desc: 'Cabal' },
          },
        ],
      },
    }).then((resposta) => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.mensagens[0]).to.contain('RN0025');
    });
  });
});
