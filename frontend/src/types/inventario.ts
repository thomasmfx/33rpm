import type { Dimensoes } from './disco';

/** RN0013 / RF0052: o grupo define o percentual somado ao custo. */
export interface GrupoPrecificacao {
  id: string;
  nome: string;
  /** Percentual sobre o valor de custo. 85 = custo + 85%. */
  margemLucro: number;
}

/**
 * RNF0013: tabelas de domínio que o script de implantação carregaria.
 * Enquanto não há backend, ficam aqui.
 */
export const GRUPOS_PRECIFICACAO: GrupoPrecificacao[] = [
  { id: 'gp-lancamento', nome: 'Lançamento', margemLucro: 85 },
  { id: 'gp-catalogo', nome: 'Catálogo', margemLucro: 60 },
  { id: 'gp-importado', nome: 'Importado', margemLucro: 110 },
  { id: 'gp-classico', nome: 'Clássico', margemLucro: 70 },
  { id: 'gp-promocional', nome: 'Promocional', margemLucro: 35 },
];

// RNF0013: formatos de prensagem. 
export interface FormatoDisco {
  id: string;
  nome: string;
  descricao: string;
  dimensoes: Dimensoes;
}

export const FORMATOS_DISCO: FormatoDisco[] = [
  {
    id: 'fmt-lp',
    nome: 'LP',
    descricao: '12", 33⅓ RPM',
    dimensoes: { altura: 31.5, largura: 31.5, profundidade: 0.5, peso: 250 },
  },
  {
    id: 'fmt-2xlp',
    nome: '2xLP',
    descricao: 'Duplo 12", 33⅓ RPM',
    dimensoes: { altura: 31.5, largura: 31.5, profundidade: 1, peso: 480 },
  },
  {
    id: 'fmt-3xlp',
    nome: '3xLP',
    descricao: 'Triplo 12", 33⅓ RPM',
    dimensoes: { altura: 31.5, largura: 31.5, profundidade: 1.5, peso: 700 },
  },
  {
    id: 'fmt-ep',
    nome: 'EP',
    descricao: '12", 45 RPM',
    dimensoes: { altura: 31.5, largura: 31.5, profundidade: 0.4, peso: 230 },
  },
  {
    id: 'fmt-single',
    nome: 'Single',
    descricao: '7", 45 RPM',
    dimensoes: { altura: 17.8, largura: 17.8, profundidade: 0.3, peso: 110 },
  },
];

export const FORMATO_PADRAO = 'fmt-lp';
export const GRUPO_PRECIFICACAO_PADRAO = 'gp-catalogo';

export interface TipoEdicao {
  id: string;
  nome: string;
  descricao: string;
}

export const EDICOES: TipoEdicao[] = [
  {
    id: 'ed-primeira-prensagem',
    nome: 'Primeira Prensagem',
    descricao:
      'Lote original, prensado no ano em que o álbum saiu. É o que colecionador caça, e o que custa caro.',
  },
  {
    id: 'ed-reprensagem',
    nome: 'Reprensagem',
    descricao:
      'Fabricado anos depois do lançamento original. Vem lacrado e custa bem menos — é o que mais sai em loja.',
  },
  {
    id: 'ed-remasterizado',
    nome: 'Remasterizado',
    descricao:
      'A gravação original passou por retoque de áudio em estúdio, com tecnologia atual, antes de ir para o disco.',
  },
  {
    id: 'ed-vinil-colorido',
    nome: 'Splatter',
    descricao:
      'Disco tingido em vez do preto clássico. No splatter o efeito imita tinta espirrada sobre o vinil.',
  },
  {
    id: 'ed-picture-disc',
    nome: 'Picture Disc',
    descricao:
      'Imagem impressa direto na superfície tocável. Costuma soar um pouco pior que o vinil preto comum.',
  },
];

export const GRAVADORAS: string[] = [
  'Universal Music',
  'Sony Music',
  'Warner Records',
  'Columbia',
  'Epic',
  'Atlantic',
  'Def Jam Recordings',
  'Interscope',
  'Capitol Records',
  'Elektra',
  'Island Records',
  'Polysom',
  'RCA',
  'Rough Trade',
  'XL Recordings',
];

export const GENEROS: string[] = [
  'Blues',
  'Classical',
  'Electronic',
  'Folk, World, & Country',
  'Funk / Soul',
  'Hip Hop',
  'Jazz',
  'Latin',
  'Pop',
  'Reggae',
  'Rock',
];

export const FORNECEDORES: string[] = [
  'Universal Music Brasil',
  'Sony Music Entertainment',
  'Warner Music Brasil',
  'Polysom Indústria Fonográfica',
  'Tratore Distribuidora',
  'Import LP Distribuidora',
];

/** RN0015: categoria obrigatória na inativação manual. */
export const CATEGORIAS_INATIVACAO: string[] = [
  'FORA DE MERCADO',
  'FORA DE LINHA',
  'BAIXA DEMANDA',
  'AVARIA / QUALIDADE',
  'PENDÊNCIA COM FORNECEDOR',
  'OUTRO',
];

/** RN0016: a inativação automática é sempre categorizada assim. */
export const CATEGORIA_INATIVACAO_AUTOMATICA = 'FORA DE MERCADO';

/** RN0017: categoria obrigatória na ativação. */
export const CATEGORIAS_ATIVACAO: string[] = [
  'REPOSIÇÃO DE ESTOQUE',
  'NOVA PRENSAGEM',
  'DEMANDA DE CLIENTES',
  'REVISÃO DE CATÁLOGO',
  'OUTRO',
];

/** RF0051 + RN0050: todo campo abaixo é obrigatório na entrada. */
export interface EntradaEstoque {
  id: string;
  discoId: number;
  quantidade: number;
  /** Custo unitário em R$ (RN0062). */
  valorCusto: number;
  fornecedor: string;
  dataEntrada: string; // ISO, yyyy-mm-dd (RNF0064)
}

export type StatusFiltroDisco = 'todos' | 'ativos' | 'inativos';
export type EstoqueFiltro = 'todos' | 'disponivel' | 'esgotado';

/** RF0015: todo campo de identificação do disco serve de filtro, isolado ou combinado. */
export interface FiltrosDiscos {
  titulo: string;
  formatoId: string;
  artista: string;
  gravadora: string;
  categoria: string;
  /** Casa com código de catálogo ou código de barras. */
  codigo: string;
  anoMin: string;
  anoMax: string;
  precoMin: string;
  precoMax: string;
  grupoPrecificacaoId: string;
  status: StatusFiltroDisco;
  estoque: EstoqueFiltro;
}
