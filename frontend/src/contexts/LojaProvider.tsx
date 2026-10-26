import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Cliente } from '../types/cliente';
import type { Disco } from '../types/disco';
import type { Carrinho } from '../types/carrinho';
import type { Pedido, PedidoCliente, TrocaPedido } from '../types/pedido';
import type { Administrador, RespostaSessao, Sessao } from '../types/sessao';
import { gerarPedidos } from '../utils/pedidosMock';
import { FILTROS_VAZIOS } from '../utils/filtrarClientes';
import { ErroApi } from '../services/api';
import { listarClientes } from '../services/clientesService';
import { buscarAdministrador } from '../services/administradoresService';
import { listarDiscos } from '../services/discosService';
import { listarPedidos, listarTodosPedidos } from '../services/pedidosService';
import { listarCupons } from '../services/cuponsService';
import { listarTrocas } from '../services/trocasService';
import { listarNotificacoes, marcarComoLida } from '../services/notificacoesService';
import {
  alterarItemDoCarrinho,
  buscarCarrinho,
  dispensarExpirados,
  esvaziarCarrinho,
  incluirNoCarrinho,
  revalidarCarrinho as revalidarNoServidor,
  tirarDoCarrinho,
} from '../services/carrinhoService';
import { LojaContext } from './loja';

// carrinho, notificações e a fila da curadoria mudam no servidor (a expiração da RN0044,
// a validação da RN0037, a autorização da troca): a loja confere de tempos em tempos
const INTERVALO_ATUALIZACAO_MS = 15_000;

/** Até a primeira resposta do servidor; os prazos reais vêm com o carrinho. */
const CARRINHO_VAZIO: Carrinho = {
  itens: [],
  expirados: [],
  expiraEm: null,
  prazoMinutos: 15,
  avisoMinutos: 5,
};

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

function mensagensDe(erro: unknown, padrao: string): string[] {
  return erro instanceof ErroApi ? erro.mensagens : [padrao];
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
  // de quem é o carrinho que chegou, como nas listas do cliente
  const [carrinhoCarregado, setCarrinhoCarregado] = useState<{
    clienteId: string;
    dados: Carrinho;
  } | null>(null);
  const [curadoria, setCuradoria] = useState<{
    pedidos: PedidoCliente[];
    trocas: TrocaPedido[];
    erro: string | null;
  } | null>(null);
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
  const minhasNotificacoes = useDoCliente(
    clienteAtivoId,
    listarNotificacoes,
    'Falha ao carregar as notificações.',
  );

  const carrinhoDoCliente =
    clienteAtivoId !== null && carrinhoCarregado?.clienteId === clienteAtivoId
      ? carrinhoCarregado.dados
      : null;
  const carrinho = useMemo(() => carrinhoDoCliente?.itens ?? [], [carrinhoDoCliente]);
  const itensExpirados = useMemo(() => carrinhoDoCliente?.expirados ?? [], [carrinhoDoCliente]);
  const carrinhoExpiraEm = carrinhoDoCliente?.expiraEm ?? null;

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
   * A massa de demonstração do Dashboard continua mockada, mas aponta para clientes e
   * discos do banco: se os ids não baterem — banco recriado, por exemplo — ela é regerada.
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
  }, [clientes, discos]);

  useEffect(() => gravar('sessao', sessao), [sessao]);
  useEffect(() => gravar('pedidos', pedidos), [pedidos]);

  const recarregarCarrinho = useCallback(async () => {
    if (!clienteAtivoId) return;
    try {
      setCarrinhoCarregado({ clienteId: clienteAtivoId, dados: await buscarCarrinho(clienteAtivoId) });
    } catch {
      // sem o servidor, o carrinho que já estava na tela fica; vazio só na primeira carga
      setCarrinhoCarregado((atual) =>
        atual?.clienteId === clienteAtivoId ? atual : { clienteId: clienteAtivoId, dados: CARRINHO_VAZIO },
      );
    }
  }, [clienteAtivoId]);

  const recarregarCuradoria = useCallback(async () => {
    try {
      const [todos, trocas] = await Promise.all([listarTodosPedidos(), listarTrocas()]);
      setCuradoria({ pedidos: todos, trocas, erro: null });
    } catch (erro) {
      const mensagem = mensagemDe(erro, 'Falha ao carregar os pedidos.');
      setCuradoria((atual) => ({
        pedidos: atual?.pedidos ?? [],
        trocas: atual?.trocas ?? [],
        erro: mensagem,
      }));
    }
  }, []);

  const recarregarNotificacoes = minhasNotificacoes.recarregar;
  useEffect(() => {
    if (!clienteAtivoId && !isSessaoDeAdministrador) return;
    // as notificações já carregam com a sessão; o carrinho e a curadoria, aqui
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void (clienteAtivoId ? recarregarCarrinho() : recarregarCuradoria());
    const intervalo = setInterval(() => {
      if (clienteAtivoId) {
        void recarregarCarrinho();
        void recarregarNotificacoes();
      } else {
        void recarregarCuradoria();
      }
    }, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(intervalo);
  }, [
    clienteAtivoId,
    isSessaoDeAdministrador,
    recarregarCarrinho,
    recarregarNotificacoes,
    recarregarCuradoria,
  ]);

  // RN0044: no fim do prazo o servidor já derrubou o carrinho; busca sem esperar o tique
  useEffect(() => {
    if (carrinhoExpiraEm === null) return;
    const espera = setTimeout(
      () => void recarregarCarrinho(),
      Math.max(0, carrinhoExpiraEm - Date.now()) + 1000,
    );
    return () => clearTimeout(espera);
  }, [carrinhoExpiraEm, recarregarCarrinho]);

  /** Toda escrita no carrinho devolve o carrinho inteiro, que substitui o da tela. */
  const mudarCarrinho = useCallback(
    async (mudanca: (clienteId: string) => Promise<Carrinho>): Promise<string[]> => {
      if (!clienteAtivoId) return ['Entre com uma conta de cliente para usar o carrinho.'];
      try {
        const dados = await mudanca(clienteAtivoId);
        setCarrinhoCarregado({ clienteId: clienteAtivoId, dados });
        return [];
      } catch (erro) {
        return mensagensDe(erro, 'Falha ao atualizar o carrinho.');
      }
    },
    [clienteAtivoId],
  );

  const adicionarAoCarrinho = useCallback(
    (discoId: number, quantidade: number) =>
      mudarCarrinho((clienteId) => incluirNoCarrinho(clienteId, discoId, quantidade)),
    [mudarCarrinho],
  );

  const alterarQuantidade = useCallback(
    (discoId: number, quantidade: number) =>
      mudarCarrinho((clienteId) =>
        quantidade <= 0
          ? tirarDoCarrinho(clienteId, discoId)
          : alterarItemDoCarrinho(clienteId, discoId, quantidade),
      ),
    [mudarCarrinho],
  );

  const removerDoCarrinho = useCallback(
    (discoId: number) => mudarCarrinho((clienteId) => tirarDoCarrinho(clienteId, discoId)),
    [mudarCarrinho],
  );

  const limparCarrinho = useCallback(() => mudarCarrinho(esvaziarCarrinho), [mudarCarrinho]);

  const descartarItensExpirados = useCallback(
    () => mudarCarrinho(dispensarExpirados),
    [mudarCarrinho],
  );

  // RNF0042: um por vez, porque cada inclusão confere o estoque livre de novo
  const readicionarExpirados = useCallback(async () => {
    const recusas: string[] = [];
    for (const item of itensExpirados) {
      recusas.push(...(await adicionarAoCarrinho(item.discoId, item.quantidade)));
    }
    return recusas;
  }, [itensExpirados, adicionarAoCarrinho]);

  const revalidarCarrinho = useCallback(async () => {
    if (!clienteAtivoId) return [];
    try {
      const { carrinho: dados, ajustes } = await revalidarNoServidor(clienteAtivoId);
      setCarrinhoCarregado({ clienteId: clienteAtivoId, dados });
      return ajustes;
    } catch (erro) {
      return mensagensDe(erro, 'Falha ao conferir o carrinho com o estoque.');
    }
  }, [clienteAtivoId]);

  const marcarNotificacaoComoLida = useCallback(
    async (id: string) => {
      await marcarComoLida(id);
      await recarregarNotificacoes();
    },
    [recarregarNotificacoes],
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
      minhasNotificacoes: minhasNotificacoes.itens,
      marcarNotificacaoComoLida,
      pedidosCuradoria: curadoria?.pedidos ?? [],
      trocasCuradoria: curadoria?.trocas ?? [],
      carregandoCuradoria: isSessaoDeAdministrador && curadoria === null,
      erroCuradoria: curadoria?.erro ?? null,
      recarregarCuradoria,
      carrinho,
      itensNoCarrinho: carrinho.reduce((total, item) => total + item.quantidade, 0),
      carregandoCarrinho: clienteAtivoId !== null && carrinhoDoCliente === null,
      carrinhoExpiraEm,
      prazoReservaMinutos: (carrinhoDoCliente ?? CARRINHO_VAZIO).prazoMinutos,
      avisoReservaMinutos: (carrinhoDoCliente ?? CARRINHO_VAZIO).avisoMinutos,
      itensExpirados,
      readicionarExpirados,
      descartarItensExpirados,
      revalidarCarrinho,
      recarregarCarrinho,
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
      pedidos,
      meusPedidos.itens,
      meusPedidos.carregando,
      meusPedidos.erro,
      meusPedidos.recarregar,
      meusCupons.itens,
      meusCupons.carregando,
      meusCupons.erro,
      meusCupons.recarregar,
      minhasNotificacoes.itens,
      marcarNotificacaoComoLida,
      curadoria,
      isSessaoDeAdministrador,
      recarregarCuradoria,
      carrinho,
      clienteAtivoId,
      carrinhoDoCliente,
      carrinhoExpiraEm,
      itensExpirados,
      readicionarExpirados,
      descartarItensExpirados,
      revalidarCarrinho,
      recarregarCarrinho,
      adicionarAoCarrinho,
      alterarQuantidade,
      removerDoCarrinho,
      limparCarrinho,
    ],
  );

  return <LojaContext.Provider value={valor}>{children}</LojaContext.Provider>;
}
