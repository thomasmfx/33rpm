import { createContext, useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Disco } from '../types/disco';
import type { EntradaEstoque } from '../types/inventario';
import type { ItemCarrinho } from '../types/carrinho';

export interface Loja {
  discos: Disco[];
  setDiscos: Dispatch<SetStateAction<Disco[]>>;
  entradas: EntradaEstoque[];
  setEntradas: Dispatch<SetStateAction<EntradaEstoque[]>>;
  carrinho: ItemCarrinho[];
  itensNoCarrinho: number;
  adicionarAoCarrinho: (discoId: number, quantidade: number) => void;
  alterarQuantidade: (discoId: number, quantidade: number) => void;
  removerDoCarrinho: (discoId: number) => void;
  limparCarrinho: () => void;
}

export const LojaContext = createContext<Loja | null>(null);

export function useLoja(): Loja {
  const loja = useContext(LojaContext);
  if (!loja) throw new Error('useLoja precisa estar dentro de LojaProvider');
  return loja;
}
