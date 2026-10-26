import type { Carrinho } from '../types/carrinho';
import { requisitar } from './api';

interface CarrinhoApi {
  itens: { discoId: number; quantidade: number }[];
  expirados: { discoId: number; quantidade: number }[];
  /** Ausente com o carrinho vazio. */
  segundosParaExpirar?: number | null;
  prazoMinutos: number;
  avisoMinutos: number;
  ajustes: string[];
}

/** O prazo vem em segundos para o relógio do navegador não precisar bater com o do servidor. */
function paraCarrinho(bruto: CarrinhoApi): Carrinho {
  const segundos = bruto.segundosParaExpirar;
  return {
    itens: bruto.itens.map(({ discoId, quantidade }) => ({ discoId, quantidade })),
    expirados: bruto.expirados.map(({ discoId, quantidade }) => ({ discoId, quantidade })),
    expiraEm: segundos === undefined || segundos === null ? null : Date.now() + segundos * 1000,
    prazoMinutos: bruto.prazoMinutos,
    avisoMinutos: bruto.avisoMinutos,
  };
}

async function enviar(caminho: string, opcoes: RequestInit = {}): Promise<Carrinho> {
  return paraCarrinho(await requisitar<CarrinhoApi>(caminho, opcoes));
}

export async function buscarCarrinho(clienteId: string): Promise<Carrinho> {
  return enviar(`/carrinhos/${clienteId}`);
}

/** RN0031 e RN0044: soma ao que já está no carrinho e renova o prazo; a recusa vem como ErroApi. */
export async function incluirNoCarrinho(
  clienteId: string,
  discoId: number,
  quantidade: number,
): Promise<Carrinho> {
  return enviar(`/carrinhos/${clienteId}/itens`, {
    method: 'POST',
    body: JSON.stringify({ discoId, quantidade }),
  });
}

/** RF0032: a quantidade final do item; aumentar renova o prazo, reduzir não (RN0044). */
export async function alterarItemDoCarrinho(
  clienteId: string,
  discoId: number,
  quantidade: number,
): Promise<Carrinho> {
  return enviar(`/carrinhos/${clienteId}/itens/${discoId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantidade }),
  });
}

export async function tirarDoCarrinho(clienteId: string, discoId: number): Promise<Carrinho> {
  return enviar(`/carrinhos/${clienteId}/itens/${discoId}`, { method: 'DELETE' });
}

export async function esvaziarCarrinho(clienteId: string): Promise<Carrinho> {
  return enviar(`/carrinhos/${clienteId}`, { method: 'DELETE' });
}

/** RNF0042: dispensa os itens que saíram pelo prazo. */
export async function dispensarExpirados(clienteId: string): Promise<Carrinho> {
  return enviar(`/carrinhos/${clienteId}/expirados`, { method: 'DELETE' });
}

/** RN0032: ajusta o carrinho ao estoque livre e diz o que mudou. */
export async function revalidarCarrinho(
  clienteId: string,
): Promise<{ carrinho: Carrinho; ajustes: string[] }> {
  const bruto = await requisitar<CarrinhoApi>(`/carrinhos/${clienteId}/revalidacao`, {
    method: 'POST',
  });
  return { carrinho: paraCarrinho(bruto), ajustes: bruto.ajustes };
}
