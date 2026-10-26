import painel from '../../pages/Curadoria/Painel.module.scss';
import styles from './CuradoriaPedidos.module.scss';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, Button, Drawer, Pagination, Radio, Skeleton, TextInput } from '@mantine/core';
import type { PedidoCliente, TrocaPedido } from '../../types/pedido';
import {
  AVANCO_DA_TROCA,
  AVANCO_DO_PEDIDO,
  corDoStatus,
  pedidoPrecisaDeAcao,
  rotuloDoStatus,
  trocaPrecisaDeAcao,
} from '../../utils/pedido';
import { linhaDoEndereco } from '../../utils/perfilCliente';
import { formatarBRL } from '../../utils/precificacao';
import { useLoja } from '../../contexts/loja';
import { ErroApi } from '../../services/api';
import { avancarPedido, validarPagamentosPendentes } from '../../services/pedidosService';
import { avancarTroca } from '../../services/trocasService';
import CabecalhoPainel from '../CabecalhoPainel/CabecalhoPainel';
import StatusPonto from '../StatusPonto/StatusPonto';
import Capa from '../Capa/Capa';
import { EsqueletoLinhas } from '../Esqueleto/Esqueleto';
import { Close, Search, Time } from '@carbon/icons-react';

const COLUNAS_PEDIDOS = '110px minmax(150px, 1.2fr) 90px 44px 100px 160px 170px';
const COLUNAS_TROCAS = '90px 90px minmax(140px, 1fr) minmax(160px, 1.4fr) 100px 160px 170px';

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR');

// muitos pedidos numa página só faziam cada clique re-renderizar a tabela inteira
const POR_PAGINA = 15;

/** Vem pelo state da navegação, a partir do detalhe do cliente. */
export interface EstadoPedidos {
  pedidoId?: string;
  busca?: string;
}

/** Uma cor por próximo passo: a fila de trabalho escaneia pela cor do botão. */
const PASSOS: { status: string; rotulo: string; cor: string }[] = [
  { status: 'APROVADA', rotulo: 'Despachar', cor: 'var(--cor-vinil)' },
  { status: 'EM TRANSPORTE', rotulo: 'Confirmar entrega', cor: 'var(--cor-sucesso)' },
  { status: 'EM TROCA', rotulo: 'Autorizar troca', cor: 'var(--cor-cobalto)' },
  { status: 'TROCA AUTORIZADA', rotulo: 'Receber itens', cor: 'var(--cor-violeta)' },
];

function passoDe(status: string) {
  return PASSOS.find((passo) => passo.status === status) ?? null;
}

type Filtro =
  | 'todos'
  | 'acao'
  | 'processamento'
  | 'aprovadas'
  | 'transporte'
  | 'entregues'
  | 'reprovadas'
  | 'trocas';

const CHIPS: { filtro: Filtro; rotulo: string; status?: string }[] = [
  { filtro: 'todos', rotulo: 'Todos' },
  { filtro: 'acao', rotulo: 'Precisam de ação' },
  { filtro: 'processamento', rotulo: 'Em processamento', status: 'EM PROCESSAMENTO' },
  { filtro: 'aprovadas', rotulo: 'Aprovadas', status: 'APROVADA' },
  { filtro: 'transporte', rotulo: 'Em transporte', status: 'EM TRANSPORTE' },
  { filtro: 'entregues', rotulo: 'Entregues', status: 'ENTREGUE' },
  { filtro: 'reprovadas', rotulo: 'Reprovadas', status: 'REPROVADA' },
  { filtro: 'trocas', rotulo: 'Trocas' },
];

/** Compra a despachar ou entregar, ou com troca esperando autorização ou recebimento. */
function compraComAcao(pedido: PedidoCliente): boolean {
  return pedidoPrecisaDeAcao(pedido) || pedido.trocas.some(trocaPrecisaDeAcao);
}

function passaNoFiltro(pedido: PedidoCliente, filtro: Filtro): boolean {
  if (filtro === 'todos') return true;
  if (filtro === 'acao') return compraComAcao(pedido);
  return pedido.status === CHIPS.find((chip) => chip.filtro === filtro)?.status;
}

function mensagensDe(erro: unknown, padrao: string): string[] {
  return erro instanceof ErroApi ? erro.mensagens : [padrao];
}

interface DetalhesPedidoProps {
  pedido: PedidoCliente;
  nomeCliente: string;
  onFechar: () => void;
}

/** O pedido inteiro, com a validação do pagamento (RN0037) e as trocas da compra. */
function DetalhesPedido({ pedido, nomeCliente, onFechar }: Readonly<DetalhesPedidoProps>) {
  const pagamento: [string, string][] = [
    ...pedido.cupons.map((cupom): [string, string] => [
      'Cupom',
      `${cupom.codigo} · − ${formatarBRL(cupom.valor)}`,
    ]),
    ...pedido.cartoes.map((cartao): [string, string] => [
      'Cartão',
      `${cartao.bandeira} •••• ${cartao.ultimosDigitos} · ${formatarBRL(cartao.valor)}`,
    ]),
    ['Entrega', linhaDoEndereco(pedido.enderecoEntrega)],
  ];

  return (
    <div className={painel.drawer} data-testid="detalhes-pedido-admin">
      <div className={painel.drawerTopo}>
        <div className={painel.drawerTitulo}>
          <span className={styles.metaPedido}>
            #{pedido.id} · {FORMATO_DATA.format(new Date(pedido.data))}
          </span>
          <h2>{nomeCliente}</h2>
          <StatusPonto cor={corDoStatus(pedido.status)}>{rotuloDoStatus(pedido.status)}</StatusPonto>
        </div>
        <Button variant="default" size="xs" leftSection={<Close size={16} />} onClick={onFechar}>
          Fechar
        </Button>
      </div>

      <div className={styles.itens}>
        {pedido.itens.map((item) => (
          <div key={item.id} className={styles.item}>
            <Capa src={item.coverSrc} alt={item.titulo} />
            <div className={styles.itemTexto}>
              <strong>{item.titulo}</strong>
              <span>
                {item.artista} · {item.quantidade}×
              </span>
            </div>
            <span className={painel.numero}>
              {formatarBRL(item.precoUnitario * item.quantidade)}
            </span>
          </div>
        ))}
        <div className={styles.valores}>
          <div className={styles.linhaValor}>
            <span>Subtotal</span>
            <span>{formatarBRL(pedido.subtotal)}</span>
          </div>
          <div className={styles.linhaValor}>
            <span>Frete</span>
            <span>{formatarBRL(pedido.frete)}</span>
          </div>
        </div>
        <div className={styles.total}>
          <span>Total</span>
          <span>{formatarBRL(pedido.total)}</span>
        </div>
      </div>

      {pedido.validacao && (
        <div className={styles.caixa} data-testid="validacao-pagamento">
          <div className={styles.caixaCabecalho}>
            <strong>
              {pedido.validacao.aprovado ? 'Pagamento aprovado' : 'Pagamento reprovado'}
            </strong>
            <span className={styles.nota}>
              {pedido.validacao.aprovado
                ? 'Cupons conferidos e cartões aceitos pela operadora; o estoque foi baixado (RF0053).'
                : `${pedido.validacao.motivo} Os itens foram desbloqueados e os cupons devolvidos (RN0028).`}
            </span>
          </div>
        </div>
      )}
      {pedido.status === 'EM PROCESSAMENTO' && (
        <span className={styles.nota}>
          Aguardando a validação do pagamento: cupons e aceite da operadora (RN0037).
        </span>
      )}

      {pedido.trocas.map((troca) => (
        <div key={troca.id} className={styles.troca}>
          <span className={styles.trocaRotulo}>
            Troca #{troca.id} · {rotuloDoStatus(troca.status)} ·{' '}
            {troca.itens.map((item) => `${item.titulo} · ${item.quantidade}×`).join(', ')}
          </span>
          <span>“{troca.motivo}”</span>
        </div>
      ))}

      <div className={painel.secao}>
        <span className={painel.rotuloSecao}>Pagamento e entrega</span>
        <div className={painel.kv}>
          {pagamento.map(([chave, valor]) => (
            <div key={`${chave}-${valor}`} className={painel.kvLinha}>
              <span>{chave}</span>
              <span>{valor}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type Retorno = 'sim' | 'nao';

interface DetalhesTrocaProps {
  troca: TrocaPedido;
  nomeCliente: string;
  enviando: boolean;
  onFechar: () => void;
  onAutorizar: () => void;
  onConfirmarRecebimento: (retornaAoEstoque: boolean) => void;
}

/** RF0042 e RF0044: autorizar e, com os itens em mãos, confirmar o recebimento. */
function DetalhesTroca({
  troca,
  nomeCliente,
  enviando,
  onFechar,
  onAutorizar,
  onConfirmarRecebimento,
}: Readonly<DetalhesTrocaProps>) {
  const [retorno, setRetorno] = useState<Retorno | null>(null);

  return (
    <div className={painel.drawer} data-testid="detalhes-troca">
      <div className={painel.drawerTopo}>
        <div className={painel.drawerTitulo}>
          <span className={styles.metaPedido}>
            Troca #{troca.id} · pedido #{troca.pedidoId} ·{' '}
            {troca.compraInteira ? 'compra inteira' : 'itens escolhidos'}
          </span>
          <h2>{nomeCliente}</h2>
          <StatusPonto cor={corDoStatus(troca.status)}>{rotuloDoStatus(troca.status)}</StatusPonto>
        </div>
        <Button variant="default" size="xs" leftSection={<Close size={16} />} onClick={onFechar}>
          Fechar
        </Button>
      </div>

      <div className={styles.itens}>
        {troca.itens.map((item) => (
          <div key={item.itemPedidoId} className={styles.item}>
            <Capa src={item.coverSrc} alt={item.titulo} />
            <div className={styles.itemTexto}>
              <strong>{item.titulo}</strong>
              <span>
                {item.artista} · {item.quantidade}×
              </span>
            </div>
            <span className={painel.numero}>
              {formatarBRL(item.precoUnitario * item.quantidade)}
            </span>
          </div>
        ))}
        <div className={styles.total}>
          <span>Cupom de troca</span>
          <span>{formatarBRL(troca.valor)}</span>
        </div>
      </div>

      <div className={styles.troca}>
        <span className={styles.trocaRotulo}>Motivo</span>
        <span>“{troca.motivo}”</span>
        {troca.cupomGerado && (
          <span className={styles.nota}>
            Cupom {troca.cupomGerado.codigo} gerado ·{' '}
            {troca.retornoEstoque ? 'itens de volta ao estoque' : 'itens fora do estoque'}
          </span>
        )}
      </div>

      {troca.status === 'EM TROCA' && (
        <div className={styles.caixa}>
          <div className={styles.caixaCabecalho}>
            <strong>Autorizar a troca?</strong>
            <span className={styles.nota}>
              Autorizada, o cliente é notificado (RN0046) e envia os itens de volta.
            </span>
          </div>
          <Button
            size="sm"
            className={styles.botaoSozinho}
            loading={enviando}
            data-testid="btn-autorizar-troca"
            onClick={onAutorizar}
          >
            Autorizar troca
          </Button>
        </div>
      )}

      {troca.status === 'TROCA AUTORIZADA' && (
        <div className={styles.caixa}>
          <Radio.Group
            label="Os itens retornam ao estoque?"
            classNames={{ label: styles.tituloGrupo }}
            value={retorno}
            onChange={(valor) => setRetorno(valor as Retorno)}
          >
            <div className={styles.opcoes}>
              <Radio.Card value="sim" className={styles.opcao} data-testid="retorno-estoque-sim">
                <Radio.Indicator />
                Sim, em condição de revenda
              </Radio.Card>
              <Radio.Card value="nao" className={styles.opcao} data-testid="retorno-estoque-nao">
                <Radio.Indicator />
                Não, item avariado
              </Radio.Card>
            </div>
          </Radio.Group>
          <span className={styles.nota}>
            Ao confirmar, a troca fica TROCADO e o cliente recebe um cupom de troca de{' '}
            {formatarBRL(troca.valor)} (RF0045).
            {retorno === 'sim' && ' Os itens voltam ao estoque (RF0054).'}
          </span>
          <Button
            size="sm"
            className={styles.botaoSozinho}
            disabled={!retorno}
            loading={enviando}
            data-testid="btn-confirmar-recebimento"
            onClick={() => onConfirmarRecebimento(retorno === 'sim')}
          >
            Confirmar recebimento
          </Button>
        </div>
      )}
    </div>
  );
}

function CuradoriaPedidos() {
  const {
    pedidosCuradoria: pedidos,
    trocasCuradoria: trocas,
    carregandoCuradoria: carregando,
    erroCuradoria,
    recarregarCuradoria,
    clientes,
  } = useLoja();
  const estado = useLocation().state as EstadoPedidos | null;
  const [busca, setBusca] = useState(estado?.busca ?? '');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [pagina, setPagina] = useState(1);
  const [pedidoAbertoId, setPedidoAbertoId] = useState<string | null>(estado?.pedidoId ?? null);
  const [trocaAbertaId, setTrocaAbertaId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [alerta, setAlerta] = useState<{ cor: string; mensagens: string[] } | null>(null);

  const pedidoAberto = pedidos.find((pedido) => pedido.id === pedidoAbertoId) ?? null;
  const trocaAberta = trocas.find((troca) => troca.id === trocaAbertaId) ?? null;
  const trocasPendentes = trocas.filter(trocaPrecisaDeAcao).length;
  const qtdPrecisamDeAcao = pedidos.filter(pedidoPrecisaDeAcao).length + trocasPendentes;

  function nomeDoCliente(clienteId: string): string {
    return clientes.find((cliente) => cliente.id === clienteId)?.nome ?? clienteId;
  }

  const termo = busca.trim().toLowerCase();
  const casaBusca = (pedidoId: string, clienteId: string) =>
    !termo ||
    pedidoId.toLowerCase().includes(termo) ||
    nomeDoCliente(clienteId).toLowerCase().includes(termo);

  const pedidosFiltrados = pedidos.filter(
    (pedido) => passaNoFiltro(pedido, filtro) && casaBusca(pedido.id, pedido.clienteId),
  );
  const trocasFiltradas = trocas.filter((troca) => casaBusca(troca.pedidoId, troca.clienteId));

  const linhas = filtro === 'trocas' ? trocasFiltradas.length : pedidosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(linhas / POR_PAGINA));
  // avançar um status pode tirar o pedido do filtro e encurtar a lista com a
  // página lá na frente; clampar aqui evita um efeito só para corrigir o estado
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;

  function handleFiltrar(novo: Filtro): void {
    setFiltro(novo);
    setPagina(1);
  }

  function handleBuscar(texto: string): void {
    setBusca(texto);
    setPagina(1);
  }

  async function executar(chave: string, acao: () => Promise<string>, falha: string) {
    setEnviando(chave);
    try {
      const sucesso = await acao();
      setAlerta({ cor: 'green', mensagens: [sucesso] });
      await recarregarCuradoria();
    } catch (erro) {
      setAlerta({ cor: 'red', mensagens: mensagensDe(erro, falha) });
    } finally {
      setEnviando(null);
    }
  }

  /** RN0039 e RN0040: despachar a aprovada, confirmar a entrega da que está em transporte. */
  function handleAvancarPedido(pedido: PedidoCliente): void {
    const destino = AVANCO_DO_PEDIDO[pedido.status];
    if (!destino) return;
    void executar(
      `pedido-${pedido.id}`,
      async () => {
        await avancarPedido(pedido.id, destino);
        return `Pedido #${pedido.id} agora está ${destino}.`;
      },
      'Falha ao mudar o status do pedido.',
    );
  }

  /** RN0037 e RN0038: a mesma rotina que o servidor roda sozinho, sem esperar a operadora. */
  function handleValidarPagamentos(): void {
    void executar(
      'validacao',
      async () => {
        const validados = await validarPagamentosPendentes();
        if (validados.length === 0) return 'Nenhum pedido EM PROCESSAMENTO para validar.';
        const aprovados = validados.filter((pedido) => pedido.status === 'APROVADA').length;
        return `${validados.length} pagamento(s) validado(s): ${aprovados} aprovado(s), ${
          validados.length - aprovados
        } reprovado(s).`;
      },
      'Falha ao validar os pagamentos.',
    );
  }

  function handleAutorizarTroca(troca: TrocaPedido): void {
    void executar(
      `troca-${troca.id}`,
      async () => {
        await avancarTroca(troca.id, 'TROCA AUTORIZADA');
        return `Troca #${troca.id} autorizada; o cliente foi notificado (RN0046).`;
      },
      'Falha ao autorizar a troca.',
    );
  }

  function handleConfirmarRecebimento(troca: TrocaPedido, retornaAoEstoque: boolean): void {
    void executar(
      `troca-${troca.id}`,
      async () => {
        const recebida = await avancarTroca(troca.id, 'TROCADO', retornaAoEstoque);
        const cupom = recebida.cupomGerado;
        return `Troca #${troca.id} recebida: cupom ${cupom?.codigo ?? ''} de ${formatarBRL(
          recebida.valor,
        )} para o cliente${retornaAoEstoque ? ', itens de volta ao estoque' : ''}.`;
      },
      'Falha ao confirmar o recebimento.',
    );
  }

  function renderPassoDoPedido(pedido: PedidoCliente) {
    // RN0041: troca pendente, de itens ou da compra inteira, é o próximo passo da compra.
    // A compra ENTREGUE de uma troca parcial não tem avanço próprio, e a trocada inteira
    // fica EM TROCA ou TROCA AUTORIZADA, que não são avanços de status da compra
    const trocaPendente = pedido.trocas.find(trocaPrecisaDeAcao);
    if (trocaPendente) return renderPassoDaTroca(trocaPendente);

    const passo = AVANCO_DO_PEDIDO[pedido.status] ? passoDe(pedido.status) : null;
    if (!passo) {
      return (
        <span className={styles.semPasso}>
          {pedido.status === 'EM PROCESSAMENTO' ? 'Aguardando operadora' : '—'}
        </span>
      );
    }
    return (
      <button
        type="button"
        className={styles.botaoPasso}
        style={{ background: passo.cor }}
        disabled={enviando === `pedido-${pedido.id}`}
        aria-label={`${passo.rotulo} do pedido ${pedido.id}`}
        data-testid="btn-proximo-passo"
        onClick={() => handleAvancarPedido(pedido)}
      >
        {passo.rotulo}
      </button>
    );
  }

  function renderPassoDaTroca(troca: TrocaPedido) {
    const passo = passoDe(troca.status);
    if (!passo) return <span className={styles.semPasso}>—</span>;
    // o recebimento pede a condição dos itens, então abre o detalhe
    const acao =
      AVANCO_DA_TROCA[troca.status] === 'TROCADO'
        ? () => setTrocaAbertaId(troca.id)
        : () => handleAutorizarTroca(troca);
    return (
      <button
        type="button"
        className={styles.botaoPasso}
        style={{ background: passo.cor }}
        disabled={enviando === `troca-${troca.id}`}
        aria-label={`${passo.rotulo} da troca ${troca.id}`}
        data-testid="btn-proximo-passo-troca"
        onClick={acao}
      >
        {passo.rotulo}
      </button>
    );
  }

  function renderPedidos() {
    if (pedidosFiltrados.length === 0) {
      return <p className={painel.vazio}>Nenhum pedido com esses filtros.</p>;
    }
    return pedidosFiltrados.slice(inicio, inicio + POR_PAGINA).map((pedido) => (
      <div
        key={pedido.id}
        className={`${painel.linhaTabela} ${styles.linha}`}
        style={{ gridTemplateColumns: COLUNAS_PEDIDOS }}
        data-testid="pedido-linha-admin"
        data-pedido-id={pedido.id}
        data-status={pedido.status}
      >
        <button
          type="button"
          className={styles.numeroPedido}
          aria-label={`Ver detalhes do pedido ${pedido.id}`}
          onClick={() => setPedidoAbertoId(pedido.id)}
        >
          {pedido.id}
        </button>
        <span className={styles.cliente}>{nomeDoCliente(pedido.clienteId)}</span>
        <span className={`${painel.numero} ${styles.data}`}>
          {FORMATO_DATA.format(new Date(pedido.data))}
        </span>
        <span className={painel.numero}>
          {pedido.itens.reduce((soma, item) => soma + item.quantidade, 0)}
        </span>
        <span className={`${painel.preco} ${painel.direita}`}>{formatarBRL(pedido.total)}</span>
        <StatusPonto cor={corDoStatus(pedido.status)}>{rotuloDoStatus(pedido.status)}</StatusPonto>
        <span className={styles.proximoPasso}>{renderPassoDoPedido(pedido)}</span>
      </div>
    ));
  }

  /** RF0043: os pedidos de troca, com os EM TROCA esperando a autorização. */
  function renderTrocas() {
    if (trocasFiltradas.length === 0) {
      return <p className={painel.vazio}>Nenhum pedido de troca.</p>;
    }
    return trocasFiltradas.slice(inicio, inicio + POR_PAGINA).map((troca) => (
      <div
        key={troca.id}
        className={`${painel.linhaTabela} ${styles.linha}`}
        style={{ gridTemplateColumns: COLUNAS_TROCAS }}
        // RF0043: troca parada esperando a curadoria precisa saltar aos olhos
        data-destaque={trocaPrecisaDeAcao(troca) || undefined}
        data-testid="troca-linha"
        data-troca-id={troca.id}
        data-pedido-id={troca.pedidoId}
        data-status={troca.status}
      >
        <button
          type="button"
          className={styles.numeroPedido}
          aria-label={`Ver detalhes da troca ${troca.id}`}
          onClick={() => setTrocaAbertaId(troca.id)}
        >
          {troca.id}
        </button>
        <span className={painel.numero}>#{troca.pedidoId}</span>
        <span className={styles.cliente}>{nomeDoCliente(troca.clienteId)}</span>
        <span className={styles.cliente}>
          {troca.compraInteira
            ? 'Compra inteira'
            : troca.itens.map((item) => `${item.titulo} · ${item.quantidade}×`).join(', ')}
        </span>
        <span className={`${painel.preco} ${painel.direita}`}>{formatarBRL(troca.valor)}</span>
        <StatusPonto cor={corDoStatus(troca.status)}>{rotuloDoStatus(troca.status)}</StatusPonto>
        <span className={styles.proximoPasso}>{renderPassoDaTroca(troca)}</span>
      </div>
    ));
  }

  function renderTabela() {
    if (carregando) {
      return <EsqueletoLinhas colunas={COLUNAS_PEDIDOS} linhas={8} altura={60} />;
    }
    return filtro === 'trocas' ? renderTrocas() : renderPedidos();
  }

  const cabecalhoTabela =
    filtro === 'trocas'
      ? ['Troca', 'Pedido', 'Cliente', 'Itens', 'Cupom', 'Status', 'Próximo passo']
      : ['Pedido', 'Cliente', 'Data', 'Itens', 'Total', 'Status', 'Próximo passo'];

  return (
    <div className={painel.painel}>
      <Drawer
        size={520}
        opened={Boolean(pedidoAberto)}
        onClose={() => setPedidoAbertoId(null)}
        withCloseButton={false}
      >
        {pedidoAberto && (
          <DetalhesPedido
            pedido={pedidoAberto}
            nomeCliente={nomeDoCliente(pedidoAberto.clienteId)}
            onFechar={() => setPedidoAbertoId(null)}
          />
        )}
      </Drawer>

      <Drawer
        size={520}
        opened={Boolean(trocaAberta)}
        onClose={() => setTrocaAbertaId(null)}
        withCloseButton={false}
      >
        {trocaAberta && (
          <DetalhesTroca
            key={`${trocaAberta.id}-${trocaAberta.status}`}
            troca={trocaAberta}
            nomeCliente={nomeDoCliente(trocaAberta.clienteId)}
            enviando={enviando === `troca-${trocaAberta.id}`}
            onFechar={() => setTrocaAbertaId(null)}
            onAutorizar={() => handleAutorizarTroca(trocaAberta)}
            onConfirmarRecebimento={(retornaAoEstoque) =>
              handleConfirmarRecebimento(trocaAberta, retornaAoEstoque)
            }
          />
        )}
      </Drawer>

      <CabecalhoPainel
        titulo="Pedidos"
        resumo={
          carregando ? (
            <Skeleton height={12} width={220} />
          ) : (
            `${qtdPrecisamDeAcao} ${qtdPrecisamDeAcao === 1 ? 'precisa' : 'precisam'} de ação · ${pedidos.length} pedidos · ${trocas.length} trocas`
          )
        }
        acoes={
          <Button
            variant="outline"
            leftSection={<Time size={20} />}
            loading={enviando === 'validacao'}
            data-testid="btn-validar-pagamentos"
            onClick={handleValidarPagamentos}
          >
            Validar pagamentos agora
          </Button>
        }
      />

      {(alerta || erroCuradoria) && (
        <Alert
          color={alerta?.cor ?? 'red'}
          withCloseButton
          onClose={() => setAlerta(null)}
          data-testid="alerta-curadoria-pedidos"
        >
          {(alerta?.mensagens ?? [erroCuradoria]).map((mensagem) => (
            <div key={mensagem}>{mensagem}</div>
          ))}
        </Alert>
      )}

      <div className={styles.filtros}>
        <div className={styles.chips}>
          {CHIPS.map((chip) => (
            <button
              key={chip.filtro}
              type="button"
              className={styles.chip}
              aria-pressed={filtro === chip.filtro}
              data-testid={`filtro-${chip.filtro}`}
              onClick={() => handleFiltrar(chip.filtro)}
            >
              {chip.rotulo}
              {!carregando && (
                <span className={styles.chipContagem}>
                  {chip.filtro === 'trocas'
                    ? trocasPendentes
                    : pedidos.filter((pedido) => passaNoFiltro(pedido, chip.filtro)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className={styles.legenda}>
          {PASSOS.map((passo) => (
            <span key={passo.status} className={styles.legendaItem}>
              <span className={styles.legendaCor} style={{ background: passo.cor }} />
              {passo.rotulo}
            </span>
          ))}
        </div>

        <div className={painel.barra}>
          <TextInput
            className={styles.busca}
            placeholder="Busque pelo número do pedido ou nome do cliente"
            leftSection={<Search size={16} />}
            aria-label="Buscar pedido por número ou cliente"
            data-testid="busca-pedidos"
            value={busca}
            onChange={(event) => handleBuscar(event.currentTarget.value)}
          />
        </div>
      </div>

      <div className={painel.tabela}>
        <div
          className={`${painel.cabecalhoTabela} ${styles.grade}`}
          style={{ gridTemplateColumns: filtro === 'trocas' ? COLUNAS_TROCAS : COLUNAS_PEDIDOS }}
        >
          {cabecalhoTabela.map((coluna, indice) => (
            <span key={coluna} className={indice === 4 || indice === 6 ? painel.direita : undefined}>
              {coluna}
            </span>
          ))}
        </div>
        {renderTabela()}
      </div>

      {!carregando && totalPaginas > 1 && (
        <Pagination size="sm" total={totalPaginas} value={paginaAtual} onChange={setPagina} />
      )}
    </div>
  );
}

export default CuradoriaPedidos;
