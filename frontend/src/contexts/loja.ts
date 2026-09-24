import { createContext, useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Cliente } from '../types/cliente';
import type { Disco } from '../types/disco';
import type { EntradaEstoque } from '../types/inventario';
import type { ItemCarrinho } from '../types/carrinho';
import type { Cupom } from '../types/cupom';
import type { Pedido, ValidacaoPagamento } from '../types/pedido';
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
  discos: Disco[];
  setDiscos: Dispatch<SetStateAction<Disco[]>>;
  entradas: EntradaEstoque[];
  setEntradas: Dispatch<SetStateAction<EntradaEstoque[]>>;
  cupons: Cupom[];
  setCupons: Dispatch<SetStateAction<Cupom[]>>;
  pedidos: Pedido[];
  setPedidos: Dispatch<SetStateAction<Pedido[]>>;
  registrarPedido: (pedido: Pedido, cupomTroca: Cupom | null) => void;
  atualizarPedido: (pedidoId: string, mudanca: Partial<Pedido>) => void;
  cancelarPedido: (pedidoId: string) => void;
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
  adicionarAoCarrinho: (discoId: number, quantidade: number) => void;
  alterarQuantidade: (discoId: number, quantidade: number) => void;
  removerDoCarrinho: (discoId: number) => void;
  limparCarrinho: () => void;
}

export const LojaContext = createContext<Loja | null>(null);

export function useLoja(): Loja {
  const loja = useContext(LojaContext);
  if (!loja) throw new Error('useLoja precisa estar dentro de LojaProvider');
  return loja;
}
