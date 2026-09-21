import type { Cliente } from '../types/cliente';
import type { Disco } from '../types/disco';
import type { Pedido, StatusPedido } from '../types/pedido';
import { discosMock } from './discosMock';
import { calcularFrete, montarItensPedido, ultimosDigitos } from './checkout';

/**
 * Histórico gerado, não escrito à mão: o gráfico gerencial precisa de 24 meses
 * de vendas espalhadas por categoria, e isso à mão seriam milhares de linhas.
 *
 * O gerador é determinístico (LCG com semente fixa), então o acervo é sempre o
 * mesmo entre recarregamentos e o que você vê na apresentação é o que estava
 * lá quando você ensaiou.
 */
const SEMENTE = 33197;
const REFERENCIA = new Date('2026-08-23T12:00:00');
const MESES_DE_HISTORICO = 24;

function criarSorteio(semente: number) {
  let estado = semente;
  return () => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return estado / 2147483648;
  };
}

/**
 * Sorteio ponderado por categoria, não por disco. Sorteando disco direto, o
 * Hip Hop levava 63% das vendas só por ser 73% do acervo, e o gráfico gerencial
 * virava uma linha gigante com todas as outras rastejando no zero.
 *
 * O peso é a raiz da quantidade de discos: comprime a diferença entre as
 * categorias sem inverter para o absurdo de um disco de Jazz vender tanto
 * quanto os trinta e dois de Hip Hop somados.
 */
const CATEGORIAS_SORTEIO = (() => {
  const porGenero = new Map<string, Disco[]>();

  for (const disco of discosMock) {
    for (const genero of disco.genres) {
      const lista = porGenero.get(genero) ?? [];
      lista.push(disco);
      porGenero.set(genero, lista);
    }
  }

  return [...porGenero.values()].map((discos) => ({
    discos,
    peso: Math.sqrt(discos.length),
  }));
})();

const PESO_TOTAL_CATEGORIAS = CATEGORIAS_SORTEIO.reduce(
  (soma, grupo) => soma + grupo.peso,
  0,
);

function sortearDisco(sorteio: () => number): Disco {
  let alvo = sorteio() * PESO_TOTAL_CATEGORIAS;
  let escolhido = CATEGORIAS_SORTEIO[CATEGORIAS_SORTEIO.length - 1];

  for (const grupo of CATEGORIAS_SORTEIO) {
    alvo -= grupo.peso;
    if (alvo <= 0) {
      escolhido = grupo;
      break;
    }
  }

  return escolhido.discos[Math.floor(sorteio() * escolhido.discos.length)];
}

const DISTRIBUICAO_STATUS: { status: StatusPedido; peso: number }[] = [
  { status: 'ENTREGUE', peso: 62 },
  { status: 'EM TRÂNSITO', peso: 10 },
  { status: 'PAGAMENTO REALIZADO', peso: 9 },
  { status: 'EM PROCESSAMENTO', peso: 7 },
  { status: 'CANCELADO', peso: 5 },
  { status: 'TROCA SOLICITADA', peso: 3 },
  { status: 'TROCA ACEITA', peso: 2 },
  { status: 'ITEM ENVIADO', peso: 2 },
];

function sortearStatus(sorteio: () => number, mesesAtras: number): StatusPedido {
  // pedido recente ainda não teve tempo de ser entregue
  if (mesesAtras === 0) {
    const recentes: StatusPedido[] = [
      'EM PROCESSAMENTO',
      'PAGAMENTO REALIZADO',
      'EM TRÂNSITO',
    ];
    return recentes[Math.floor(sorteio() * recentes.length)];
  }

  const total = DISTRIBUICAO_STATUS.reduce((soma, item) => soma + item.peso, 0);
  let alvo = sorteio() * total;

  for (const item of DISTRIBUICAO_STATUS) {
    alvo -= item.peso;
    if (alvo <= 0) return item.status;
  }
  return 'ENTREGUE';
}

/** Só quem passou de EM PROCESSAMENTO já teve o pagamento validado (RN0038). */
const JA_VALIDADO: StatusPedido[] = [
  'PAGAMENTO REALIZADO',
  'EM TRÂNSITO',
  'ENTREGUE',
  'TROCA SOLICITADA',
  'TROCA ACEITA',
  'TROCA NEGADA',
  'ITEM ENVIADO',
  'ITEM RECEBIDO',
];

export function gerarPedidos(clientes: Cliente[]): Pedido[] {
  const sorteio = criarSorteio(SEMENTE);
  const pedidos: Pedido[] = [];
  let sequencia = 0;

  for (let mesesAtras = MESES_DE_HISTORICO - 1; mesesAtras >= 0; mesesAtras--) {
    // o volume cresce ao longo do tempo, para a linha do gráfico ter formato
    const base = 3 + Math.floor((MESES_DE_HISTORICO - mesesAtras) / 6);
    const quantidade = base + Math.floor(sorteio() * 4);

    for (let i = 0; i < quantidade; i++) {
      const cliente = clientes[Math.floor(sorteio() * clientes.length)];
      const endereco =
        cliente.enderecos.find(
          (candidato) =>
            candidato.tipo === 'entrega' || candidato.tipo === 'ambos',
        ) ?? cliente.enderecos[0];
      if (!endereco) continue;

      const data = new Date(REFERENCIA);
      data.setMonth(data.getMonth() - mesesAtras);
      data.setDate(1 + Math.floor(sorteio() * 27));

      const quantidadeItens = 1 + Math.floor(sorteio() * 3);
      const escolhidos = new Map<number, number>();
      for (let j = 0; j < quantidadeItens; j++) {
        const disco = sortearDisco(sorteio);
        escolhidos.set(disco.id, (escolhidos.get(disco.id) ?? 0) + 1);
      }

      const itens = [...escolhidos.entries()].map(([discoId, qtd]) => ({
        disco: discosMock.find((disco) => disco.id === discoId)!,
        quantidade: qtd,
      }));

      const subtotal =
        Math.round(
          itens.reduce(
            (soma, item) => soma + item.disco.price * item.quantidade,
            0,
          ) * 100,
        ) / 100;
      const frete = calcularFrete(itens, endereco);
      const total = Math.round((subtotal + frete) * 100) / 100;

      const cartao = cliente.cartoes.find((c) => c.isPreferencial) ?? cliente.cartoes[0];
      sequencia += 1;
      const status = sortearStatus(sorteio, mesesAtras);
      const emTroca =
        status === 'TROCA SOLICITADA' ||
        status === 'TROCA ACEITA' ||
        status === 'ITEM ENVIADO';

      pedidos.push({
        id: `ped-h${String(sequencia).padStart(4, '0')}`,
        clienteId: cliente.id,
        data: data.toISOString(),
        itens: montarItensPedido(itens),
        enderecoEntrega: endereco,
        subtotal,
        frete,
        total,
        cupons: [],
        cartoes: cartao
          ? [
              {
                cartaoId: cartao.id,
                bandeira: cartao.bandeira,
                ultimosDigitos: ultimosDigitos(cartao.numero),
                valor: total,
              },
            ]
          : [],
        status,
        cupomTrocaGeradoId: null,
        validacaoPagamento: JA_VALIDADO.includes(status)
          ? {
              aprovado: true,
              data: data.toISOString(),
              verificacoes: [
                {
                  rotulo: 'Operadora do cartão',
                  ok: true,
                  detalhe: 'Cobrança aprovada.',
                },
              ],
            }
          : null,
        troca: emTroca
          ? {
              itens: [
                {
                  discoId: itens[0].disco.id,
                  quantidade: 1,
                },
              ],
              motivo: 'Disco chegou com chiado audível na primeira faixa.',
              solicitadaEm: data.toISOString(),
              cupomGeradoId: null,
              retornouAoEstoque: false,
            }
          : null,
      });
    }
  }

  return pedidos.sort((a, b) => b.data.localeCompare(a.data));
}
