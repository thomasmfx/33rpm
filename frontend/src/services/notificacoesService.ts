import type { Notificacao } from '../types/notificacao';
import { requisitar } from './api';

interface NotificacaoApi {
  id: number;
  pedidoId?: number | null;
  mensagem: string;
  isLida: boolean;
  dataCadastro: string;
}

function paraNotificacao(bruto: NotificacaoApi): Notificacao {
  return {
    id: String(bruto.id),
    pedidoId: bruto.pedidoId ? String(bruto.pedidoId) : null,
    mensagem: bruto.mensagem,
    isLida: bruto.isLida,
    data: bruto.dataCadastro,
  };
}

/** RN0046: a mais recente primeiro. */
export async function listarNotificacoes(clienteId: string): Promise<Notificacao[]> {
  const brutas = await requisitar<NotificacaoApi[]>(`/notificacoes?clienteId=${clienteId}`);
  return brutas.map(paraNotificacao);
}

export async function marcarComoLida(id: string): Promise<void> {
  await requisitar<unknown>(`/notificacoes/${id}/leitura`, { method: 'PUT' });
}
