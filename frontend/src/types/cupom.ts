export type TipoCupom = 'promocional' | 'troca';

export interface Cupom {
  id: string;
  codigo: string;
  tipo: TipoCupom;
  valor: number;
  /** Cupom de troca pertence a um cliente; promocional vale para todos (null). */
  clienteId: string | null;
  isUtilizado: boolean;
}
