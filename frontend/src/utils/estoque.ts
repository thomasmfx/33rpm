import type { Disco, MotivoStatus } from '../types/disco';
import type { EntradaEstoque } from '../types/inventario';
import { CATEGORIA_INATIVACAO_AUTOMATICA } from '../types/inventario';
import {
  exigeAutorizacaoGerente,
  TOLERANCIA_PRECO,
  valorVendaSugerido,
} from './precificacao';

export const PARAMETRO_INATIVACAO_AUTOMATICA = { diasSemVenda: 90 };

/** Até aqui a vitrine avisa "Últimas N" e a curadoria marca estoque baixo. */
export const LIMITE_ESTOQUE_BAIXO = 2;

export function estoqueAcabando(estoque: number): boolean {
  return estoque > 0 && estoque <= LIMITE_ESTOQUE_BAIXO;
}

/** RN0015 e RN0017: a justificativa da mudança de status precisa dizer algo. */
export const JUSTIFICATIVA_MINIMA_STATUS = 10;

export function diasDesde(dataIso: string | null, hoje: Date): number | null {
  if (!dataIso) return null;
  const diff = hoje.getTime() - new Date(`${dataIso}T00:00:00`).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** RF0013: sem estoque e sem venda dentro do prazo parametrizado. */
export function elegivelParaInativacaoAutomatica(
  disco: Disco,
  hoje: Date,
  diasSemVenda: number = PARAMETRO_INATIVACAO_AUTOMATICA.diasSemVenda,
): boolean {
  if (!disco.isAtivo || disco.estoque > 0) return false;

  const dias = diasDesde(disco.ultimaVendaEm, hoje);
  // nunca vendido conta como parado
  return dias === null || dias >= diasSemVenda;
}

/** RN0016: a inativação automática é sempre categorizada como FORA DE MERCADO. */
export function motivoInativacaoAutomatica(
  disco: Disco,
  hoje: Date,
): MotivoStatus {
  const dias = diasDesde(disco.ultimaVendaEm, hoje);

  return {
    categoria: CATEGORIA_INATIVACAO_AUTOMATICA,
    justificativa:
      dias === null
        ? 'Inativação automática: sem estoque e sem nenhuma venda registrada.'
        : `Inativação automática: sem estoque e sem vendas há ${dias} dias.`,
    data: paraIso(hoje),
    automatico: true,
  };
}

/** RN0061 / RN0062 / RNF0064: validação de uma entrada antes de registrá-la. */
export function validarEntradaEstoque(entrada: {
  quantidade: number;
  valorCusto: number;
  fornecedor: string;
  dataEntrada: string | null;
}): string | null {
  if (!Number.isInteger(entrada.quantidade) || entrada.quantidade <= 0) {
    return 'A quantidade deve ser um número inteiro maior que zero.';
  }
  if (!(entrada.valorCusto > 0)) {
    return 'Todo item precisa de um valor de custo maior que zero.';
  }
  if (!entrada.fornecedor.trim()) {
    return 'Informe o fornecedor da entrada.';
  }
  if (!entrada.dataEntrada) {
    return 'Informe a data de entrada dos itens.';
  }
  return null;
}

/**
 * Preço que o disco passa a ter depois de uma entrada. A prévia da tela e a
 * gravação usam esta mesma função de propósito: quando as duas faziam a conta
 * separadas, a tela prometia um reajuste que a gravação não aplicava.
 */
export function precoAposEntrada(
  disco: Pick<Disco, 'id' | 'price' | 'grupoPrecificacaoId' | 'autorizacaoGerente'>,
  entradas: EntradaEstoque[],
): number {
  // RN0014: preço abaixo da margem é exceção autorizada por um gerente, e uma
  // entrada em estoque não desfaz essa decisão sozinha
  if (disco.autorizacaoGerente !== null) return disco.price;

  // RN0051: fora da exceção, o preço acompanha o maior custo já registrado
  const sugerido = valorVendaSugerido(disco, entradas);
  return sugerido !== null && sugerido > disco.price + TOLERANCIA_PRECO
    ? sugerido
    : disco.price;
}

/**
 * RF0051 + RF0052 + RN0051: soma a quantidade ao estoque e reprecifica o disco.
 * Devolve um disco novo, sem mutar o original.
 */
export function aplicarEntradaEstoque(
  disco: Disco,
  entrada: EntradaEstoque,
  entradasAnteriores: EntradaEstoque[],
): Disco {
  const entradas = [...entradasAnteriores, entrada];
  const price = precoAposEntrada(disco, entradas);

  return {
    ...disco,
    estoque: disco.estoque + entrada.quantidade,
    price,
    // a exceção da RN0014 caduca quando o preço volta para dentro da margem
    autorizacaoGerente: exigeAutorizacaoGerente(
      price,
      valorVendaSugerido(disco, entradas),
    )
      ? disco.autorizacaoGerente
      : null,
  };
}

export function paraIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function formatarDataBR(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Nunca vendido conta como parado, como na RF0013. */
export function estaParado(disco: Disco, hoje: Date): boolean {
  const dias = diasDesde(disco.ultimaVendaEm, hoje);
  return dias === null || dias >= PARAMETRO_INATIVACAO_AUTOMATICA.diasSemVenda;
}
