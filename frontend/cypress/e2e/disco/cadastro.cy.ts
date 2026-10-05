/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

interface CategoriaApi {
  desc: string;
  tipo: string;
}

// o cabeçalho fixo do modal cobre o campo que o Cypress rola até o topo
describe('Cadastro de disco (RF0011, RN0011, RN0012, RNF0021)', { scrollBehavior: 'center' }, () => {
  beforeEach(() => {
    cy.entrarComoAdministrador('/curadoria/inventario');
    cy.get('[data-testid="btn-novo-disco"]').should('be.visible');
  });

  it('RF0011, RN0011, RN0012 e RNF0021 - cadastra o disco com os dados obrigatórios e código único', () => {
    cy.intercept('POST', '**/api/discos').as('cadastrarDisco');
    cy.fixture('disco').then(({ takeCare }) => {
      cy.get('[data-testid="btn-novo-disco"]').click();
      cy.preencherDisco(takeCare);
      cy.get('[data-testid="btn-salvar-disco"]').click();
      cy.wait('@cadastrarDisco').its('response.statusCode').should('eq', 201);

      // RNF0021: o acervo carregado ocupa DSC-000001 a DSC-000069
      cy.contains('[data-testid="disco-linha"]', 'Take Care').should(
        'have.attr',
        'data-codigo',
        'DSC-000070',
      );

      cy.request(`${API()}/discos?titulo=Take Care`)
        .its('body.0')
        .then((disco) => {
          // RN0013: sem entrada em estoque não há custo, então não há preço
          expect(disco).to.include({ codigo: 'DSC-000070', estoque: 0, precoVenda: 0, isAtivo: true });
          expect(disco).to.include({ peso: 480, numeroFaixas: 17, codigoBarras: '0602527867960' });
          expect(disco.artista.nome).to.eq('Drake');
          expect(disco.gravadora.nome).to.eq('Young Money / Cash Money');
          expect(disco.formato.nome).to.eq('2xLP');
          expect(disco.grupoPrecificacao.nome).to.eq('Importado');
          const categorias: CategoriaApi[] = disco.categorias;
          const generos = categorias.filter((c) => c.tipo === 'genero').map((c) => c.desc);
          const estilos = categorias.filter((c) => c.tipo === 'estilo').map((c) => c.desc);
          expect(generos, 'RN0012').to.have.members(['Hip Hop', 'Funk / Soul']);
          expect(estilos).to.have.members(['Contemporary R&B', 'Pop Rap']);
        });
    });
  });

  it('RN0011 e RN0012 - recusa disco sem os dados obrigatórios, na tela e no servidor', () => {
    cy.get('[data-testid="btn-novo-disco"]').click();
    cy.get('[data-testid="btn-salvar-disco"]').click();
    cy.contains('Informe o título').should('exist');

    cy.request({
      method: 'POST',
      url: `${API()}/discos`,
      body: { titulo: 'Sem dados' },
      failOnStatusCode: false,
    }).then((resposta) => {
      expect(resposta.status).to.eq(400);
      const mensagens: string[] = resposta.body.mensagens;
      expect(mensagens).to.include.members([
        'Informe o artista (RN0011).',
        'Informe a gravadora (RN0011).',
        'Selecione ao menos um gênero (RN0012).',
        'Informe o código de catálogo (RN0011).',
        'O código de barras deve ter 13 dígitos (RN0011).',
        'Informe a descrição (RN0011).',
        'Informe o peso em g (RN0011).',
      ]);
    });
    cy.request(`${API()}/discos?titulo=Sem dados`).its('body').should('have.length', 0);
  });

  it('RNF0021 - cada disco recebe um código diferente', () => {
    cy.cadastrarDiscoSemEstoque('Primeiro de teste').its('codigo').should('eq', 'DSC-000070');
    cy.cadastrarDiscoSemEstoque('Segundo de teste').its('codigo').should('eq', 'DSC-000071');
  });
});
