export interface ItemCarrinho {
  discoId: number;
  quantidade: number;
}

/** RN0044 e RNF0042: o carrinho como o servidor guarda. */
export interface Carrinho {
  itens: ItemCarrinho[];
  /** RNF0042: saíram pelo prazo e esperam ser incluídos de novo. */
  expirados: ItemCarrinho[];
  /** Instante, no relógio do navegador, em que o bloqueio vence; null com o carrinho vazio. */
  expiraEm: number | null;
  prazoMinutos: number;
  avisoMinutos: number;
}
