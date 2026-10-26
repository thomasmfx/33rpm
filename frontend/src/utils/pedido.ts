import type { Pedido, PedidoCliente, TrocaPedido } from '../types/pedido';

/** Massa de demonstração da recomendação: os pedidos de um cliente, o mais recente primeiro. */
export function pedidosDoCliente(pedidos: Pedido[], clienteId: string): Pedido[] {
  return pedidos
    .filter((pedido) => pedido.clienteId === clienteId)
    .sort((a, b) => b.data.localeCompare(a.data));
}

export const PASSOS_PEDIDO = ['Recebido', 'Pagamento aprovado', 'Em trânsito', 'Entregue'];

/** Cor do ponto de status: cinza espera, selo anda, verde fecha, vermelho barra. */
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

/** RN0039 e RN0040: o passo do administrador em cada status da compra. */
export const AVANCO_DO_PEDIDO: Partial<Record<string, 'EM TRANSPORTE' | 'ENTREGUE'>> = {
  APROVADA: 'EM TRANSPORTE',
  'EM TRANSPORTE': 'ENTREGUE',
};

/** RF0042 e RF0044: o passo do administrador em cada status da troca. */
export const AVANCO_DA_TROCA: Partial<Record<string, 'TROCA AUTORIZADA' | 'TROCADO'>> = {
  'EM TROCA': 'TROCA AUTORIZADA',
  'TROCA AUTORIZADA': 'TROCADO',
};

export function pedidoPrecisaDeAcao(pedido: PedidoCliente): boolean {
  return AVANCO_DO_PEDIDO[pedido.status] !== undefined;
}

export function trocaPrecisaDeAcao(troca: TrocaPedido): boolean {
  return AVANCO_DA_TROCA[troca.status] !== undefined;
}

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
