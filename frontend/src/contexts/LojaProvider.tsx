import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Cliente } from '../types/cliente';
import type { Disco } from '../types/disco';
import type { EntradaEstoque } from '../types/inventario';
import type { ItemCarrinho } from '../types/carrinho';
import type { Cupom } from '../types/cupom';
import type { Pedido, ValidacaoPagamento } from '../types/pedido';
import { gerarCupons } from '../utils/cuponsMock';
import { gerarPedidos } from '../utils/pedidosMock';
import { FILTROS_VAZIOS } from '../utils/filtrarClientes';
import { listarClientes } from '../services/clientesService';
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

function ler<T>(nome: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(`33rpm:${nome}`);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(nome: string, valor: unknown): void {
  localStorage.setItem(`33rpm:${nome}`, JSON.stringify(valor));
}

export default function LojaProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [discos, setDiscos] = useState<Disco[]>(() => ler('discos', discosMock));
  const [entradas, setEntradas] = useState<EntradaEstoque[]>(() =>
    ler('entradas', entradasEstoqueMock),
  );
  // Clientes vêm da API; só eles saíram do mock até aqui
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [erroClientes, setErroClientes] = useState<string | null>(null);
  const [clienteAtivoId, setClienteAtivoId] = useState<string | null>(() =>
    ler('sessao', null),
  );
  // um carrinho por cliente, mais o do admin quando nenhum perfil está simulado
  const [carrinhos, setCarrinhos] = useState<Record<string, ItemCarrinho[]>>(() =>
    ler('carrinhos', {}),
  );
  const [cupons, setCupons] = useState<Cupom[]>(() => ler('cupons', []));
  const [carrinhoAtualizadoEm, setCarrinhoAtualizadoEm] = useState<string | null>(
    () => ler('carrinhoAtualizadoEm', null),
  );
  const [itensExpirados, setItensExpirados] = useState<ItemCarrinho[]>([]);
  const [agora, setAgora] = useState(() => Date.now());
  const [pedidos, setPedidos] = useState<Pedido[]>(() => ler('pedidos', []));

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

  const iniciarSessao = useCallback((cliente: Cliente) => {
    setClientes((atuais) =>
      atuais.some((candidato) => candidato.id === cliente.id)
        ? atuais.map((candidato) =>
            candidato.id === cliente.id ? cliente : candidato,
          )
        : [...atuais, cliente],
    );
    setClienteAtivoId(cliente.id);
  }, []);

  const recarregarClientes = useCallback(async () => {
    try {
      setClientes(await listarClientes(FILTROS_VAZIOS));
      setErroClientes(null);
    } catch (erro) {
      setErroClientes(
        erro instanceof Error ? erro.message : 'Falha ao carregar os clientes.',
      );
    }
  }, []);

  useEffect(() => {
    // carga inicial dos clientes a partir da API
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recarregarClientes();
  }, [recarregarClientes]);

  /**
   * Pedidos e cupons continuam mockados, mas apontam para clientes do banco:
   * se os ids não baterem — banco recriado, por exemplo — a massa é regerada.
   */
  useEffect(() => {
    if (clientes.length === 0) return;
    const ids = new Set(clientes.map((cliente) => cliente.id));

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPedidos((atuais) =>
      atuais.length > 0 && atuais.every((pedido) => ids.has(pedido.clienteId))
        ? atuais
        : gerarPedidos(clientes),
    );
    setCupons((atuais) =>
      atuais.length > 0 &&
      atuais.every((cupom) => cupom.clienteId === null || ids.has(cupom.clienteId))
        ? atuais
        : gerarCupons(clientes),
    );
  }, [clientes]);

  useEffect(() => gravar('discos', discos), [discos]);
  useEffect(() => gravar('entradas', entradas), [entradas]);
  useEffect(() => gravar('carrinhos', carrinhos), [carrinhos]);
  useEffect(() => gravar('sessao', clienteAtivoId), [clienteAtivoId]);
  useEffect(() => gravar('cupons', cupons), [cupons]);
  useEffect(
    () => gravar('carrinhoAtualizadoEm', carrinhoAtualizadoEm),
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
  useEffect(() => gravar('pedidos', pedidos), [pedidos]);


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
      recarregarClientes,
      erroClientes,
      clienteAtivo,
      entrarComoCliente,
      iniciarSessao,
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
      recarregarClientes,
      erroClientes,
      clienteAtivo,
      entrarComoCliente,
      iniciarSessao,
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
