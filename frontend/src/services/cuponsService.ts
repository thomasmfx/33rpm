import type { Cupom } from '../types/cupom';
import { requisitar } from './api';

export interface CupomApi {
  id: number;
  clienteId: number;
  codigo: string;
  tipo: { id?: number; desc: string };
  valor: number;
  isUtilizado: boolean;
}

export function paraCupom(bruto: CupomApi): Cupom {
  return {
    id: String(bruto.id),
    codigo: bruto.codigo,
    tipo: bruto.tipo.desc === 'PROMOCIONAL' ? 'promocional' : 'troca',
    valor: bruto.valor,
    clienteId: String(bruto.clienteId),
    isUtilizado: bruto.isUtilizado,
  };
}

/** Cupons do cliente, usados e disponíveis. */
export async function listarCupons(clienteId: string): Promise<Cupom[]> {
  const brutos = await requisitar<CupomApi[]>(`/cupons?clienteId=${clienteId}`);
  return brutos.map(paraCupom);
}
