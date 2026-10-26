import type { Cartao, Endereco } from '../types/cliente';
import type { ItemCarrinho } from '../types/carrinho';
import type { Cotacao, PedidoCliente } from '../types/pedido';
import { ErroApi, requisitar } from './api';
import { enderecoParaApi } from './clientesService';
import { paraCupom } from './cuponsService';
import type { CupomApi } from './cuponsService';
import { paraTroca } from './trocasService';
import type { TrocaApi } from './trocasService';

/** O que o cliente escolheu no checkout, no vocabulário da tela. */
export interface EscolhaPedido {
  clienteId: string;
  itens: ItemCarrinho[];
  /** Endereço do perfil, pelo id, ou um novo digitado no checkout. */
  endereco: { id: string } | { novo: Endereco; salvarNoPerfil: boolean } | null;
  pagamentos: { cartao: Cartao; novo: boolean; salvarNoPerfil: boolean; valor: number }[];
  cupomIds: string[];
}

/** O corpo é o mesmo na cotação e na criação: o servidor recalcula tudo pelos preços do banco. */
export function corpoDoPedido(escolha: EscolhaPedido) {
  const { endereco } = escolha;

  return {
    clienteId: Number(escolha.clienteId),
    itens: escolha.itens.map(({ discoId, quantidade }) => ({ discoId, quantidade })),
    ...(endereco && 'id' in endereco ? { enderecoId: Number(endereco.id) } : {}),
    ...(endereco && 'novo' in endereco
      ? {
          enderecoNovo: enderecoParaApi(endereco.novo),
          salvarEnderecoNoPerfil: endereco.salvarNoPerfil,
        }
      : {}),
    pagamentos: escolha.pagamentos.map(({ cartao, novo, salvarNoPerfil, valor }) =>
      novo
        ? {
            cartaoNovo: {
              numero: cartao.numero,
              nomeImpresso: cartao.nomeImpresso,
              codigoSeguranca: cartao.codigoSeguranca,
              bandeira: { desc: cartao.bandeira },
            },
            salvarNoPerfil,
            valor,
          }
        : { cartaoId: Number(cartao.id), valor },
    ),
    cupons: escolha.cupomIds.map((id) => ({ id: Number(id) })),
  };
}

export type CorpoPedido = ReturnType<typeof corpoDoPedido>;

interface PedidoApi {
  id: number;
  dataCadastro: string;
  clienteId: number;
  status: { id?: number; descricao: string };
  subtotal: number;
  frete: number;
  total: number;
  troco: number;
  enderecoId?: number | null;
  enderecoEntrega: {
    nome: string;
    tipoResidencia: string;
    tipoLogradouro: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cep: string;
    cidade: string;
    uf: string;
    pais: string;
    observacoes?: string | null;
  };
  itens: {
    id: number;
    discoId: number;
    titulo: string;
    artista: string;
    capaUrl: string;
    capaMiniaturaUrl?: string | null;
    precoUnitario: number;
    quantidade: number;
  }[];
  pagamentos: {
    id: number;
    cartaoId?: number | null;
    bandeira: { desc: string };
    finalNumero: string;
    valor: number;
  }[];
  cupons: CupomApi[];
  cupomGerado?: CupomApi | null;
  validacao?: { aprovado: boolean; motivo?: string | null; dataCadastro: string } | null;
  trocas?: TrocaApi[];
}

function paraPedidoCliente(bruto: PedidoApi): PedidoCliente {
  const entrega = bruto.enderecoEntrega;

  return {
    id: String(bruto.id),
    clienteId: String(bruto.clienteId),
    data: bruto.dataCadastro,
    status: bruto.status.descricao,
    itens: bruto.itens.map((item) => ({
      id: String(item.id),
      discoId: item.discoId,
      titulo: item.titulo,
      artista: item.artista,
      coverSrc: item.capaMiniaturaUrl ?? item.capaUrl,
      precoUnitario: item.precoUnitario,
      quantidade: item.quantidade,
    })),
    enderecoEntrega: {
      id: bruto.enderecoId ? String(bruto.enderecoId) : '',
      nome: entrega.nome,
      tipo: 'entrega',
      tipoResidencia: entrega.tipoResidencia,
      tipoLogradouro: entrega.tipoLogradouro,
      logradouro: entrega.logradouro,
      numero: entrega.numero,
      bairro: entrega.bairro,
      cep: entrega.cep,
      cidade: entrega.cidade,
      estado: entrega.uf,
      pais: entrega.pais,
      observacoes: entrega.observacoes ?? '',
    },
    subtotal: bruto.subtotal,
    frete: bruto.frete,
    total: bruto.total,
    cupons: bruto.cupons.map((cupom) => ({
      cupomId: String(cupom.id),
      codigo: cupom.codigo,
      valor: cupom.valor,
    })),
    cartoes: bruto.pagamentos.map((pagamento) => ({
      // cartão só deste pedido não tem id de perfil
      cartaoId: pagamento.cartaoId ? String(pagamento.cartaoId) : `avulso-${pagamento.id}`,
      bandeira: pagamento.bandeira.desc,
      ultimosDigitos: pagamento.finalNumero,
      valor: pagamento.valor,
    })),
    troco: bruto.troco,
    cupomGerado: bruto.cupomGerado ? paraCupom(bruto.cupomGerado) : null,
    validacao: bruto.validacao
      ? {
          aprovado: bruto.validacao.aprovado,
          motivo: bruto.validacao.motivo ?? null,
          data: bruto.validacao.dataCadastro,
        }
      : null,
    trocas: (bruto.trocas ?? []).map(paraTroca),
  };
}

/** RF0034 e RN0033 a RN0036: sempre 200; o que impede a compra vem em pendencias. */
export async function cotarPedido(corpo: CorpoPedido): Promise<Cotacao> {
  return requisitar<Cotacao>('/pedidos/cotacao', {
    method: 'POST',
    body: JSON.stringify(corpo),
  });
}

/** RF0033 e RF0038: o pedido nasce EM PROCESSAMENTO; na recusa nada é gravado. */
export async function criarPedido(corpo: CorpoPedido): Promise<PedidoCliente> {
  const bruto = await requisitar<PedidoApi>('/pedidos', {
    method: 'POST',
    body: JSON.stringify(corpo),
  });
  return paraPedidoCliente(bruto);
}

/** null quando o pedido não existe. */
export async function buscarPedido(id: string): Promise<PedidoCliente | null> {
  try {
    return paraPedidoCliente(await requisitar<PedidoApi>(`/pedidos/${id}`));
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 404) return null;
    throw erro;
  }
}

/** Mais recente primeiro. */
export async function listarPedidos(clienteId: string): Promise<PedidoCliente[]> {
  const brutos = await requisitar<PedidoApi[]>(`/pedidos?clienteId=${clienteId}`);
  return brutos.map(paraPedidoCliente);
}

/** A curadoria: os pedidos de todos os clientes, mais recente primeiro. */
export async function listarTodosPedidos(): Promise<PedidoCliente[]> {
  const brutos = await requisitar<PedidoApi[]>('/pedidos');
  return brutos.map(paraPedidoCliente);
}

/** RN0039 (EM TRANSPORTE) e RN0040 (ENTREGUE); a recusa vem como ErroApi. */
export async function avancarPedido(
  id: string,
  status: 'EM TRANSPORTE' | 'ENTREGUE',
): Promise<PedidoCliente> {
  const bruto = await requisitar<PedidoApi>(`/pedidos/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: { descricao: status } }),
  });
  return paraPedidoCliente(bruto);
}

/** RN0037 e RN0038: valida agora os pedidos EM PROCESSAMENTO; devolve os que mudaram. */
export async function validarPagamentosPendentes(): Promise<PedidoCliente[]> {
  const brutos = await requisitar<PedidoApi[]>('/pedidos/validacao-pagamento', {
    method: 'POST',
  });
  return brutos.map(paraPedidoCliente);
}
