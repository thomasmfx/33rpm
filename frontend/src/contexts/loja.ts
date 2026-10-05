import { createContext, useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Cliente } from '../types/cliente';
import type { Disco } from '../types/disco';
import type { ItemCarrinho } from '../types/carrinho';
import type { Cupom } from '../types/cupom';
import type { Pedido, PedidoCliente, ValidacaoPagamento } from '../types/pedido';
import type { AjusteCarrinho } from '../utils/carrinho';
import type { Administrador, RespostaSessao, Sessao } from '../types/sessao';

export interface Loja {
  clientes: Cliente[];
  /** Recarrega a lista a partir da API; usada depois de cada escrita. */
  recarregarClientes: () => Promise<void>;
  erroClientes: string | null;
  /** Verdadeiro até a primeira resposta da API, com sucesso ou erro. */
  carregandoClientes: boolean;
  /** Clientes ou, numa sessão de administrador, os dados dele ainda a caminho. */
  carregandoSessao: boolean;
  sessao: Sessao | null;
  clienteAtivo: Cliente | null;
  administradorAtivo: Administrador | null;
  atualizarAdministrador: (administrador: Administrador) => void;
  entrarComoCliente: (clienteId: string) => void;
  /** Sessão aberta por login ou cadastro: quem entra já vem autenticado do servidor. */
  iniciarSessao: (resposta: RespostaSessao) => void;
  sairDaSessao: () => void;
  /** O acervo inteiro, ativos e inativos, vindo da API. */
  discos: Disco[];
  /** Verdadeiro até a primeira resposta da API, como carregandoClientes. */
  carregandoDiscos: boolean;
  erroDiscos: string | null;
  recarregarDiscos: () => Promise<void>;
  /** Massa de demonstração da curadoria (Pedidos, Dashboard e recomendação), não do cliente. */
  cupons: Cupom[];
  setCupons: Dispatch<SetStateAction<Cupom[]>>;
  /** Massa de demonstração da curadoria (Pedidos, Dashboard e recomendação), não do cliente. */
  pedidos: Pedido[];
  setPedidos: Dispatch<SetStateAction<Pedido[]>>;
  /** Pedidos do cliente da sessão, gravados no servidor, mais recente primeiro. */
  meusPedidos: PedidoCliente[];
  carregandoMeusPedidos: boolean;
  erroMeusPedidos: string | null;
  recarregarPedidos: () => Promise<void>;
  /** Cupons do cliente da sessão, usados e disponíveis, vindos do servidor. */
  meusCupons: Cupom[];
  carregandoMeusCupons: boolean;
  erroMeusCupons: string | null;
  recarregarCupons: () => Promise<void>;
  atualizarPedido: (pedidoId: string, mudanca: Partial<Pedido>) => void;
  resolverPagamento: (pedidoId: string, validacao: ValidacaoPagamento) => void;
  receberItensDeTroca: (
    pedidoId: string,
    retornarAoEstoque: boolean,
    cupom: Cupom,
  ) => void;
  carrinho: ItemCarrinho[];
  itensNoCarrinho: number;
  /** RN0044: quando o bloqueio dos itens do carrinho expira. */
  carrinhoAtualizadoEm: string | null;
  minutosParaExpirar: number | null;
  /** RN0045: itens derrubados pela expiração, para a tela poder reoferecê-los. */
  itensExpirados: ItemCarrinho[];
  descartarItensExpirados: () => void;
  /** RN0032: corrige o carrinho contra o estoque e diz o que mudou. */
  sincronizarCarrinho: () => AjusteCarrinho[];
  /**
   * RN0031: o item só entra depois que o servidor aceita a quantidade total do
   * disco. Resolve com as mensagens da recusa; vazio quando o carrinho mudou.
   */
  adicionarAoCarrinho: (discoId: number, quantidade: number) => Promise<string[]>;
  /** Como adicionarAoCarrinho, com a quantidade final do item; zero remove sem consultar. */
  alterarQuantidade: (discoId: number, quantidade: number) => Promise<string[]>;
  removerDoCarrinho: (discoId: number) => void;
  limparCarrinho: () => void;
}

export const LojaContext = createContext<Loja | null>(null);

export function useLoja(): Loja {
  const loja = useContext(LojaContext);
  if (!loja) throw new Error('useLoja precisa estar dentro de LojaProvider');
  return loja;
}
