import type { Disco } from '../types/disco';
import type { ItemPedido, Pedido, StatusPedido } from '../types/pedido';

export const CORES_STATUS: Record<StatusPedido, string> = {
  'EM ABERTO': 'gray',
  'EM PROCESSAMENTO': 'gray',
  'PAGAMENTO REALIZADO': 'blue',
  'PAGAMENTO RECUSADO': 'red',
  'EM TRÂNSITO': 'orange',
  ENTREGUE: 'green',
  CANCELADO: 'red',
  'TROCA SOLICITADA': 'violet',
  'TROCA ACEITA': 'violet',
  'TROCA NEGADA': 'red',
  'ITEM ENVIADO': 'violet',
  'ITEM RECEBIDO': 'teal',
};

/**
 * Transições que o administrador executa, na ordem da lista da entrega.
 * O cliente tem as suas próprias, mais abaixo.
 */
const AVANCO_ADMIN: Partial<Record<StatusPedido, StatusPedido[]>> = {
  'EM ABERTO': ['EM PROCESSAMENTO'],
  'EM PROCESSAMENTO': ['PAGAMENTO REALIZADO'],
  'PAGAMENTO REALIZADO': ['EM TRÂNSITO'],
  'EM TRÂNSITO': ['ENTREGUE'],
  'TROCA SOLICITADA': ['TROCA ACEITA', 'TROCA NEGADA'],
  'ITEM ENVIADO': ['ITEM RECEBIDO'],
};

export function proximosStatusAdmin(status: StatusPedido): StatusPedido[] {
  return AVANCO_ADMIN[status] ?? [];
}

/** Cancelar só antes de despachar: depois disso vira troca, não cancelamento. */
export function podeCancelar(status: StatusPedido): boolean {
  return (
    status === 'EM ABERTO' ||
    status === 'EM PROCESSAMENTO' ||
    status === 'PAGAMENTO REALIZADO'
  );
}

export function podeConfirmarRecebimento(status: StatusPedido): boolean {
  return status === 'EM TRÂNSITO';
}

/** RN0043: só pedido ENTREGUE aceita solicitação de troca. */
export function podeSolicitarTroca(status: StatusPedido): boolean {
  return status === 'ENTREGUE';
}

/** Aceita a troca, o cliente despacha o item de volta. */
export function podeInformarDespacho(status: StatusPedido): boolean {
  return status === 'TROCA ACEITA';
}

/**
 * RN0028 e RF0054: itens que não seguiram venda voltam ao estoque — no
 * cancelamento sempre, na troca só quando o administrador confirma que os
 * itens chegaram em condição de revenda.
 */
export function devolverAoEstoque(
  discos: Disco[],
  itens: { discoId: number; quantidade: number }[],
): Disco[] {
  return discos.map((disco) => {
    const item = itens.find((candidato) => candidato.discoId === disco.id);
    return item ? { ...disco, estoque: disco.estoque + item.quantidade } : disco;
  });
}

export function valorDosItens(
  pedido: Pedido,
  itens: { discoId: number; quantidade: number }[],
): number {
  const total = itens.reduce((soma, item) => {
    const original = pedido.itens.find(
      (candidato) => candidato.discoId === item.discoId,
    );
    return soma + (original ? original.precoUnitario * item.quantidade : 0);
  }, 0);

  return Math.round(total * 100) / 100;
}

export function itensDaTroca(pedido: Pedido): ItemPedido[] {
  if (!pedido.troca) return [];
  return pedido.troca.itens.flatMap((item) => {
    const original = pedido.itens.find(
      (candidato) => candidato.discoId === item.discoId,
    );
    return original ? [{ ...original, quantidade: item.quantidade }] : [];
  });
}

export function pedidosDoCliente(pedidos: Pedido[], clienteId: string): Pedido[] {
  return pedidos
    .filter((pedido) => pedido.clienteId === clienteId)
    .sort((a, b) => b.data.localeCompare(a.data));
}
