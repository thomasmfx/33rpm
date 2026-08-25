import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Cliente } from '../types/cliente';
import type { Disco } from '../types/disco';
import type { EntradaEstoque } from '../types/inventario';
import type { ItemCarrinho } from '../types/carrinho';
import type { Cupom } from '../types/cupom';
import type { Pedido, ValidacaoPagamento } from '../types/pedido';
import { mockClientes } from '../utils/clientesMock';
import { cuponsMock } from '../utils/cuponsMock';
import { pedidosMock } from '../utils/pedidosMock';
import { discosMock } from '../utils/discosMock';
import { entradasEstoqueMock } from '../utils/estoqueMock';
import { darBaixaEmEstoque } from '../utils/checkout';
import { devolverAoEstoque } from '../utils/pedido';
import {
  ajustarAoEstoque,
  estaExpirado,
  minutosRestantes,
} from '../utils/carrinho';
import { LojaContext } from './loja';

// subir a versão invalida o que está salvo, sem código de migração:
// a chave muda e o localStorage antigo simplesmente deixa de ser lido
const VERSAO = 8;

/**
 * A chave carrega uma impressão do próprio mock: mudou o mock, muda a chave, e
 * a cópia salva é abandonada sozinha. Sem isso, todo ajuste nos dados semente
 * exigia lembrar de subir a VERSAO à mão — e esquecer disso fazia a tela seguir
 * mostrando o acervo antigo sem nenhum erro aparente.
 */
function impressao(valor: unknown): string {
  const texto = JSON.stringify(valor) ?? '';
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function chaveDe(chave: string, padrao: unknown): string {
  return `33rpm:v${VERSAO}:${chave}:${impressao(padrao)}`;
}

/**
 * O `valido` é a rede de segurança para o resto: dado salvo é entrada externa e
 * nunca passou pelo TypeScript, então formato torto é descartado em vez de
 * propagado até a tela quebrar com undefined.
 */
function ler<T>(chave: string, padrao: T, valido?: (dado: T) => boolean): T {
  try {
    const bruto = localStorage.getItem(chaveDe(chave, padrao));
    if (!bruto) return padrao;

    const dado = JSON.parse(bruto) as T;
    return valido && !valido(dado) ? padrao : dado;
  } catch {
    return padrao;
  }
}

function listaCom<T>(campos: (keyof T)[]) {
  return (dado: unknown): dado is T[] =>
    Array.isArray(dado) &&
    (dado.length === 0 ||
      campos.every((campo) => (dado[0] as T)[campo] !== undefined));
}

function gravar(chave: string, padrao: unknown, valor: unknown): void {
  const atual = chaveDe(chave, padrao);

  // chaves de mocks anteriores nunca mais serão lidas: varrer evita acumular
  // cópias mortas do acervo a cada ajuste nos dados semente
  for (const outra of Object.keys(localStorage)) {
    if (outra.includes(`:${chave}:`) && outra !== atual) {
      localStorage.removeItem(outra);
    }
  }

  localStorage.setItem(atual, JSON.stringify(valor));
}

export default function LojaProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [discos, setDiscos] = useState<Disco[]>(() => ler(
      'discos',
      discosMock,
      listaCom<Disco>(['formatoId', 'edicaoIds', 'dimensoes', 'estoque']),
    ));
  const [entradas, setEntradas] = useState<EntradaEstoque[]>(() =>
    ler(
      'entradas',
      entradasEstoqueMock,
      listaCom<EntradaEstoque>(['discoId', 'valorCusto', 'fornecedor']),
    ),
  );
  const [clientes, setClientes] = useState<Cliente[]>(() => ler(
      'clientes',
      mockClientes,
      listaCom<Cliente>(['genero', 'telefone', 'enderecos', 'cartoes']),
    ));
  const [clienteAtivoId, setClienteAtivoId] = useState<string | null>(() =>
    ler('sessao', null),
  );
  // um carrinho por cliente, mais o do admin quando nenhum perfil está simulado
  const [carrinhos, setCarrinhos] = useState<Record<string, ItemCarrinho[]>>(() =>
    ler('carrinhos', {}),
  );
  const [cupons, setCupons] = useState<Cupom[]>(() => ler(
      'cupons',
      cuponsMock,
      listaCom<Cupom>(['codigo', 'tipo', 'valor']),
    ));
  const [carrinhoAtualizadoEm, setCarrinhoAtualizadoEm] = useState<string | null>(
    () => ler('carrinhoAtualizadoEm', null),
  );
  const [itensExpirados, setItensExpirados] = useState<ItemCarrinho[]>([]);
  const [agora, setAgora] = useState(() => Date.now());
  const [pedidos, setPedidos] = useState<Pedido[]>(() => ler(
      'pedidos',
      pedidosMock,
      listaCom<Pedido>(['itens', 'status', 'enderecoEntrega', 'troca']),
    ));

  // RF0023: inativar o cliente derruba a sessão dele na hora
  const clienteAtivo =
    clientes.find(
      (cliente) => cliente.id === clienteAtivoId && cliente.isAtivo,
    ) ?? null;
  const chaveCarrinho = clienteAtivo?.id ?? 'admin';
  const carrinho = useMemo(
    () => carrinhos[chaveCarrinho] ?? [],
    [carrinhos, chaveCarrinho],
  );

  const setCarrinho = useCallback(
    (atualizar: (itens: ItemCarrinho[]) => ItemCarrinho[]) => {
      setCarrinhos((todos) => ({
        ...todos,
        [chaveCarrinho]: atualizar(todos[chaveCarrinho] ?? []),
      }));
    },
    [chaveCarrinho],
  );

  // RF0023: cliente inativo perde o acesso à loja
  const entrarComoCliente = useCallback(
    (clienteId: string) => {
      const cliente = clientes.find((candidato) => candidato.id === clienteId);
      if (cliente?.isAtivo) setClienteAtivoId(clienteId);
    },
    [clientes],
  );

  const sairDaSessao = useCallback(() => setClienteAtivoId(null), []);

  useEffect(() => gravar('discos', discosMock, discos), [discos]);
  useEffect(() => gravar('entradas', entradasEstoqueMock, entradas), [entradas]);
  useEffect(() => gravar('carrinhos', {}, carrinhos), [carrinhos]);
  useEffect(() => gravar('clientes', mockClientes, clientes), [clientes]);
  useEffect(() => gravar('sessao', null, clienteAtivoId), [clienteAtivoId]);
  useEffect(() => gravar('cupons', cuponsMock, cupons), [cupons]);
  useEffect(
    () => gravar('carrinhoAtualizadoEm', null, carrinhoAtualizadoEm),
    [carrinhoAtualizadoEm],
  );

  /**
   * Um relógio só para toda a árvore: faz a contagem do bloqueio andar e, no
   * mesmo tique, derruba o carrinho vencido (RN0044) guardando o que saiu para
   * a tela poder reoferecer (RN0045 e RNF0042).
   *
   * A verificação mora no callback do timer, não no corpo do efeito: setState
   * síncrono em efeito encadeia renders, e aqui a fonte da mudança é externa.
   */
  useEffect(() => {
    const intervalo = setInterval(() => {
      const momento = Date.now();
      setAgora(momento);

      if (carrinho.length > 0 && estaExpirado(carrinhoAtualizadoEm, momento)) {
        setItensExpirados(carrinho);
        setCarrinho(() => []);
        setCarrinhoAtualizadoEm(null);
      }
    }, 15_000);

    return () => clearInterval(intervalo);
  }, [carrinho, carrinhoAtualizadoEm, setCarrinho]);
  useEffect(() => gravar('pedidos', pedidosMock, pedidos), [pedidos]);


  // RN0031: o carrinho nunca passa do que existe em estoque
  const limitarAoEstoque = useCallback(
    (discoId: number, quantidade: number) => {
      const disco = discos.find((candidato) => candidato.id === discoId);
      return Math.max(0, Math.min(quantidade, disco?.estoque ?? 0));
    },
    [discos],
  );

  const adicionarAoCarrinho = useCallback(
    (discoId: number, quantidade: number) => {
      // o relógio precisa acompanhar, senão a primeira contagem sai defasada
      setAgora(Date.now());
      setCarrinhoAtualizadoEm(new Date().toISOString());
      setCarrinho((itens) => {
        const existente = itens.find((item) => item.discoId === discoId);
        const total = limitarAoEstoque(
          discoId,
          (existente?.quantidade ?? 0) + quantidade,
        );
        if (total === 0) return itens;

        return existente
          ? itens.map((item) =>
              item.discoId === discoId ? { ...item, quantidade: total } : item,
            )
          : [...itens, { discoId, quantidade: total }];
      });
    },
    [limitarAoEstoque, setCarrinho],
  );

  const alterarQuantidade = useCallback(
    (discoId: number, quantidade: number) => {
      const total = limitarAoEstoque(discoId, quantidade);
      setCarrinho((itens) =>
        total === 0
          ? itens.filter((item) => item.discoId !== discoId)
          : itens.map((item) =>
              item.discoId === discoId ? { ...item, quantidade: total } : item,
            ),
      );
    },
    [limitarAoEstoque, setCarrinho],
  );

  const removerDoCarrinho = useCallback(
    (discoId: number) => {
      setCarrinho((itens) => itens.filter((item) => item.discoId !== discoId));
    },
    [setCarrinho],
  );

  const limparCarrinho = useCallback(() => setCarrinho(() => []), [setCarrinho]);

  const sincronizarCarrinho = useCallback(() => {
    const resultado = ajustarAoEstoque(carrinho, discos);
    if (resultado.ajustes.length > 0) {
      setCarrinho(() => resultado.carrinho);
    }
    return resultado.ajustes;
  }, [carrinho, discos, setCarrinho]);

  const descartarItensExpirados = useCallback(() => setItensExpirados([]), []);

  const minutosParaExpirar =
    carrinho.length > 0 ? minutosRestantes(carrinhoAtualizadoEm, agora) : null;



  /**
   * RF0038 + RF0053: fecha a compra num movimento só — grava o pedido, baixa o
   * estoque, queima os cupons gastos, cria o cupom de troca do troco (RN0036) e
   * esvazia o carrinho. Separar isso deixaria estados intermediários visíveis.
   */
  const registrarPedido = useCallback(
    (pedido: Pedido, cupomTroca: Cupom | null) => {
      const gastos = new Set(pedido.cupons.map((cupom) => cupom.cupomId));

      setPedidos((atuais) => [pedido, ...atuais]);
      setDiscos((atuais) => darBaixaEmEstoque(atuais, pedido.itens));
      setCupons((atuais) => {
        const queimados = atuais.map((cupom) =>
          gastos.has(cupom.id) ? { ...cupom, isUtilizado: true } : cupom,
        );
        return cupomTroca ? [...queimados, cupomTroca] : queimados;
      });
      setCarrinho(() => []);
    },
    [setCarrinho],
  );

  const atualizarPedido = useCallback(
    (pedidoId: string, mudanca: Partial<Pedido>) => {
      setPedidos((atuais) =>
        atuais.map((pedido) =>
          pedido.id === pedidoId ? { ...pedido, ...mudanca } : pedido,
        ),
      );
    },
    [],
  );

  /** RN0028: item de compra não efetivada volta para o estoque. */
  const cancelarPedido = useCallback(
    (pedidoId: string) => {
      const pedido = pedidos.find((candidato) => candidato.id === pedidoId);
      if (!pedido) return;

      setDiscos((atuais) => devolverAoEstoque(atuais, pedido.itens));
      setPedidos((atuais) =>
        atuais.map((candidato) =>
          candidato.id === pedidoId
            ? { ...candidato, status: 'CANCELADO' as const }
            : candidato,
        ),
      );
    },
    [pedidos],
  );

  /**
   * RN0037 e RN0038: validada a forma de pagamento, a compra vira PAGAMENTO
   * REALIZADO ou PAGAMENTO RECUSADO. Na recusa os itens voltam ao estoque,
   * porque a RN0028 só admite baixa em compra efetivada.
   */
  const resolverPagamento = useCallback(
    (pedidoId: string, validacao: ValidacaoPagamento) => {
      const pedido = pedidos.find((candidato) => candidato.id === pedidoId);
      if (!pedido) return;

      if (!validacao.aprovado) {
        setDiscos((atuais) => devolverAoEstoque(atuais, pedido.itens));
      }

      setPedidos((atuais) =>
        atuais.map((candidato) =>
          candidato.id === pedidoId
            ? {
                ...candidato,
                status: validacao.aprovado
                  ? ('PAGAMENTO REALIZADO' as const)
                  : ('PAGAMENTO RECUSADO' as const),
                validacaoPagamento: validacao,
              }
            : candidato,
        ),
      );
    },
    [pedidos],
  );

  /**
   * RF0044, RF0045 e RF0054: ao confirmar o recebimento, o administrador diz se
   * os itens voltam ao estoque, e o cliente ganha o cupom de troca do valor.
   */
  const receberItensDeTroca = useCallback(
    (pedidoId: string, retornarAoEstoque: boolean, cupom: Cupom) => {
      const pedido = pedidos.find((candidato) => candidato.id === pedidoId);
      if (!pedido?.troca) return;

      if (retornarAoEstoque) {
        setDiscos((atuais) => devolverAoEstoque(atuais, pedido.troca!.itens));
      }

      setPedidos((atuais) =>
        atuais.map((candidato) =>
          candidato.id === pedidoId && candidato.troca
            ? {
                ...candidato,
                status: 'ITEM RECEBIDO' as const,
                troca: {
                  ...candidato.troca,
                  retornouAoEstoque: retornarAoEstoque,
                  cupomGeradoId: cupom.id,
                },
              }
            : candidato,
        ),
      );
      setCupons((atuais) => [...atuais, cupom]);
    },
    [pedidos],
  );

  const valor = useMemo(
    () => ({
      clientes,
      setClientes,
      clienteAtivo,
      entrarComoCliente,
      sairDaSessao,
      discos,
      setDiscos,
      entradas,
      setEntradas,
      cupons,
      setCupons,
      pedidos,
      setPedidos,
      registrarPedido,
      atualizarPedido,
      cancelarPedido,
      resolverPagamento,
      receberItensDeTroca,
      carrinho,
      itensNoCarrinho: carrinho.reduce((total, item) => total + item.quantidade, 0),
      carrinhoAtualizadoEm,
      minutosParaExpirar,
      itensExpirados,
      descartarItensExpirados,
      sincronizarCarrinho,
      adicionarAoCarrinho,
      alterarQuantidade,
      removerDoCarrinho,
      limparCarrinho,
    }),
    [
      clientes,
      clienteAtivo,
      entrarComoCliente,
      sairDaSessao,
      discos,
      entradas,
      cupons,
      pedidos,
      registrarPedido,
      atualizarPedido,
      cancelarPedido,
      resolverPagamento,
      receberItensDeTroca,
      carrinho,
      carrinhoAtualizadoEm,
      minutosParaExpirar,
      itensExpirados,
      descartarItensExpirados,
      sincronizarCarrinho,
      adicionarAoCarrinho,
      alterarQuantidade,
      removerDoCarrinho,
      limparCarrinho,
    ],
  );

  return <LojaContext.Provider value={valor}>{children}</LojaContext.Provider>;
}
