import type { Disco } from '../types/disco';
import type { Pedido, StatusPedido } from '../types/pedido';

/** RN0074: só compras que de fato viraram venda entram no gráfico. */
const STATUS_CONTABILIZADOS: StatusPedido[] = [
  'PAGAMENTO REALIZADO',
  'EM TRÂNSITO',
  'ENTREGUE',
  'TROCA SOLICITADA',
  'TROCA ACEITA',
  'TROCA NEGADA',
  'ITEM ENVIADO',
  'ITEM RECEBIDO',
];

/** RN0072 */
export const PERIODO_MINIMO_MESES = 1;
export const PERIODO_MAXIMO_MESES = 24;

/**
 * 'yyyy-mm-dd' puro é lido como UTC pelo construtor de Date, o que joga a data
 * para o dia anterior em fuso negativo e desloca o mês inteiro do gráfico.
 * O DatePickerInput entrega exatamente esse formato, então todo parse passa aqui.
 */
export function dataLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export interface PontoGrafico {
  periodo: string;
  [categoria: string]: string | number;
}

export function contabiliza(pedido: Pedido): boolean {
  return STATUS_CONTABILIZADOS.includes(pedido.status);
}

function chaveMes(dataIso: string): string {
  return dataIso.slice(0, 7);
}

export function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split('-');
  return `${mes}/${ano}`;
}

/** RN0071: a granularidade é mensal, somando as vendas do mês por categoria. */
export function mesesDoPeriodo(inicio: Date, fim: Date): string[] {
  const meses: string[] = [];
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const limite = new Date(fim.getFullYear(), fim.getMonth(), 1);

  while (cursor <= limite) {
    const mes = String(cursor.getMonth() + 1).padStart(2, '0');
    meses.push(`${cursor.getFullYear()}-${mes}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return meses;
}

export function quantidadeDeMeses(inicio: Date, fim: Date): number {
  return mesesDoPeriodo(inicio, fim).length;
}

/** RN0072: entre 1 e 24 meses, e o fim nunca antes do início (RF0056). */
export function validarPeriodo(
  inicio: Date | null,
  fim: Date | null,
): string | null {
  if (!inicio || !fim) return 'Informe a data de início e a data de fim.';
  if (fim < inicio) return 'RF0056: a data de fim não pode ser anterior à de início.';

  const meses = quantidadeDeMeses(inicio, fim);
  if (meses < PERIODO_MINIMO_MESES) {
    return `RN0072: o período deve ter no mínimo ${PERIODO_MINIMO_MESES} mês.`;
  }
  if (meses > PERIODO_MAXIMO_MESES) {
    return `RN0072: o período deve ter no máximo ${PERIODO_MAXIMO_MESES} meses (selecionou ${meses}).`;
  }
  return null;
}

export function categoriasDoAcervo(discos: Disco[]): string[] {
  return [...new Set(discos.flatMap((disco) => disco.genres))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}

/**
 * RF0055: histórico de vendas por categoria dentro do período.
 * RN0073: mês sem venda da categoria entra como 0, para a linha não quebrar.
 * O valor de um item é rateado entre as categorias do disco, senão um disco de
 * três gêneros contaria três vezes e o total do gráfico não bateria com o caixa.
 */
export function seriePorCategoria(
  pedidos: Pedido[],
  discos: Disco[],
  categorias: string[],
  inicio: Date,
  fim: Date,
): PontoGrafico[] {
  const meses = mesesDoPeriodo(inicio, fim);
  const acumulado = new Map<string, Map<string, number>>();

  for (const mes of meses) {
    acumulado.set(mes, new Map(categorias.map((categoria) => [categoria, 0])));
  }

  for (const pedido of pedidos) {
    if (!contabiliza(pedido)) continue;

    const mes = chaveMes(pedido.data);
    const doMes = acumulado.get(mes);
    if (!doMes) continue;

    for (const item of pedido.itens) {
      const disco = discos.find((candidato) => candidato.id === item.discoId);
      if (!disco || disco.genres.length === 0) continue;

      const valorItem = item.precoUnitario * item.quantidade;
      const rateio = valorItem / disco.genres.length;

      for (const genero of disco.genres) {
        if (doMes.has(genero)) {
          doMes.set(genero, (doMes.get(genero) ?? 0) + rateio);
        }
      }
    }
  }

  return meses.map((mes) => {
    const ponto: PontoGrafico = { periodo: rotuloMes(mes) };
    for (const categoria of categorias) {
      ponto[categoria] = Math.round((acumulado.get(mes)?.get(categoria) ?? 0) * 100) / 100;
    }
    return ponto;
  });
}

/** RF0058: as linhas que vão para a planilha — período, categoria e valor. */
export function linhasParaPlanilha(
  serie: PontoGrafico[],
  categorias: string[],
): Record<string, string | number>[] {
  return serie.flatMap((ponto) =>
    categorias.map((categoria) => ({
      Período: ponto.periodo,
      Categoria: categoria,
      'Valor de venda (R$)': Number(ponto[categoria] ?? 0),
    })),
  );
}
