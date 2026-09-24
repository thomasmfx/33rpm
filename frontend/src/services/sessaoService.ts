import type { RespostaSessao } from '../types/sessao';
import { requisitar } from './api';
import { paraCliente } from './clientesService';
import type { ClienteApi } from './clientesService';
import { paraAdministrador } from './administradoresService';
import type { AdministradorApi } from './administradoresService';

type RespostaApi =
  | { papel: 'cliente'; usuario: ClienteApi }
  | { papel: 'administrador'; usuario: AdministradorApi };

/** Login único: o servidor diz se o e-mail é de administrador ou de cliente. */
export async function entrar(email: string, senha: string): Promise<RespostaSessao> {
  const resposta = await requisitar<RespostaApi>('/sessoes', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
  return resposta.papel === 'administrador'
    ? { papel: 'administrador', administrador: paraAdministrador(resposta.usuario) }
    : { papel: 'cliente', cliente: paraCliente(resposta.usuario) };
}
