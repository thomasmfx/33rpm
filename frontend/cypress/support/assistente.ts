/// <reference types="cypress" />
import { diaQuinze } from './analise';

/** Depois do /dev/reset: Ana é o cliente 1, com o endereço 1 e o Visa 1; Bruno é o 2, sem cartão. */
const COMPRADORES = {
  ana: { clienteId: 1, enderecoId: 1 },
  bruno: { clienteId: 2, enderecoId: 2 },
} as const;

export type Comprador = keyof typeof COMPRADORES;

export const BRUNO = {
  email: 'bruno.tavares@email.com',
  senha: 'Senha@123',
  nome: 'Bruno Tavares',
};

/**
 * Históricos distintos para o assistente: a Ana compra rap, o Bruno compra rock. Uma compra
 * por mês, da mais antiga para a mais recente; cada compra a partir da segunda vira um
 * exemplo de treino, então são 10 exemplos de vendas.
 */
export const HISTORICO_ANA = [
  'Illmatic',
  'The Score',
  'Late Registration',
  'Damn',
  'Stankonia',
  '2014 Forest Hills Drive',
];
export const HISTORICO_BRUNO = [
  'The Dark Side Of The Moon',
  'Are You Experienced',
  'AM',
  'OK Computer',
  'Maggot Brain',
  'Mezmerize',
];

/** A demonstração usa outros discos, sem repetir os da regressão: soul para a Ana, rock para o Bruno. */
export const DEMONSTRACAO_ANA = [
  'Songs In The Key Of Life',
  'Back To Black',
  'The Miseducation Of Lauryn Hill',
  'Channel Orange',
  'Awaken, My Love!',
  'Igor',
];
export const DEMONSTRACAO_BRUNO = [
  'Ride The Lightning',
  'Metallica',
  'Favourite Worst Nightmare',
  'The Slow Rush',
  'Pet Sounds',
  'Rita Lee',
];

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      compraEntregue(comprador: Comprador, titulo: string, mesesAtras: number): Chainable<number>;
      historicosDoAssistente(): Chainable<void>;
      historicosDaDemonstracao(): Chainable<void>;
      modoSimulado(): Chainable<boolean>;
      abrirAssistente(): Chainable<void>;
      perguntarAoAssistente(pergunta: string): Chainable<JQuery<HTMLElement>>;
      conversarPelaApi(clienteId: number, mensagem: string): Chainable<number>;
      avaliarPelaApi(interacaoId: number, util: boolean): Chainable<void>;
      concluirTreinos(): Chainable<void>;
    }
  }
}

const API = () => Cypress.env('apiUrl');

/** O Bruno não tem cartão no perfil: paga com um novo, que a operadora aceita, sem salvar. */
const CARTAO_DO_BRUNO = {
  numero: '4111111111111111',
  nomeImpresso: 'BRUNO TAVARES',
  codigoSeguranca: '123',
  bandeira: { desc: 'Visa' },
};

/** Compra de um disco pela API, entregue e datada no dia 15 do mês, como a CargaVendas faz. */
Cypress.Commands.add('compraEntregue', (comprador: Comprador, titulo: string, mesesAtras: number) =>
  cy.discoPorTitulo(titulo).then((disco) => {
    const corpo = { ...COMPRADORES[comprador], itens: [{ discoId: disco.id, quantidade: 1 }] };
    return cy
      .request('POST', `${API()}/pedidos/cotacao`, corpo)
      .its('body.restante')
      .then((restante: number) => {
        const pagamento =
          comprador === 'ana'
            ? { cartaoId: 1, valor: restante }
            : { cartaoNovo: CARTAO_DO_BRUNO, valor: restante };
        return cy
          .request('POST', `${API()}/pedidos`, { ...corpo, pagamentos: [pagamento] })
          .its('body.id');
      })
      .then((id: number) => {
        cy.validarPagamentos();
        cy.avancarPedido(id, 'EM TRANSPORTE');
        cy.avancarPedido(id, 'ENTREGUE');
        cy.retroagirPedido(id, diaQuinze(mesesAtras));
        return cy.wrap(id);
      });
  }),
);

function historicos(ana: string[], bruno: string[]) {
  ana.forEach((titulo, i) => cy.compraEntregue('ana', titulo, ana.length - i));
  bruno.forEach((titulo, i) => cy.compraEntregue('bruno', titulo, bruno.length - i));
}

Cypress.Commands.add('historicosDoAssistente', () => historicos(HISTORICO_ANA, HISTORICO_BRUNO));

Cypress.Commands.add('historicosDaDemonstracao', () =>
  historicos(DEMONSTRACAO_ANA, DEMONSTRACAO_BRUNO),
);

/** Com o Vertex AI configurado, treinar cria um job de verdade, com custo e dezenas de minutos. */
Cypress.Commands.add('modoSimulado', () =>
  cy
    .request<{ modeloBase: string }>(`${API()}/assistente/situacao`)
    .its('body.modeloBase')
    .then((modeloBase) => modeloBase === 'simulado'),
);

Cypress.Commands.add('abrirAssistente', () => {
  cy.get('button[aria-label="Abrir assistente de recomendação"]').click();
});

/** Manda a pergunta pelo chat e devolve a resposta nova da IA. */
Cypress.Commands.add('perguntarAoAssistente', (pergunta: string) => {
  cy.document().then((documento) => {
    const antes = documento.querySelectorAll('[data-testid="resposta-assistente"]').length;
    cy.get('[data-testid="chat-mensagem"]').type(pergunta);
    cy.get('[data-testid="chat-enviar"]').click();
    // o Gemini leva alguns segundos; o modo simulado responde na hora
    cy.get('[data-testid="resposta-assistente"]', { timeout: 60000 }).should(
      'have.length',
      antes + 1,
    );
  });
  return cy.get('[data-testid="resposta-assistente"]').last();
});

Cypress.Commands.add('conversarPelaApi', (clienteId: number, mensagem: string) =>
  cy
    .request('POST', `${API()}/assistente/mensagens`, { clienteId, mensagem, historico: [] })
    .its('body.id'),
);

Cypress.Commands.add('avaliarPelaApi', (interacaoId: number, util: boolean) => {
  cy.request('PUT', `${API()}/assistente/interacoes/${interacaoId}/avaliacao`, { isUtil: util });
});

/**
 * Os treinos não saem no /dev/reset (não têm cliente nem disco). No modo simulado, a
 * consulta conclui o que estiver em andamento, e o próximo teste pode treinar de novo.
 */
Cypress.Commands.add('concluirTreinos', () => {
  cy.request('POST', `${API()}/assistente/treinamentos/acompanhamento`);
});

export {};
