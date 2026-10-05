import type { Endereco } from './cliente';
import type { Cupom } from './cupom';

/** Nomes conforme a lista da entrega, que difere do DRS. */
export type StatusPedido =
  | 'EM ABERTO'
  | 'EM PROCESSAMENTO'
  | 'PAGAMENTO REALIZADO'
  | 'PAGAMENTO RECUSADO'
  | 'EM TRÂNSITO'
  | 'ENTREGUE'
  | 'CANCELADO'
  | 'TROCA SOLICITADA'
  | 'TROCA ACEITA'
  | 'TROCA NEGADA'
  | 'ITEM ENVIADO'
  | 'ITEM RECEBIDO';

/** Cópia dos dados do disco no momento da compra: preço e título mudam depois. */
export interface ItemPedido {
  discoId: number;
  titulo: string;
  artista: string;
  coverSrc: string;
  precoUnitario: number;
  quantidade: number;
}

export interface PagamentoCartao {
  cartaoId: string;
  bandeira: string;
  ultimosDigitos: string;
  valor: number;
}

export interface PagamentoCupom {
  cupomId: string;
  codigo: string;
  valor: number;
}

/** RF0041: a troca é pedida sobre itens específicos da compra. */
export interface Troca {
  itens: { discoId: number; quantidade: number }[];
  motivo: string;
  solicitadaEm: string;
  /** RF0045: cupom gerado quando o administrador confirma o recebimento. */
  cupomGeradoId: string | null;
  /** RF0044 + RF0054: se os itens devolvidos voltaram ao estoque. */
  retornouAoEstoque: boolean;
}

/** RN0037: cada item conferido na validação da forma de pagamento. */
export interface VerificacaoPagamento {
  rotulo: string;
  ok: boolean;
  detalhe: string;
}

export interface ValidacaoPagamento {
  aprovado: boolean;
  data: string;
  verificacoes: VerificacaoPagamento[];
}

export interface Pedido {
  id: string;
  clienteId: string;
  data: string;
  itens: ItemPedido[];
  enderecoEntrega: Endereco;
  subtotal: number;
  frete: number;
  total: number;
  cupons: PagamentoCupom[];
  cartoes: PagamentoCartao[];
  status: StatusPedido;
  /** RN0036: sobra dos cupons devolvida como cupom de troca novo. */
  cupomTrocaGeradoId: string | null;
  troca: Troca | null;
  /** RN0037 e RN0038: resultado da validação, null enquanto não foi validada. */
  validacaoPagamento: ValidacaoPagamento | null;
}

/**
 * Pedido do cliente como o servidor registrou (RF0038). O status vem com os nomes
 * do DRS, que não são os da massa de demonstração da curadoria.
 */
export interface PedidoCliente {
  id: string;
  clienteId: string;
  data: string;
  status: string;
  itens: ItemPedido[];
  /** RN0023: cópia do endereço no momento da compra. */
  enderecoEntrega: Endereco;
  subtotal: number;
  frete: number;
  total: number;
  cupons: PagamentoCupom[];
  cartoes: PagamentoCartao[];
  /** RN0036: a sobra dos cupons, devolvida como cupom de troca. */
  cupomGerado: Cupom | null;
}

/** RF0034 e RN0033 a RN0036 calculados pelo servidor para o checkout, sem gravar nada. */
export interface Cotacao {
  subtotal: number;
  /** Em gramas. */
  pesoTotal: number;
  regiao: string;
  frete: number;
  total: number;
  valorCupons: number;
  restante: number;
  troco: number;
  /** As mesmas mensagens que a criação do pedido devolveria na recusa. */
  pendencias: string[];
}
