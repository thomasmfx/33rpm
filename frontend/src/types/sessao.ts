import type { Cliente } from './cliente';

export type Papel = 'cliente' | 'administrador';

/** O que fica no localStorage: quem entrou e com qual papel. */
export interface Sessao {
  papel: Papel;
  id: string;
}

export interface Administrador {
  id: string;
  /** ADM-000001, vindo da carga do banco. */
  codigo: string;
  nome: string;
  email: string;
  isAtivo: boolean;
}

export type RespostaSessao =
  | { papel: 'cliente'; cliente: Cliente }
  | { papel: 'administrador'; administrador: Administrador };
