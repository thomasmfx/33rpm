export type TipoCupom = 'promocional' | 'troca';

export interface Cupom {
  id: string;
  codigo: string;
  tipo: TipoCupom;
  valor: number;
  /** Cupom de troca pertence a um cliente; promocional vale para todos (null). */
  clienteId: string | null;
  isUtilizado: boolean;
  /** RN0036: a compra cujos cupons passaram do total. */
  pedidoOrigemId?: string | null;
  /** RF0045: a troca cujos itens chegaram. */
  trocaOrigemId?: string | null;
}
