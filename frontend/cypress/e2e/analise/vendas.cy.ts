/// <reference types="cypress" />
import { diaQuinze, primeiroDia, rotuloDoMes, ultimoDia } from '../../support/analise';

export {};

const API = () => Cypress.env('apiUrl');

interface VendasApi {
  meses: string[];
  series: { categoria: string; valores: number[] }[];
}

// o que a massa de fixtures/vendas.json vende de ENTREGUE, de seis meses atrás a um mês atrás
const ESPERADO_POR_CATEGORIA: Record<string, number[]> = {
  Rock: [299, 289, 578, 0, 329, 0],
  'Hip Hop': [0, 668, 0, 399, 0, 339],
  Electronic: [0, 369, 429, 0, 389, 0],
  'Funk / Soul': [0, 0, 0, 379, 0, 319],
  Jazz: [0, 0, 0, 0, 0, 0],
};

function consultar(inicio: string | null, fim: string | null, categorias: string[]) {
  const parametros = new URLSearchParams();
  if (inicio) parametros.set('inicio', inicio);
  if (fim) parametros.set('fim', fim);
  categorias.forEach((categoria) => parametros.append('categorias', categoria));
  return cy.request({
    url: `${API()}/analises/vendas?${parametros}`,
    failOnStatusCode: false,
  });
}

function chaveDoMes(mesesAtras: number): string {
  const [mes, ano] = rotuloDoMes(mesesAtras).split('/');
  return `${ano}-${mes}`;
}

describe('Análise de vendas por categoria (RF0055, RN0071 a RN0074, RNF0011)', () => {
  it('RF0055, RN0071 e RN0074 - soma só as compras ENTREGUE, por mês e gênero principal', () => {
    cy.registrarVendas();

    consultar(primeiroDia(6), ultimoDia(1), Object.keys(ESPERADO_POR_CATEGORIA)).then(
      (resposta) => {
        expect(resposta.status).to.eq(200);
        const vendas: VendasApi = resposta.body;
        expect(vendas.meses).to.deep.eq([6, 5, 4, 3, 2, 1].map(chaveDoMes));
        expect(vendas.series.map((serie) => serie.categoria)).to.deep.eq(
          Object.keys(ESPERADO_POR_CATEGORIA),
        );
        vendas.series.forEach((serie) => {
          expect(serie.valores, serie.categoria).to.deep.eq(ESPERADO_POR_CATEGORIA[serie.categoria]);
        });
      },
    );
  });

  it('RN0073 - categoria sem venda aparece com R$ 0,00 em todos os meses', () => {
    consultar(primeiroDia(6), ultimoDia(1), ['Rock']).then((resposta) => {
      expect(resposta.status).to.eq(200);
      expect(resposta.body.meses).to.have.length(6);
      expect(resposta.body.series).to.have.length(1);
      expect(resposta.body.series[0].valores).to.deep.eq([0, 0, 0, 0, 0, 0]);
    });
  });

  it('RF0055 - o período filtra por dia: o mês de borda traz só as vendas dentro dele', () => {
    cy.registrarVendas();

    // Dark Side Of The Moon (299) foi comprado no dia 15 de seis meses atrás
    const diaDaVenda = diaQuinze(6);
    const diaSeguinte = diaDaVenda.replace(/15$/, '16');
    consultar(diaDaVenda, ultimoDia(6), ['Rock'])
      .its('body.series.0.valores.0')
      .should('eq', 299);
    consultar(diaSeguinte, ultimoDia(6), ['Rock'])
      .its('body.series.0.valores.0')
      .should('eq', 0);

    // Pet Sounds, duas cópias (578), no dia 15 de quatro meses atrás: o dia de fim entra inteiro
    consultar(primeiroDia(4), diaQuinze(4), ['Rock'])
      .its('body.series.0.valores.0')
      .should('eq', 578);
    consultar(primeiroDia(4), diaQuinze(4).replace(/15$/, '14'), ['Rock'])
      .its('body.series.0.valores.0')
      .should('eq', 0);
  });

  it('RN0074 - compra que passa a ENTREGUE entra na consulta seguinte', () => {
    cy.registrarVenda({
      itens: [{ titulo: 'Songs In The Key Of Life', quantidade: 1 }],
      mesesAtras: 2,
      status: 'EM TRANSPORTE',
    }).then((id) => {
      consultar(primeiroDia(2), ultimoDia(2), ['Funk / Soul'])
        .its('body.series.0.valores.0')
        .should('eq', 0);

      cy.avancarPedido(id, 'ENTREGUE');

      consultar(primeiroDia(2), ultimoDia(2), ['Funk / Soul'])
        .its('body.series.0.valores.0')
        .should('eq', 379);
    });
  });

  it('RN0072 - aceita de 1 a 24 meses e recusa 25', () => {
    consultar(primeiroDia(0), ultimoDia(0), ['Rock']).its('status').should('eq', 200);
    consultar(primeiroDia(23), ultimoDia(0), ['Rock'])
      .its('body.meses')
      .should('have.length', 24);

    consultar(primeiroDia(24), ultimoDia(0), ['Rock']).then((resposta) => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.mensagens).to.deep.eq([
        'O período deve ter no máximo 24 meses (selecionou 25).',
      ]);
    });
  });

  it('RF0056 e RF0055 - recusa fim antes do início e datas ausentes', () => {
    consultar(ultimoDia(1), primeiroDia(3), ['Rock']).then((resposta) => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.mensagens).to.deep.eq([
        'A data de fim não pode ser anterior à de início.',
      ]);
    });

    consultar(null, null, ['Rock']).then((resposta) => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.mensagens).to.deep.eq([
        'Informe a data de início e a data de fim.',
      ]);
    });
  });

  it('RF0057 e RNF0013 - exige categoria, e ela precisa ser um gênero do acervo', () => {
    consultar(primeiroDia(3), ultimoDia(1), []).then((resposta) => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.mensagens).to.deep.eq(['Selecione ao menos uma categoria.']);
    });

    consultar(primeiroDia(3), ultimoDia(1), ['Rock', 'Polka']).then((resposta) => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.mensagens).to.deep.eq([
        'Categoria Polka não registrada no sistema.',
      ]);
    });
  });

  it('RNF0011 - 24 meses e todas as categorias respondem em menos de 1 segundo', () => {
    cy.registrarVendas();
    const categorias = Object.keys(ESPERADO_POR_CATEGORIA);

    consultar(primeiroDia(23), ultimoDia(0), categorias).its('status').should('eq', 200);
    for (let tentativa = 0; tentativa < 3; tentativa += 1) {
      consultar(primeiroDia(23), ultimoDia(0), categorias)
        .its('duration')
        .should('be.lessThan', 1000);
    }
  });
});
