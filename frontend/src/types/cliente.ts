/** RN0023: um endereço serve para entrega, cobrança, ou os dois. */
export type TipoEndereco = 'entrega' | 'cobranca' | 'ambos';

export interface Endereco {
  id: string;
  /** RF0026: frase curta que identifica o endereço ('Casa da praia'). */
  nome: string;
  tipo: TipoEndereco;
  tipoResidencia: string;
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  pais: string;
  /** Único campo opcional da RN0023. */
  observacoes: string;
}

/** RN0024 */
export interface Cartao {
  id: string;
  numero: string;
  nomeImpresso: string;
  bandeira: string;
  codigoSeguranca: string;
  /** RF0027: exatamente um cartão do cliente é o preferencial. */
  isPreferencial: boolean;
}

export const TIPOS_RESIDENCIA: string[] = [
  'Casa',
  'Apartamento',
  'Condomínio',
  'Comercial',
  'Outro',
];

export const TIPOS_LOGRADOURO: string[] = [
  'Rua',
  'Avenida',
  'Travessa',
  'Alameda',
  'Praça',
  'Rodovia',
  'Estrada',
];

/** RN0025: só bandeiras registradas no sistema. */
export const BANDEIRAS: string[] = [
  'Visa',
  'Mastercard',
  'Elo',
  'American Express',
  'Hipercard',
  'Diners Club',
];

export const ESTADOS: string[] = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS',
  'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC',
  'SE', 'SP', 'TO',
];

/** RN0026: o telefone é composto por tipo, DDD e número. */
export interface Telefone {
  tipo: string;
  ddd: string;
  numero: string;
}

export const TIPOS_TELEFONE: string[] = ['Celular', 'Residencial', 'Comercial'];

export const GENEROS: string[] = [
  'Feminino',
  'Masculino',
  'Prefiro não informar',
];

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  genero: string;
  telefone: Telefone;
  cpf: string;
  dataNascimento: string | null;
  ranking: number;
  isAtivo: boolean;
  enderecos: Endereco[];
  cartoes: Cartao[];
}

export type StatusFiltro = 'todos' | 'ativos' | 'inativos';

export interface FiltrosClientes {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  id: string;
  status: StatusFiltro;
  rankingMinimo: number;
}
