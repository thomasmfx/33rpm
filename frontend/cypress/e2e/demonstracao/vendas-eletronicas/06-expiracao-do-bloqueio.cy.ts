/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Gerenciar vendas eletrônicas', () => {
  it('6. Expiração do bloqueio no carrinho, com remoção dos itens e desativação do botão de compra', () => {
    cy.discoPorTitulo('Maggot Brain').then((disco) => {
      // o Bruno (cliente 2) pergunta se as 8 cópias estão livres para ele
      const oitoParaOBruno = () =>
        cy.request({
          method: 'POST',
          url: `${API()}/estoque/disponibilidade`,
          body: { clienteId: 2, itens: [{ discoId: disco.id, quantidade: 8 }] },
          failOnStatusCode: false,
        });

      cy.etapa('A Ana inclui 2 das 8 cópias de Maggot Brain no carrinho');
      expect(disco.estoque).to.eq(8);
      cy.entrarComoCliente('/');
      cy.adicionarAoCarrinho('Maggot Brain', 2);

      cy.etapa('RN0044: as 2 ficam bloqueadas — o Bruno não consegue levar as 8');
      oitoParaOBruno()
        .its('body.mensagens')
        .should(
          'include',
          'RN0044: só há 6 unidade(s) livre(s) de Maggot Brain; as demais estão reservadas em outras compras.',
        );

      cy.etapa('O carrinho mostra o prazo de 15 minutos, contado da última inclusão');
      cy.get('[data-testid="link-carrinho"]').click();
      cy.get('[data-testid="aviso-reserva"]')
        .should('contain', '14:')
        .and('not.have.attr', 'data-acabando');

      cy.etapa('RN0044: faltando 4 minutos, o cliente é avisado de que a reserva vai cair');
      cy.envelhecerCarrinho(1, 11);
      cy.reload();
      cy.get('[data-testid="aviso-reserva"]')
        .should('contain', 'Sua reserva está perto de cair')
        .and('have.attr', 'data-acabando');

      cy.etapa('RN0045: o prazo vence — os itens saem do carrinho e são desbloqueados');
      cy.envelhecerCarrinho(1, 5);
      cy.reload();

      cy.etapa('RNF0042: o carrinho mostra os itens removidos pelo prazo e não oferece a compra');
      cy.get('[data-testid="alerta-expirados"]')
        .should('contain', '15 minutos')
        .find('[data-testid="item-expirado"]')
        .should('have.length', 1)
        .and('contain', 'Maggot Brain · 2×');
      cy.get('[data-testid="contador-carrinho"]').should('have.text', '0');
      cy.get('[data-testid="btn-finalizar-compra"]').should('not.exist');
      oitoParaOBruno().its('status').should('eq', 200);

      cy.etapa('Com outro disco no carrinho, a compra continua desabilitada até resolver os expirados');
      cy.adicionarAoCarrinho('Michael', 1);
      cy.get('[data-testid="link-carrinho"]').click();
      cy.get('[data-testid="btn-finalizar-compra"]').should('be.disabled');
      cy.get('[data-testid="motivo-compra-bloqueada"]').should('be.visible');

      cy.etapa('RNF0042: incluídos de novo, os itens voltam ao carrinho e a compra é liberada');
      cy.get('[data-testid="btn-readicionar-expirados"]').click();
      cy.get('[data-testid="alerta-expirados"]').should('not.exist');
      cy.itemDoCarrinho('Maggot Brain')
        .find('[data-testid="quantidade-valor"]')
        .should('have.text', '2');
      cy.get('[data-testid="btn-finalizar-compra"]').should('be.enabled');
    });
  });
});
