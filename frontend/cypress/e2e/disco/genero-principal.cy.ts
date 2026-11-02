/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

interface CategoriaApi {
  desc: string;
  tipo: string;
}

const HIP_HOP = { desc: 'Hip Hop', tipo: 'genero' };
const FUNK_SOUL = { desc: 'Funk / Soul', tipo: 'genero' };

function cadastrar(extra: Record<string, unknown>) {
  return cy.fixture('disco').then(({ semEstoque }) =>
    cy.request({
      method: 'POST',
      url: `${API()}/discos`,
      body: { ...semEstoque, ...extra },
      failOnStatusCode: false,
    }),
  );
}

// o cabeçalho fixo do modal cobre o campo que o Cypress rola até o topo
describe('Gênero principal do disco (RN0071)', { scrollBehavior: 'center' }, () => {
  it('RN0071 - com um gênero só, ele é o principal', () => {
    cadastrar({}).then((resposta) => {
      expect(resposta.status).to.eq(201);
      expect(resposta.body.generoPrincipal.desc).to.eq('Hip Hop');
    });
  });

  it('RN0071 - com mais de um gênero, o cadastro precisa informar o principal', () => {
    cadastrar({ categorias: [HIP_HOP, FUNK_SOUL] }).then((resposta) => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.mensagens).to.deep.eq(['Informe o gênero principal do disco.']);
    });
  });

  it('RN0071 - o principal precisa estar entre os gêneros do disco', () => {
    cadastrar({
      categorias: [HIP_HOP, FUNK_SOUL],
      generoPrincipal: { desc: 'Rock', tipo: 'genero' },
    }).then((resposta) => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.mensagens).to.deep.eq([
        'O gênero principal precisa estar entre os gêneros do disco.',
      ]);
    });
  });

  it('RN0071 - grava o principal escolhido entre vários gêneros', () => {
    cadastrar({ categorias: [HIP_HOP, FUNK_SOUL], generoPrincipal: FUNK_SOUL }).then((resposta) => {
      expect(resposta.status).to.eq(201);
      expect(resposta.body.generoPrincipal.desc).to.eq('Funk / Soul');
    });
    cy.discoPorTitulo('Disco de Teste')
      .its('generoPrincipal.desc')
      .should('eq', 'Funk / Soul');
  });

  it('RN0071 - na tela, o primeiro gênero escolhido vira o principal e pode ser trocado', () => {
    cy.intercept('POST', '**/api/discos').as('cadastrarDisco');
    cy.entrarComoAdministrador('/curadoria/inventario');
    cy.get('[data-testid="btn-novo-disco"]').click();

    cy.get('[data-testid="disco-genero-principal"]').should('be.disabled');

    cy.fixture('disco').then(({ takeCare }) => {
      cy.preencherDisco(takeCare);
      cy.get('[data-testid="disco-genero-principal"]')
        .should('not.be.disabled')
        .and('have.value', 'Hip Hop');

      // a lista de gêneros do MultiSelect segue montada e escondida, com a mesma opção
      cy.get('[data-testid="disco-genero-principal"]').click();
      cy.contains('[role="option"]:visible', 'Funk / Soul').click();
      cy.get('[data-testid="btn-salvar-disco"]').click();
      cy.wait('@cadastrarDisco').its('response.statusCode').should('eq', 201);

      cy.request(`${API()}/discos?titulo=Take Care`)
        .its('body.0')
        .then((disco) => {
          const generos = (disco.categorias as CategoriaApi[]).filter((c) => c.tipo === 'genero');
          expect(generos.map((c) => c.desc)).to.have.members(['Hip Hop', 'Funk / Soul']);
          expect(disco.generoPrincipal.desc).to.eq('Funk / Soul');
        });
    });
  });
});
