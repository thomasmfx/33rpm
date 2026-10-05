import type { ItemCarrinho } from '../types/carrinho';
import type { FormEntradaEstoqueValues } from '../components/FormEntradaEstoque/FormEntradaEstoque';
import { requisitar } from './api';

/** RF0052 + RN0051: o que a entrada faria com o preço e o estoque, sem gravar nada. */
export interface PreviaEntrada {
  precoAtual: number;
  precoSugerido: number;
  precoResultante: number;
  estoqueAtual: number;
  estoqueResultante: number;
}

export async function previaEntrada(
  discoId: number,
  quantidade: number,
  valorCusto: number,
): Promise<PreviaEntrada> {
  return requisitar<PreviaEntrada>('/estoque/entradas/previa', {
    method: 'POST',
    body: JSON.stringify({ discoId, quantidade, valorCusto }),
  });
}

/** RF0051: soma ao estoque e reprecifica o disco no servidor (RF0052). */
export async function registrarEntrada(
  discoId: number,
  valores: FormEntradaEstoqueValues,
): Promise<void> {
  await requisitar<unknown>('/estoque/entradas', {
    method: 'POST',
    body: JSON.stringify({
      discoId,
      fornecedor: valores.fornecedor ? { nome: valores.fornecedor } : null,
      quantidade: valores.quantidade,
      valorCusto: valores.valorCusto,
      dataEntrada: valores.dataEntrada,
    }),
  });
}

/** RN0031: cada item leva a quantidade total desejada do disco; a recusa vem como ErroApi. */
export async function consultarDisponibilidade(itens: ItemCarrinho[]): Promise<void> {
  await requisitar<unknown>('/estoque/disponibilidade', {
    method: 'POST',
    body: JSON.stringify({ itens }),
  });
}
