import { createContext, useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Cliente } from '../types/cliente';
import type { Disco } from '../types/disco';
import type { ItemCarrinho } from '../types/carrinho';
import type { Cupom } from '../types/cupom';
import type { Notificacao } from '../types/notificacao';
import type { Pedido, PedidoCliente, TrocaPedido } from '../types/pedido';
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
  /** Massa de demonstração do Dashboard e da recomendação, não do cliente. */
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
  /** RN0046: notificações do cliente da sessão, a mais recente primeiro. */
  minhasNotificacoes: Notificacao[];
  marcarNotificacaoComoLida: (id: string) => Promise<void>;
  /** Curadoria › Pedidos: compras e trocas de todos os clientes, numa sessão de administrador. */
  pedidosCuradoria: PedidoCliente[];
  trocasCuradoria: TrocaPedido[];
  carregandoCuradoria: boolean;
  erroCuradoria: string | null;
  recarregarCuradoria: () => Promise<void>;
  /** Os itens que bloqueiam estoque no servidor (RN0044). */
  carrinho: ItemCarrinho[];
  itensNoCarrinho: number;
  /** Verdadeiro até a primeira resposta do carrinho do cliente da sessão. */
  carregandoCarrinho: boolean;
  /** RN0044: quando o bloqueio vence, no relógio do navegador; null com o carrinho vazio. */
  carrinhoExpiraEm: number | null;
  prazoReservaMinutos: number;
  avisoReservaMinutos: number;
  /** RNF0042: itens que saíram pelo prazo, para a tela reoferecer. */
  itensExpirados: ItemCarrinho[];
  /** Inclui de novo cada item expirado; resolve com as recusas do servidor. */
  readicionarExpirados: () => Promise<string[]>;
  descartarItensExpirados: () => Promise<string[]>;
  /** RN0032: o servidor ajusta o carrinho ao estoque livre; resolve com o que mudou. */
  revalidarCarrinho: () => Promise<string[]>;
  recarregarCarrinho: () => Promise<void>;
  /**
   * RN0031 e RN0044: o servidor soma ao que já está no carrinho, confere o estoque livre
   * e renova o prazo. Resolve com as mensagens da recusa; vazio quando o carrinho mudou.
   */
  adicionarAoCarrinho: (discoId: number, quantidade: number) => Promise<string[]>;
  /** A quantidade final do item; aumentar renova o prazo, reduzir não (RN0044); zero remove. */
  alterarQuantidade: (discoId: number, quantidade: number) => Promise<string[]>;
  removerDoCarrinho: (discoId: number) => Promise<string[]>;
  limparCarrinho: () => Promise<string[]>;
}

export const LojaContext = createContext<Loja | null>(null);

export function useLoja(): Loja {
  const loja = useContext(LojaContext);
  if (!loja) throw new Error('useLoja precisa estar dentro de LojaProvider');
  return loja;
}
