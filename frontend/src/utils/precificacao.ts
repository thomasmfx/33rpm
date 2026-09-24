import type { Disco } from '../types/disco';
import type { EntradaEstoque, GrupoPrecificacao } from '../types/inventario';
import { GRUPOS_PRECIFICACAO } from '../types/inventario';

/**
 * O valor sugerido sai de uma divisão, então erra por centavos. Sem essa folga
 * um preço de R$ 389,00 contra um sugerido de R$ 389,01 pediria autorização do
 * gerente sem nenhuma margem ter sido furada de verdade.
 */
export const TOLERANCIA_PRECO = 0.01;

export function obterGrupoPrecificacao(
  id: string,
): GrupoPrecificacao | undefined {
  return GRUPOS_PRECIFICACAO.find((grupo) => grupo.id === id);
}

export function nomeGrupoPrecificacao(id: string): string {
  return obterGrupoPrecificacao(id)?.nome ?? '—';
}

/** RF0052: valor de venda = valor de custo + o percentual do grupo de precificação. */
export function calcularValorVenda(
  valorCusto: number,
  margemLucro: number,
): number {
  return arredondar(valorCusto * (1 + margemLucro / 100));
}

/**
 * Inverso da RF0052. Só existe para os mocks: os preços dos discos foram
 * escritos à mão antes do estoque, então derivamos o custo a partir deles para
 * que a regra feche em vez de brigar com os dados já usados na home.
 */
export function calcularValorCusto(
  valorVenda: number,
  margemLucro: number,
): number {
  return arredondar(valorVenda / (1 + margemLucro / 100));
}

/** RN0051: havendo custos diferentes para o mesmo disco, vale sempre o MAIOR. */
export function maiorValorCusto(
  entradas: EntradaEstoque[],
  discoId: number,
): number | null {
  const custos = entradas
    .filter((entrada) => entrada.discoId === discoId)
    .map((entrada) => entrada.valorCusto);

  return custos.length > 0 ? Math.max(...custos) : null;
}

/**
 * Preço que a RF0052 + RN0051 exigem para o disco.
 * null quando ainda não houve nenhuma entrada em estoque — aí não há custo base.
 */
export function valorVendaSugerido(
  disco: Pick<Disco, 'id' | 'grupoPrecificacaoId'>,
  entradas: EntradaEstoque[],
): number | null {
  const custo = maiorValorCusto(entradas, disco.id);
  const grupo = obterGrupoPrecificacao(disco.grupoPrecificacaoId);

  if (custo === null || !grupo) return null;
  return calcularValorVenda(custo, grupo.margemLucro);
}

/**
 * RN0014: dentro da margem o preço muda livremente; abaixo dela só com
 * autorização de um gerente de vendas.
 */
export function exigeAutorizacaoGerente(
  precoInformado: number,
  precoSugerido: number | null,
): boolean {
  if (precoSugerido === null) return false;
  return precoInformado < precoSugerido - TOLERANCIA_PRECO;
}

export function formatarBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Preço dos cards: sem centavos quando é inteiro, para a grade escanear rápido. */
export function formatarPrecoCurto(valor: number): string {
  return Number.isInteger(valor) ? `R$ ${valor.toLocaleString('pt-BR')}` : formatarBRL(valor);
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}
