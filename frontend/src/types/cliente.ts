export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  dataNascimento: string | null;
  ranking: number;
  isAtivo: boolean;
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
