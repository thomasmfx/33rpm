/// <reference types="cypress" />

import { BRUNO } from '../../support/commands';

const API = () => Cypress.env('apiUrl');

interface CarrinhoApi {
  itens: { discoId: number; quantidade: number }[];
  expirados: { discoId: number; quantidade: number }[];
  segundosParaExpirar?: number;
}

const incluir = (clienteId: number, discoId: number, quantidade: number) =>
  cy.request<CarrinhoApi>('POST', `${API()}/carrinhos/${clienteId}/itens`, { discoId, quantidade });

const carrinho = (clienteId: number) =>
  cy.request<CarrinhoApi>(`${API()}/carrinhos/${clienteId}`).its('body');

describe('Bloqueio do carrinho (RN0044, RN0045, RNF0042, RN0032)', () => {
  it('RN0044 - o que está no carrinho de um cliente não pode ser incluído por outro', () => {
    cy.discoPorTitulo('2014 Forest Hills Drive').then((disco) => {
      incluir(1, disco.id, disco.estoque - 1);

      cy.entrarComoCliente(`/disco/${disco.id}`, BRUNO);
      cy.get('[data-testid="disco-compra"]').within(() => {
        cy.get('[data-testid="quantidade-aumentar"]').click();
        cy.get('[data-testid="btn-adicionar-carrinho"]').click();
      });
      cy.get('[data-testid="alerta-carrinho"]').should(
        'contain',
        'RN0044: só há 1 unidade(s) livre(s) de 2014 Forest Hills Drive',
      );
      cy.get('[data-testid="contador-carrinho"]').should('have.text', '0');
    });
  });

  it('RN0044 e RN0045 - o prazo conta da última inclusão e, vencido, tira todos os itens juntos', () => {
    cy.discoPorTitulo('The Melodic Blue').then((primeiro) => {
      cy.discoPorTitulo('What A Time To Be Alive').then((segundo) => {
        incluir(1, primeiro.id, 1);
        cy.envelhecerCarrinho(1, 10);
        incluir(1, segundo.id, 2).its('body.segundosParaExpirar').should('be.greaterThan', 890);

        // o primeiro tem 16 minutos, mas a última inclusão, só 6: nada vence
        cy.envelhecerCarrinho(1, 6);
        carrinho(1).its('itens').should('have.length', 2);

        cy.envelhecerCarrinho(1, 10);
        carrinho(1).then((vencido) => {
          expect(vencido.itens).to.have.length(0);
          expect(
            vencido.expirados.map(({ discoId, quantidade }) => ({ discoId, quantidade })),
          ).to.deep.eq([
            { discoId: primeiro.id, quantidade: 1 },
            { discoId: segundo.id, quantidade: 2 },
          ]);
        });
      });
    });
  });

  it('RN0044 - aumentar a quantidade no carrinho bloqueia o acréscimo e renova o prazo (CDU03 A1.3)', () => {
    cy.discoPorTitulo('My Beautiful Dark Twisted Fantasy').then((disco) => {
      incluir(1, disco.id, 1);
      cy.envelhecerCarrinho(1, 10);
      carrinho(1).its('segundosParaExpirar').should('be.lessThan', 310);

      cy.request<CarrinhoApi>('PUT', `${API()}/carrinhos/1/itens/${disco.id}`, { quantidade: 2 })
        .its('body.segundosParaExpirar')
        .should('be.greaterThan', 890);
      cy.request({
        method: 'POST',
        url: `${API()}/estoque/disponibilidade`,
        body: { clienteId: 2, itens: [{ discoId: disco.id, quantidade: disco.estoque - 1 }] },
        failOnStatusCode: false,
      })
        .its('status')
        .should('eq', 400);
    });
  });

  it('RN0044 - reduzir a quantidade no carrinho não renova o prazo', () => {
    cy.discoPorTitulo('Is This It').then((disco) => {
      incluir(1, disco.id, 2);
      cy.envelhecerCarrinho(1, 10);

      cy.request<CarrinhoApi>('PUT', `${API()}/carrinhos/1/itens/${disco.id}`, { quantidade: 1 })
        .its('body.segundosParaExpirar')
        .should('be.within', 1, 310);
    });
  });

  it('RNF0042 - dispensar os itens expirados libera a compra do que ficou', () => {
    cy.discoPorTitulo('Birds In The Trap Sing McKnight').then((disco) => {
      incluir(1, disco.id, 1);
      cy.envelhecerCarrinho(1, 16);
      cy.entrarComoCliente('/carrinho');
      cy.get('[data-testid="alerta-expirados"]').should('contain', 'Birds In The Trap Sing McKnight');
      cy.get('[data-testid="btn-dispensar-expirados"]').click();
      cy.get('[data-testid="alerta-expirados"]').should('not.exist');
      carrinho(1).its('expirados').should('have.length', 0);
    });
  });

  it('RN0032 - disco inativado entre a inclusão e a compra sai do carrinho com aviso', () => {
    cy.entrarComoCliente('/');
    cy.adicionarAoCarrinho('Metallica', 1);
    cy.adicionarAoCarrinho('Awaken, My Love!', 1);
    cy.discoPorTitulo('Metallica').then((disco) => {
      cy.request('PUT', `${API()}/discos/${disco.id}/inativacao`, {
        motivoStatus: {
          categoria: { desc: 'BAIXA DEMANDA' },
          justificativa: 'Retirado do catálogo pela gravadora.',
        },
      });
    });

    cy.get('[data-testid="link-carrinho"]').click();
    cy.get('[data-testid="btn-finalizar-compra"]').click();
    cy.get('[data-testid="alerta-ajustes"]').should(
      'contain',
      'RN0032: Metallica saiu do carrinho: não está mais disponível.',
    );
    cy.location('pathname').should('eq', '/carrinho');
    cy.get('[data-testid="item-carrinho"]').should('have.length', 1).and('contain', 'Awaken, My Love!');

    cy.get('[data-testid="btn-finalizar-compra"]').click();
    cy.location('pathname').should('eq', '/checkout');
  });
});
