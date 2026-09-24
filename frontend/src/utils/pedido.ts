import type { Disco } from '../types/disco';
import type { ItemPedido, Pedido, StatusPedido } from '../types/pedido';

/** Cor do ponto de status: cinza espera, selo anda, verde fecha, vermelho barra. */
export const CORES_STATUS: Record<StatusPedido, string> = {
  'EM ABERTO': '#8F8C84',
  'EM PROCESSAMENTO': '#8F8C84',
  'PAGAMENTO REALIZADO': '#D9501F',
  'PAGAMENTO RECUSADO': '#B83A2A',
  'EM TRÂNSITO': '#D9501F',
  ENTREGUE: '#2F7A4E',
  CANCELADO: '#B83A2A',
  'TROCA SOLICITADA': '#D9501F',
  'TROCA ACEITA': '#D9501F',
  'TROCA NEGADA': '#B83A2A',
  'ITEM ENVIADO': '#D9501F',
  'ITEM RECEBIDO': '#2F7A4E',
};

export const ROTULOS_STATUS: Record<StatusPedido, string> = {
  'EM ABERTO': 'Em aberto',
  'EM PROCESSAMENTO': 'Em processamento',
  'PAGAMENTO REALIZADO': 'Pagamento realizado',
  'PAGAMENTO RECUSADO': 'Pagamento recusado',
  'EM TRÂNSITO': 'Em trânsito',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
  'TROCA SOLICITADA': 'Troca solicitada',
  'TROCA ACEITA': 'Troca aceita',
  'TROCA NEGADA': 'Troca negada',
  'ITEM ENVIADO': 'Item a caminho',
  'ITEM RECEBIDO': 'Troca concluída',
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

/** O pedido está parado esperando um passo da curadoria. */
export function precisaDeAcao(pedido: Pedido): boolean {
  return proximosStatusAdmin(pedido.status).length > 0;
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

export const PASSOS_PEDIDO = ['Recebido', 'Pagamento aprovado', 'Em trânsito', 'Entregue'];

/**
 * Até onde a linha do tempo do cliente anda. null quando o pedido saiu do
 * fluxo (cancelado ou recusado) e não há linha do tempo a mostrar.
 */
export function passoDoPedido(status: StatusPedido): number | null {
  switch (status) {
    case 'CANCELADO':
    case 'PAGAMENTO RECUSADO':
      return null;
    case 'EM ABERTO':
    case 'EM PROCESSAMENTO':
      return 0;
    case 'PAGAMENTO REALIZADO':
      return 1;
    case 'EM TRÂNSITO':
      return 2;
    default:
      return 3;
  }
}
