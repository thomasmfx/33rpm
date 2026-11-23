/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

interface CategoriaApi {
  id: number;
  desc: string;
  tipo: 'genero' | 'estilo';
}

function categoria(desc: string, tipo: CategoriaApi['tipo']) {
  return cy
    .request<{ categorias: CategoriaApi[] }>(`${API()}/dominios`)
    .its('body.categorias')
    .then((lista: CategoriaApi[]) => {
      const encontrada = lista.find((item) => item.desc === desc && item.tipo === tipo);
      expect(encontrada, `${tipo} ${desc}`).to.not.eq(undefined);
      return encontrada as CategoriaApi;
    });
}

/**
 * Digita para filtrar: a lista é rolável e a opção pode estar fora da área visível. O
 * MultiSelect do Mantine deixa a lista do outro campo montada e escondida.
 */
function escolher(testId: string, opcao: string) {
  cy.get(`[data-testid="${testId}"]`).click().type(opcao);
  cy.contains('[role="option"]:visible', new RegExp(`^${opcao}$`)).click();
  cy.get(`[data-testid="${testId}"]`).blur();
}

describe('Assistente de recomendação: preferências do cliente (RNF0044)', () => {
  it('RNF0044 - a Ana declara gêneros e estilos preferidos em Minha conta', () => {
    cy.entrarComoCliente('/perfil');
    cy.contains('button', 'Preferências musicais').click();
    cy.contains('h2', 'Preferências musicais').should('be.visible');

    escolher('preferencias-generos', 'Rock');
    escolher('preferencias-estilos', 'Psychedelic Rock');
    cy.get('[data-testid="btn-salvar-preferencias"]').click();
    cy.get('[data-testid="aviso-preferencias"]').should('contain', 'Preferências salvas');
    cy.contains('button', 'Preferências musicais').should('contain', '2');

    cy.request(`${API()}/clientes/1`)
      .its('body.preferencias')
      .then((preferencias: CategoriaApi[]) => {
        expect(preferencias.map((item) => `${item.tipo}:${item.desc}`)).to.have.members([
          'genero:Rock',
          'estilo:Psychedelic Rock',
        ]);
      });

    cy.reload();
    cy.contains('button', 'Preferências musicais').click();
    cy.get('[data-testid="preferencias-generos"]').parent().should('contain', 'Rock');
  });

  it('RNF0044 - as preferências e as compras entram no perfil que a IA recebe', () => {
    categoria('Jazz', 'genero').then((jazz) =>
      categoria('Neo Soul', 'estilo').then((neoSoul) =>
        cy.request('PUT', `${API()}/clientes/1/preferencias`, {
          preferencias: [{ id: jazz.id }, { id: neoSoul.id }],
        }),
      ),
    );
    cy.compraEntregue('ana', 'Diamond Life', 2);
    cy.conversarPelaApi(1, 'Me recomenda algo').then((id) => cy.avaliarPelaApi(id, true));

    // a resposta útil vira exemplo de treino com o perfil exato que a IA viu
    cy.request(`${API()}/assistente/dataset`)
      .its('body')
      .then((jsonl: string) => {
        const exemplo = JSON.parse(jsonl.trim().split('\n').pop() as string);
        const instrucao: string = exemplo.systemInstruction.parts[0].text;
        expect(instrucao).to.match(/Gêneros e estilos preferidos: .*Jazz/);
        expect(instrucao).to.match(/Gêneros e estilos preferidos: .*Neo Soul/);
        expect(instrucao).to.contain('| Diamond Life | Sade |');
        expect(exemplo.contents[0].parts[0].text).to.eq('Me recomenda algo');
      });
  });

  it('RNF0044 - preferência fora do acervo é recusada', () => {
    cy.request({
      method: 'PUT',
      url: `${API()}/clientes/1/preferencias`,
      body: { preferencias: [{ id: 999999 }] },
      failOnStatusCode: false,
    }).then(({ status, body }) => {
      expect(status).to.eq(400);
      expect(body.mensagens).to.include('Escolha gêneros e estilos do acervo.');
    });
  });
});
