/// <reference types="cypress" />
import type { ItemDaCompra } from './commands';

export type StatusDaVenda = 'REPROVADA' | 'APROVADA' | 'EM TRANSPORTE' | 'ENTREGUE';

export interface VendaDeTeste {
  /** Quem comprou na carga do backend; nos testes a Ana compra tudo, e a análise não vê quem. */
  cliente?: string;
  itens: ItemDaCompra[];
  /** Meses antes do atual; a compra fica no dia 15, para nunca cair depois de hoje. */
  mesesAtras: number;
  status: StatusDaVenda;
}

/** Valor por categoria e por mês ('MM/yyyy'), como a tela mostra. */
export type VendasPorCategoria = Record<string, Record<string, number>>;

interface ConsultaDaTela {
  /** yyyy-mm-dd */
  inicio: string;
  fim: string;
  categorias: string[];
}

interface DiscoDaBase {
  id: number;
  generoPrincipal: { desc: string };
}

interface PedidoDaBase {
  dataCadastro: string;
  status: { descricao: string };
  itens: { discoId: number; precoUnitario: number; quantidade: number }[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      registrarVenda(venda: VendaDeTeste): Chainable<number>;
      registrarVendas(): Chainable<void>;
      retroagirPedido(id: number, data: string): Chainable<void>;
      abrirAnalise(): Chainable<void>;
      consultarAnalise(consulta: ConsultaDaTela): Chainable<void>;
      conferirAnalise(esperado: VendasPorCategoria): Chainable<void>;
      vendasDaBase(categorias: string[], inicio: string, fim: string): Chainable<VendasPorCategoria>;
    }
  }
}

const API = () => Cypress.env('apiUrl');

const CARTAO_RECUSADO = {
  numero: '4000000000000002',
  nomeImpresso: 'ANA P RIBEIRO',
  codigoSeguranca: '123',
  bandeira: { desc: 'Visa' },
};

function doisDigitos(numero: number): string {
  return String(numero).padStart(2, '0');
}

function primeiroDiaDoMes(mesesAtras: number): Date {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 1);
}

function iso(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

export function primeiroDia(mesesAtras: number): string {
  return iso(primeiroDiaDoMes(mesesAtras));
}

export function ultimoDia(mesesAtras: number): string {
  const inicio = primeiroDiaDoMes(mesesAtras);
  return iso(new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0));
}

export function diaQuinze(mesesAtras: number): string {
  return primeiroDia(mesesAtras).replace(/-01$/, '-15');
}

/** O rótulo de mês que a tabela da tela usa, 'MM/yyyy'. */
export function rotuloDoMes(mesesAtras: number): string {
  const inicio = primeiroDiaDoMes(mesesAtras);
  return `${doisDigitos(inicio.getMonth() + 1)}/${inicio.getFullYear()}`;
}

export function paraBR(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function rotuloDe(dataIso: string): string {
  return paraBR(dataIso).slice(3);
}

/** Todos os meses tocados pelo período, no rótulo 'MM/yyyy'. */
function mesesEntre(inicio: string, fim: string): string[] {
  const [anoInicial, mesInicial] = inicio.split('-').map(Number);
  const [anoFinal, mesFinal] = fim.split('-').map(Number);
  const meses: string[] = [];
  for (let ano = anoInicial, mes = mesInicial; ano < anoFinal || (ano === anoFinal && mes <= mesFinal); ) {
    meses.push(`${doisDigitos(mes)}/${ano}`);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return meses;
}

/** O banco carimba a compra com a hora de agora: a análise precisa dela em outro mês. */
Cypress.Commands.add('retroagirPedido', (id: number, data: string) => {
  cy.request('POST', `${API()}/dev/pedidos/${id}/data?data=${data}`);
});

/** Compra reprovada: a operadora recusa o cartão e a compra nunca vira venda. */
function comprarReprovada(itens: ItemDaCompra[]): Cypress.Chainable<number> {
  const ids: { discoId: number; quantidade: number }[] = [];
  itens.forEach(({ titulo, quantidade }) =>
    cy.discoPorTitulo(titulo).then((disco) => ids.push({ discoId: disco.id, quantidade })),
  );
  return cy.then(() => {
    const corpo = { clienteId: 1, itens: ids, enderecoId: 1 };
    return cy
      .request('POST', `${API()}/pedidos/cotacao`, corpo)
      .its('body.restante')
      .then((restante: number) =>
        cy
          .request('POST', `${API()}/pedidos`, {
            ...corpo,
            pagamentos: [{ cartaoNovo: CARTAO_RECUSADO, valor: restante }],
          })
          .its('body.id'),
      );
  });
}

/** Compra da Ana levada até o status pedido e datada no dia 15 do mês da venda. */
Cypress.Commands.add('registrarVenda', (venda: VendaDeTeste) => {
  const comprar =
    venda.status === 'REPROVADA' ? comprarReprovada(venda.itens) : cy.comprarPelaApi(venda.itens);

  return comprar.then((id) => {
    cy.validarPagamentos();
    if (venda.status === 'EM TRANSPORTE' || venda.status === 'ENTREGUE') {
      cy.avancarPedido(id, 'EM TRANSPORTE');
    }
    if (venda.status === 'ENTREGUE') {
      cy.avancarPedido(id, 'ENTREGUE');
    }
    cy.retroagirPedido(id, diaQuinze(venda.mesesAtras));
    return cy.wrap(id);
  });
});

/**
 * A massa da análise: várias categorias, vários meses e todos os status. É o arquivo que o
 * backend carrega na subida (CargaVendas), então a demonstração e os testes mostram o mesmo.
 */
Cypress.Commands.add('registrarVendas', () => {
  cy.readFile<VendaDeTeste[]>('../backend/src/main/resources/carga/vendas.json').then((vendas) => {
    vendas.forEach((venda) => cy.registrarVenda(venda));
  });
});

/** O dashboard consulta sozinho ao abrir: a tabela já na tela é o sinal de que carregou. */
Cypress.Commands.add('abrirAnalise', () => {
  cy.entrarComoAdministrador('/curadoria/dashboard');
  cy.get('[data-testid="tabela-vendas"]').should('exist');
});

Cypress.Commands.add('consultarAnalise', ({ inicio, fim, categorias }: ConsultaDaTela) => {
  cy.intercept('GET', '**/analises/vendas*').as('consulta');
  cy.get('[data-testid="analise-inicio"]').clear().type(paraBR(inicio)).blur();
  cy.get('[data-testid="analise-fim"]').clear().type(paraBR(fim)).blur();
  cy.get('[data-testid="categoria-analise"]').each(($categoria) => {
    const desejada = categorias.includes($categoria.attr('data-categoria') as string);
    const marcada = $categoria.attr('aria-pressed') === 'true';
    if (desejada !== marcada) cy.wrap($categoria).click();
  });
  cy.get('[data-testid="btn-consultar-analise"]').click();
  cy.wait('@consulta');
});

/** Compara com data-valor, o número cru, e não com o texto em reais da célula. */
Cypress.Commands.add('conferirAnalise', (esperado: VendasPorCategoria) => {
  const categorias = Object.keys(esperado);
  const meses = Object.keys(esperado[categorias[0]]);

  cy.get('[data-testid="tabela-vendas"] tbody tr').should('have.length', meses.length);
  cy.get('[data-testid="tabela-vendas"] thead th[scope="col"]').should(
    'have.length',
    categorias.length + 1,
  );
  categorias.forEach((categoria) =>
    meses.forEach((mes) =>
      cy
        .get(
          `[data-testid="tabela-vendas"] td[data-categoria="${categoria}"][data-periodo="${mes}"]`,
        )
        .should(($celula) => {
          expect(Number($celula.attr('data-valor')), `${categoria} em ${mes}`).to.eq(
            esperado[categoria][mes],
          );
        }),
    ),
  );
});

/**
 * O que a tela deve mostrar, lido da base: só compra ENTREGUE, pela data da compra, no
 * gênero principal do disco. O período filtra por dia; o mês de borda vem parcial.
 */
Cypress.Commands.add('vendasDaBase', (categorias: string[], inicio: string, fim: string) =>
  cy
    .request<DiscoDaBase[]>(`${API()}/discos`)
    .its('body')
    .then((discos) =>
      cy
        .request<PedidoDaBase[]>(`${API()}/pedidos`)
        .its('body')
        .then((pedidos) => {
          const principal = new Map(discos.map((disco) => [disco.id, disco.generoPrincipal.desc]));
          const esperado: VendasPorCategoria = {};
          categorias.forEach((categoria) => {
            esperado[categoria] = Object.fromEntries(mesesEntre(inicio, fim).map((mes) => [mes, 0]));
          });

          for (const pedido of pedidos) {
            const dia = pedido.dataCadastro.slice(0, 10);
            if (pedido.status.descricao !== 'ENTREGUE' || dia < inicio || dia > fim) continue;
            for (const item of pedido.itens) {
              const categoria = principal.get(item.discoId);
              if (categoria && categoria in esperado) {
                esperado[categoria][rotuloDe(dia)] += item.precoUnitario * item.quantidade;
              }
            }
          }

          for (const porMes of Object.values(esperado)) {
            for (const mes of Object.keys(porMes)) {
              porMes[mes] = Math.round(porMes[mes] * 100) / 100;
            }
          }
          return esperado;
        }),
    ),
);

export {};
