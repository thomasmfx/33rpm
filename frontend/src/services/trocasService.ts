import type { TrocaPedido } from '../types/pedido';
import { requisitar } from './api';
import { paraCupom } from './cuponsService';
import type { CupomApi } from './cuponsService';

export interface TrocaApi {
  id: number;
  pedidoId: number;
  clienteId: number;
  status: { descricao: string };
  compraInteira: boolean;
  motivo: string;
  retornoEstoque?: boolean | null;
  dataCadastro: string;
  dataAutorizacao?: string | null;
  dataRecebimento?: string | null;
  itens: {
    itemPedidoId: number;
    discoId: number;
    titulo: string;
    artista: string;
    capaUrl: string;
    capaMiniaturaUrl?: string | null;
    precoUnitario: number;
    quantidade: number;
  }[];
  valor: number;
  cupomGerado?: CupomApi | null;
}

export function paraTroca(bruta: TrocaApi): TrocaPedido {
  return {
    id: String(bruta.id),
    pedidoId: String(bruta.pedidoId),
    clienteId: String(bruta.clienteId),
    status: bruta.status.descricao,
    compraInteira: bruta.compraInteira,
    motivo: bruta.motivo,
    retornoEstoque: bruta.retornoEstoque ?? null,
    solicitadaEm: bruta.dataCadastro,
    autorizadaEm: bruta.dataAutorizacao ?? null,
    recebidaEm: bruta.dataRecebimento ?? null,
    itens: bruta.itens.map((item) => ({
      itemPedidoId: String(item.itemPedidoId),
      discoId: item.discoId,
      titulo: item.titulo,
      artista: item.artista,
      coverSrc: item.capaMiniaturaUrl ?? item.capaUrl,
      precoUnitario: item.precoUnitario,
      quantidade: item.quantidade,
    })),
    valor: bruta.valor,
    cupomGerado: bruta.cupomGerado ? paraCupom(bruta.cupomGerado) : null,
  };
}

export interface SolicitacaoTroca {
  pedidoId: string;
  clienteId: string;
  motivo: string;
  /** RN0041: a compra inteira dispensa a lista de itens. */
  compraInteira: boolean;
  itens: { itemPedidoId: string; quantidade: number }[];
}

/** RF0041, RN0041 e RN0043: nasce EM TROCA; a recusa vem como ErroApi. */
export async function solicitarTroca(solicitacao: SolicitacaoTroca): Promise<TrocaPedido> {
  const bruta = await requisitar<TrocaApi>('/trocas', {
    method: 'POST',
    body: JSON.stringify({
      pedidoId: Number(solicitacao.pedidoId),
      clienteId: Number(solicitacao.clienteId),
      motivo: solicitacao.motivo,
      compraInteira: solicitacao.compraInteira,
      itens: solicitacao.compraInteira
        ? []
        : solicitacao.itens.map(({ itemPedidoId, quantidade }) => ({
            itemPedidoId: Number(itemPedidoId),
            quantidade,
          })),
    }),
  });
  return paraTroca(bruta);
}

/** RF0043: todas as trocas, a mais recente primeiro. */
export async function listarTrocas(): Promise<TrocaPedido[]> {
  const brutas = await requisitar<TrocaApi[]>('/trocas');
  return brutas.map(paraTroca);
}

/** RF0042 (TROCA AUTORIZADA) e RF0044 (TROCADO, informando se os itens voltam ao estoque). */
export async function avancarTroca(
  id: string,
  status: 'TROCA AUTORIZADA' | 'TROCADO',
  retornoEstoque?: boolean,
): Promise<TrocaPedido> {
  const bruta = await requisitar<TrocaApi>(`/trocas/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: { descricao: status }, retornoEstoque }),
  });
  return paraTroca(bruta);
}
