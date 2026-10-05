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

/** Aceita a troca, o cliente despacha o item de volta. */
export function podeInformarDespacho(status: StatusPedido): boolean {
  return status === 'TROCA ACEITA';
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

/** RF0038: status como o servidor grava, nos nomes do DRS (tabela status_pedido). */
const CORES_STATUS_REGISTRADO: Record<string, string> = {
  'EM PROCESSAMENTO': '#8F8C84',
  APROVADA: '#D9501F',
  REPROVADA: '#B83A2A',
  'EM TRANSPORTE': '#D9501F',
  ENTREGUE: '#2F7A4E',
  'EM TROCA': '#D9501F',
  'TROCA AUTORIZADA': '#D9501F',
  TROCADO: '#2F7A4E',
};

export function corDoStatus(status: string): string {
  return CORES_STATUS_REGISTRADO[status] ?? CORES_STATUS_REGISTRADO['EM PROCESSAMENTO'];
}

/** "EM PROCESSAMENTO" vira "Em processamento"; serve a todos os nomes do DRS. */
export function rotuloDoStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/**
 * Até onde a linha do tempo do cliente anda. null quando o pedido saiu do fluxo
 * (pagamento reprovado) e não há linha do tempo a mostrar.
 */
export function passoDoStatus(status: string): number | null {
  switch (status) {
    case 'REPROVADA':
      return null;
    case 'EM PROCESSAMENTO':
      return 0;
    case 'APROVADA':
      return 1;
    case 'EM TRANSPORTE':
      return 2;
    default:
      return 3;
  }
}
