import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Cliente } from '../types/cliente';
import type { Disco } from '../types/disco';
import type { ItemCarrinho } from '../types/carrinho';
import type { Cupom } from '../types/cupom';
import type { Pedido, ValidacaoPagamento } from '../types/pedido';
import type { Administrador, RespostaSessao, Sessao } from '../types/sessao';
import { gerarCupons } from '../utils/cuponsMock';
import { gerarPedidos } from '../utils/pedidosMock';
import { FILTROS_VAZIOS } from '../utils/filtrarClientes';
import { ErroApi } from '../services/api';
import { listarClientes } from '../services/clientesService';
import { buscarAdministrador } from '../services/administradoresService';
import { listarDiscos } from '../services/discosService';
import { consultarDisponibilidade } from '../services/estoqueService';
import { listarPedidos } from '../services/pedidosService';
import { listarCupons } from '../services/cuponsService';
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

/** A sessão guardava só o id do cliente; esse formato antigo continua valendo. */
function lerSessao(): Sessao | null {
  const bruto = ler<Sessao | string | null>('sessao', null);
  if (typeof bruto === 'string') return { papel: 'cliente', id: bruto };
  return bruto?.papel && bruto.id ? bruto : null;
}

function gravar(nome: string, valor: unknown): void {
  localStorage.setItem(`33rpm:${nome}`, JSON.stringify(valor));
}

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof Error ? erro.message : padrao;
}

/** RN0031: o servidor decide se a quantidade total do disco cabe no estoque. */
async function recusaDoEstoque(discoId: number, quantidade: number): Promise<string[] | null> {
  try {
    await consultarDisponibilidade([{ discoId, quantidade }]);
    return null;
  } catch (erro) {
    return erro instanceof ErroApi ? erro.mensagens : ['Falha ao consultar o estoque.'];
  }
}

/**
 * Lista que pertence ao cliente da sessão. Guarda de quem é o que carregou, como
 * o administrador: trocar de cliente nunca mostra os dados do anterior.
 */
function useDoCliente<T>(
  clienteId: string | null,
  buscar: (clienteId: string) => Promise<T[]>,
  falha: string,
) {
  const [carregado, setCarregado] = useState<{
    clienteId: string;
    itens: T[];
    erro: string | null;
  } | null>(null);

  const recarregar = useCallback(async () => {
    if (!clienteId) return;
    try {
      setCarregado({ clienteId, itens: await buscar(clienteId), erro: null });
    } catch (erro) {
      setCarregado({ clienteId, itens: [], erro: mensagemDe(erro, falha) });
    }
  }, [clienteId, buscar, falha]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recarregar();
  }, [recarregar]);

  const emDia = carregado !== null && carregado.clienteId === clienteId;
  return {
    itens: emDia ? carregado.itens : [],
    carregando: clienteId !== null && !emDia,
    erro: emDia ? carregado.erro : null,
    recarregar,
  };
}

export default function LojaProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [discos, setDiscos] = useState<Disco[]>([]);
  // só a primeira carga, como a dos clientes
  const [carregandoDiscos, setCarregandoDiscos] = useState(true);
  const [erroDiscos, setErroDiscos] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [erroClientes, setErroClientes] = useState<string | null>(null);
  // só a primeira carga: recargas depois de uma escrita não voltam ao esqueleto
  const [carregandoClientes, setCarregandoClientes] = useState(true);
  const [sessao, setSessao] = useState<Sessao | null>(lerSessao);
  // quem carregou por último: id + dados, ou null quando o id não existe mais
  const [administradorCarregado, setAdministradorCarregado] = useState<{
    id: string;
    dados: Administrador | null;
  } | null>(null);
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
    sessao?.papel === 'cliente'
      ? (clientes.find((cliente) => cliente.id === sessao.id && cliente.isAtivo) ?? null)
      : null;

  const isSessaoDeAdministrador = sessao?.papel === 'administrador';
  const administradorAtivo =
    isSessaoDeAdministrador && administradorCarregado?.id === sessao.id
      ? administradorCarregado.dados
      : null;
  const carregandoAdministrador =
    isSessaoDeAdministrador && administradorCarregado?.id !== sessao.id;
  const clienteAtivoId = clienteAtivo?.id ?? null;
  const meusPedidos = useDoCliente(
    clienteAtivoId,
    listarPedidos,
    'Falha ao carregar os pedidos.',
  );
  const meusCupons = useDoCliente(clienteAtivoId, listarCupons, 'Falha ao carregar os cupons.');
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

  // RF0023: cliente inativo perde o acesso à loja. Usado pela curadoria: o
  // administrador deixa a própria sessão e passa a navegar como o cliente.
  const entrarComoCliente = useCallback(
    (clienteId: string) => {
      const cliente = clientes.find((candidato) => candidato.id === clienteId);
      if (cliente?.isAtivo) setSessao({ papel: 'cliente', id: clienteId });
    },
    [clientes],
  );

  const sairDaSessao = useCallback(() => setSessao(null), []);

  const iniciarSessao = useCallback((resposta: RespostaSessao) => {
    if (resposta.papel === 'administrador') {
      setAdministradorCarregado({ id: resposta.administrador.id, dados: resposta.administrador });
      setSessao({ papel: 'administrador', id: resposta.administrador.id });
      return;
    }
    const { cliente } = resposta;
    setClientes((atuais) =>
      atuais.some((candidato) => candidato.id === cliente.id)
        ? atuais.map((candidato) =>
            candidato.id === cliente.id ? cliente : candidato,
          )
        : [...atuais, cliente],
    );
    setSessao({ papel: 'cliente', id: cliente.id });
  }, []);

  const atualizarAdministrador = useCallback((administrador: Administrador) => {
    setAdministradorCarregado({ id: administrador.id, dados: administrador });
  }, []);

  // sessão de administrador aberta em outra visita: os dados vêm da API
  useEffect(() => {
    if (!sessao || sessao.papel !== 'administrador' || administradorCarregado?.id === sessao.id) {
      return;
    }
    let cancelado = false;
    buscarAdministrador(sessao.id)
      .then((dados) => {
        if (!cancelado) setAdministradorCarregado({ id: sessao.id, dados });
      })
      .catch(() => {
        if (!cancelado) setAdministradorCarregado({ id: sessao.id, dados: null });
      });
    return () => {
      cancelado = true;
    };
  }, [sessao, administradorCarregado]);

  const recarregarClientes = useCallback(async () => {
    try {
      setClientes(await listarClientes(FILTROS_VAZIOS));
      setErroClientes(null);
    } catch (erro) {
      setErroClientes(
        erro instanceof Error ? erro.message : 'Falha ao carregar os clientes.',
      );
    } finally {
      setCarregandoClientes(false);
    }
  }, []);

  useEffect(() => {
    // carga inicial dos clientes a partir da API
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recarregarClientes();
  }, [recarregarClientes]);

  const recarregarDiscos = useCallback(async () => {
    try {
      // a carga do acervo segue a ordem do mock: pelo id, a vitrine sai como foi montada
      setDiscos((await listarDiscos()).sort((a, b) => a.id - b.id));
      setErroDiscos(null);
    } catch (erro) {
      setErroDiscos(mensagemDe(erro, 'Falha ao carregar o acervo.'));
    } finally {
      setCarregandoDiscos(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recarregarDiscos();
  }, [recarregarDiscos]);

  /**
   * A massa de demonstração da curadoria continua mockada, mas aponta para
   * clientes e discos do banco: se os ids não baterem — banco recriado, por
   * exemplo — ela é regerada.
   */
  useEffect(() => {
    if (clientes.length === 0 || discos.length === 0) return;
    const ids = new Set(clientes.map((cliente) => cliente.id));
    const idsDiscos = new Set(discos.map((disco) => disco.id));

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPedidos((atuais) =>
      atuais.length > 0 &&
      atuais.every(
        (pedido) =>
          ids.has(pedido.clienteId) && pedido.itens.every((item) => idsDiscos.has(item.discoId)),
      )
        ? atuais
        : gerarPedidos(clientes, discos),
    );
    setCupons((atuais) =>
      atuais.length > 0 &&
      atuais.every((cupom) => cupom.clienteId === null || ids.has(cupom.clienteId))
        ? atuais
        : gerarCupons(clientes),
    );
  }, [clientes, discos]);

  useEffect(() => gravar('carrinhos', carrinhos), [carrinhos]);
  useEffect(() => gravar('sessao', sessao), [sessao]);
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


  const adicionarAoCarrinho = useCallback(
    async (discoId: number, quantidade: number) => {
      const total =
        (carrinho.find((item) => item.discoId === discoId)?.quantidade ?? 0) + quantidade;
      const recusa = await recusaDoEstoque(discoId, total);
      if (recusa) return recusa;

      // o relógio precisa acompanhar, senão a primeira contagem sai defasada
      setAgora(Date.now());
      setCarrinhoAtualizadoEm(new Date().toISOString());
      setCarrinho((itens) =>
        itens.some((item) => item.discoId === discoId)
          ? itens.map((item) =>
              item.discoId === discoId ? { ...item, quantidade: total } : item,
            )
          : [...itens, { discoId, quantidade: total }],
      );
      return [];
    },
    [carrinho, setCarrinho],
  );

  const alterarQuantidade = useCallback(
    async (discoId: number, quantidade: number) => {
      if (quantidade <= 0) {
        setCarrinho((itens) => itens.filter((item) => item.discoId !== discoId));
        return [];
      }

      const recusa = await recusaDoEstoque(discoId, quantidade);
      if (recusa) return recusa;

      setCarrinho((itens) =>
        itens.map((item) => (item.discoId === discoId ? { ...item, quantidade } : item)),
      );
      return [];
    },
    [setCarrinho],
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

  /**
   * RN0037 e RN0038: validada a forma de pagamento, a compra de demonstração vira
   * PAGAMENTO REALIZADO ou PAGAMENTO RECUSADO. O estoque agora é do servidor e
   * não acompanha a massa de demonstração.
   */
  const resolverPagamento = useCallback(
    (pedidoId: string, validacao: ValidacaoPagamento) => {
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
    [],
  );

  /**
   * RF0044, RF0045 e RF0054: ao confirmar o recebimento, o administrador diz se
   * os itens voltariam ao estoque, e o cliente ganha o cupom de troca do valor.
   */
  const receberItensDeTroca = useCallback(
    (pedidoId: string, retornarAoEstoque: boolean, cupom: Cupom) => {
      const pedido = pedidos.find((candidato) => candidato.id === pedidoId);
      if (!pedido?.troca) return;

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
      carregandoClientes,
      carregandoSessao: carregandoClientes || carregandoAdministrador,
      sessao,
      clienteAtivo,
      administradorAtivo,
      atualizarAdministrador,
      entrarComoCliente,
      iniciarSessao,
      sairDaSessao,
      discos,
      carregandoDiscos,
      erroDiscos,
      recarregarDiscos,
      cupons,
      setCupons,
      pedidos,
      setPedidos,
      meusPedidos: meusPedidos.itens,
      carregandoMeusPedidos: meusPedidos.carregando,
      erroMeusPedidos: meusPedidos.erro,
      recarregarPedidos: meusPedidos.recarregar,
      meusCupons: meusCupons.itens,
      carregandoMeusCupons: meusCupons.carregando,
      erroMeusCupons: meusCupons.erro,
      recarregarCupons: meusCupons.recarregar,
      atualizarPedido,
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
      carregandoClientes,
      carregandoAdministrador,
      sessao,
      clienteAtivo,
      administradorAtivo,
      atualizarAdministrador,
      entrarComoCliente,
      iniciarSessao,
      sairDaSessao,
      discos,
      carregandoDiscos,
      erroDiscos,
      recarregarDiscos,
      cupons,
      pedidos,
      meusPedidos.itens,
      meusPedidos.carregando,
      meusPedidos.erro,
      meusPedidos.recarregar,
      meusCupons.itens,
      meusCupons.carregando,
      meusCupons.erro,
      meusCupons.recarregar,
      atualizarPedido,
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
