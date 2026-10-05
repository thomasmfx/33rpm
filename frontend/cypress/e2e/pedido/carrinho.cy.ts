/// <reference types="cypress" />

describe('Carrinho de compra (RF0031, RF0032, RN0031)', () => {
  beforeEach(() => {
    cy.entrarComoCliente('/');
  });

  it('RF0031 e RF0032 - inclui mais de um disco escolhendo a quantidade e altera no carrinho', () => {
    cy.adicionarAoCarrinho('Camp', 2);
    cy.adicionarAoCarrinho('Rita Lee', 1);
    cy.get('[data-testid="contador-carrinho"]').should('have.text', '3');

    cy.get('[data-testid="link-carrinho"]').click();
    cy.get('[data-testid="item-carrinho"]').should('have.length', 2);

    cy.itemDoCarrinho('Rita Lee').find('[data-testid="quantidade-aumentar"]').click();
    cy.itemDoCarrinho('Rita Lee').find('[data-testid="quantidade-valor"]').should('have.text', '2');
    cy.itemDoCarrinho('Camp').find('[data-testid="quantidade-diminuir"]').click();
    cy.itemDoCarrinho('Camp').find('[data-testid="quantidade-valor"]').should('have.text', '1');

    // 1 × R$ 359,00 + 2 × R$ 249,00
    cy.conferirValor('carrinho-subtotal', 857);
    cy.get('[data-testid="contador-carrinho"]').should('have.text', '3');
  });

  it('RF0031 - exclui um item e mantém o outro', () => {
    cy.adicionarAoCarrinho('Illmatic', 1);
    cy.adicionarAoCarrinho('Pet Sounds', 1);
    cy.get('[data-testid="link-carrinho"]').click();

    cy.itemDoCarrinho('Pet Sounds').find('[data-testid="btn-remover-item"]').click();

    cy.get('[data-testid="item-carrinho"]').should('have.length', 1).and('contain', 'Illmatic');
    cy.conferirValor('carrinho-subtotal', 289);
  });

  it('RN0031 - disco sem estoque não pode ser incluído', () => {
    cy.cadastrarDiscoSemEstoque('Disco Esgotado').then((disco) => {
      cy.visit(`/disco/${disco.id}`);
    });

    cy.get('[data-testid="disco-estoque"]').should('contain', 'Esgotado');
    cy.get('[data-testid="btn-adicionar-carrinho"]').should('be.disabled');
  });

  it('RN0031 - a quantidade escolhida não passa do estoque, na tela e no servidor', () => {
    cy.discoPorTitulo('Anti').then((disco) => {
      expect(disco.estoque).to.eq(5);
      cy.visit(`/disco/${disco.id}`);

      cy.get('[data-testid="disco-compra"]').within(() => {
        for (let vez = 1; vez < disco.estoque; vez += 1) {
          cy.get('[data-testid="quantidade-aumentar"]').click();
        }
        cy.get('[data-testid="quantidade-valor"]').should('have.text', '5');
        cy.get('[data-testid="quantidade-aumentar"]').should('be.disabled');
      });

      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/estoque/disponibilidade`,
        body: { itens: [{ discoId: disco.id, quantidade: 6 }] },
        failOnStatusCode: false,
      }).then((resposta) => {
        expect(resposta.status).to.eq(400);
        expect(resposta.body.mensagens).to.include('RN0031: só há 5 unidade(s) de Anti em estoque.');
      });
    });
  });

  it('RN0031 - o servidor recusa passar do estoque somando o que já está no carrinho', () => {
    cy.adicionarAoCarrinho('Heroes & Villains', 8);

    cy.discoPorTitulo('Heroes & Villains').then((disco) => {
      cy.visit(`/disco/${disco.id}`);
    });
    cy.intercept('POST', '**/api/estoque/disponibilidade').as('disponibilidade');
    cy.get('[data-testid="disco-compra"] [data-testid="btn-adicionar-carrinho"]').click();

    cy.wait('@disponibilidade').its('response.statusCode').should('eq', 400);
    cy.get('[data-testid="alerta-carrinho"]').should('contain', 'RN0031');
    cy.get('[data-testid="contador-carrinho"]').should('have.text', '8');
  });
});
