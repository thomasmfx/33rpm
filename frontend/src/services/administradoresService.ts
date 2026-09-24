import type { Administrador } from '../types/sessao';
import { requisitar } from './api';

export interface AdministradorApi {
  id: number;
  codigo: string;
  nome: string;
  email: string;
  isAtivo: boolean;
}

export function paraAdministrador(bruto: AdministradorApi): Administrador {
  return {
    id: String(bruto.id),
    codigo: bruto.codigo,
    nome: bruto.nome,
    email: bruto.email,
    isAtivo: bruto.isAtivo,
  };
}

export async function buscarAdministrador(id: string): Promise<Administrador> {
  return paraAdministrador(await requisitar<AdministradorApi>(`/administradores/${id}`));
}

export async function alterarAdministrador(
  id: string,
  dados: { nome: string; email: string },
): Promise<Administrador> {
  const bruto = await requisitar<AdministradorApi>(`/administradores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
  return paraAdministrador(bruto);
}

/** RF0028 para o administrador: só a senha. */
export async function alterarSenhaAdministrador(
  id: string,
  senha: string,
  confirmarSenha: string,
): Promise<Administrador> {
  const bruto = await requisitar<AdministradorApi>(`/administradores/${id}/senha`, {
    method: 'PUT',
    body: JSON.stringify({ senha, confirmarSenha }),
  });
  return paraAdministrador(bruto);
}
