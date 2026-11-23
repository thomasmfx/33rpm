import type { Endereco } from './cliente';
import type { Cupom } from './cupom';

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

/** O item gravado tem id próprio: é por ele que a troca escolhe o que devolver. */
export interface ItemPedidoCliente extends ItemPedido {
  id: string;
}

/** RN0037 e RN0038: o resultado da validação do pagamento. */
export interface ValidacaoRegistrada {
  aprovado: boolean;
  /** O que reprovou; null na aprovada. */
  motivo: string | null;
  data: string;
}

/**
 * RF0041 e RN0041: o pedido de troca de itens de uma compra entregue, ou dela inteira.
 * O status vai de EM TROCA a TROCA AUTORIZADA e TROCADO.
 */
export interface TrocaPedido {
  id: string;
  pedidoId: string;
  clienteId: string;
  status: string;
  compraInteira: boolean;
  motivo: string;
  /** RF0044: informado no recebimento; null antes dele. */
  retornoEstoque: boolean | null;
  solicitadaEm: string;
  autorizadaEm: string | null;
  recebidaEm: string | null;
  itens: (ItemPedido & { itemPedidoId: string })[];
  /** RF0045: o valor do cupom, pelo preço pago. */
  valor: number;
  cupomGerado: Cupom | null;
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
  itens: ItemPedidoCliente[];
  /** RN0023: cópia do endereço no momento da compra. */
  enderecoEntrega: Endereco;
  subtotal: number;
  frete: number;
  total: number;
  cupons: PagamentoCupom[];
  cartoes: PagamentoCartao[];
  /** RN0036: a sobra dos cupons; vira cupom de troca só na aprovação. */
  troco: number;
  /** RN0036: o cupom da sobra, emitido na aprovação; null antes dela. */
  cupomGerado: Cupom | null;
  /** null enquanto o pedido está EM PROCESSAMENTO. */
  validacao: ValidacaoRegistrada | null;
  trocas: TrocaPedido[];
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
