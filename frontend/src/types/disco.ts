/** Uma faixa do disco, como vem da tracklist do Discogs. */
export interface Faixa {
  posicao: string;
  titulo: string;
  duracao: string;
}

export interface Dimensoes {
  altura: number; // cm
  largura: number; // cm
  profundidade: number; // cm
  peso: number; // g
}

/**
 * RN0015 / RN0016 / RN0017: toda ativação ou inativação precisa registrar uma
 * categoria e uma justificativa.
 */
export interface MotivoStatus {
  categoria: string;
  justificativa: string;
  data: string;
  /** RN0016: inativação automática entra sempre como FORA DE MERCADO. */
  automatico: boolean;
}

export interface Disco {
  /** RNF0021: código único do disco no sistema (master_id do Discogs nos mocks). */
  id: number;
  title: string;
  artist: string;
  releaseYear: number;
  /** RN0012: um disco pode estar associado a mais de uma categoria. */
  genres: string[];
  styles: string[];
  /** Valor de venda em R$, derivado do custo pela RF0052 + RN0051. */
  price: number;
  /** Capa em 600px (images[].uri do Discogs), para o card e a página do disco. */
  coverSrc: string;
  /**
   * Miniatura em 150px (images[].uri150), para tabelas e listas compactas.
   * Opcional: disco cadastrado à mão tem só uma URL, e aí a capa serve.
   */
  coverThumb?: string;
  /** Cópias à venda no marketplace do Discogs — NÃO é o nosso estoque. */
  numForSale: number;
  discogsUri: string;

  // --- Cadastro: dados obrigatórios da RN0011 ---
  /** "editora" na RN0011. */
  gravadora: string;
  /** RNF0013: id de FORMATOS_DISCO. Define o preset de dimensões da prensagem. */
  formatoId: string;
  /** RNF0013: ids de EDICOES. Combinam — uma reprensagem pode ser colorida e remasterizada. */
  edicaoIds: string[];
  /** "ISBN" na RN0011: o número de catálogo identifica a prensagem. */
  codigoCatalogo: string;
  codigoBarras: string;
  /** "número de páginas" na RN0011. */
  numeroFaixas: number;
  duracao: string; // 'MM:SS'
  /** "sinopse" na RN0011. */
  descricao: string;
  dimensoes: Dimensoes;
  /** RN0013: define a margem de lucro aplicada sobre o valor de custo. */
  grupoPrecificacaoId: string;

  // --- Estoque e status ---
  estoque: number;
  isAtivo: boolean;
  motivoStatus: MotivoStatus | null;
  /** Usado pela RF0013 para achar discos parados. null = nunca vendido. */
  ultimaVendaEm: string | null;
  /** RN0014: preenchido quando o preço foi baixado da margem com aval do gerente. */
  autorizacaoGerente: string | null;
}
