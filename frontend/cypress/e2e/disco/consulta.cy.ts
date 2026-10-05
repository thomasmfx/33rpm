/// <reference types="cypress" />

import type { DiscoApi } from '../../support/commands';

const API = () => Cypress.env('apiUrl');

function consultar(parametros: string) {
  return cy.request<DiscoApi[]>(`${API()}/discos?${parametros}`).its('body');
}

function titulos(discos: DiscoApi[]): string[] {
  return discos.map((disco) => disco.titulo).sort();
}

describe('Consulta de discos (RF0015)', () => {
  it('RF0015 - filtros isolados no servidor', () => {
    consultar('titulo=debi tirar').then((discos) =>
      expect(titulos(discos)).to.deep.eq(['Debí Tirar Más Fotos']),
    );
    consultar('artista=kendrick').then((discos) =>
      expect(titulos(discos)).to.deep.eq([
        'Damn',
        'Good Kid, M.A.A.D City (Deluxe Edition)',
        'To Pimp A Butterfly',
      ]),
    );
    consultar('codigo=DSC-000068').then((discos) => expect(titulos(discos)).to.deep.eq(['Stankonia']));
    consultar('status=inativos').then((discos) =>
      expect(titulos(discos)).to.deep.eq(['Not All Heroes Wear Capes', 'SOS']),
    );
    consultar('anoMin=1990&anoMax=1999').its('length').should('eq', 7);
  });

  it('RF0015 - filtros combinados no servidor', () => {
    consultar('categoria=hip hop&precoMax=300').then((discos) =>
      expect(titulos(discos)).to.deep.eq(['Illmatic', 'Let God Sort Em Out']),
    );
    consultar('artista=travis&precoMin=400').then((discos) => expect(titulos(discos)).to.deep.eq(['Utopia']));
    consultar('artista=kendrick&status=ativos&precoMax=350').then((discos) =>
      expect(titulos(discos)).to.deep.eq(['Damn']),
    );
  });

  it('RF0015 - a curadoria consulta pelos filtros e mostra só o que casa', () => {
    cy.entrarComoAdministrador('/curadoria/inventario');
    cy.get('[data-testid="disco-linha"]').should('have.length.greaterThan', 0);

    cy.get('[data-testid="btn-filtros"]').click();
    cy.get('[data-testid="filtro-artista"]').type('kendrick');
    cy.get('[data-testid="disco-linha"]').should('have.length', 3);

    cy.get('[data-testid="filtro-preco-max"]').type('350');
    cy.get('[data-testid="disco-linha"]').should('have.length', 1).and('contain', 'Damn');
  });
});
