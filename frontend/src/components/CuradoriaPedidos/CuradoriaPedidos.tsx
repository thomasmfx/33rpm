import painel from '../../pages/Curadoria/Painel.module.scss';
import styles from './CuradoriaPedidos.module.scss';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Button,
  Drawer,
  Pagination,
  Radio,
  Select,
  Skeleton,
  TextInput,
} from '@mantine/core';
import type { Cupom } from '../../types/cupom';
import type {
  Pedido,
  StatusPedido,
  ValidacaoPagamento,
} from '../../types/pedido';
import {
  CORES_STATUS,
  itensDaTroca,
  podeInformarDespacho,
  precisaDeAcao,
  proximosStatusAdmin,
  ROTULOS_STATUS,
  valorDosItens,
} from '../../utils/pedido';
import { linhaDoEndereco } from '../../utils/perfilCliente';
import { formatarBRL } from '../../utils/precificacao';
import { useLoja } from '../../contexts/loja';
import CabecalhoPainel from '../CabecalhoPainel/CabecalhoPainel';
import StatusPonto from '../StatusPonto/StatusPonto';
import Capa from '../Capa/Capa';
import { EsqueletoLinhas } from '../Esqueleto/Esqueleto';
import ConferenciaPagamento from './ConferenciaPagamento';
import { Close, Search } from '@carbon/icons-react';

const COLUNAS = '110px minmax(150px, 1.2fr) 90px 44px 100px 160px 170px';

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR');
const FORMATO_DIA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const FORMATO_HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

// 147 pedidos em uma página só faziam cada clique re-renderizar a tabela inteira
const POR_PAGINA = 15;

/** Vem pelo state da navegação, a partir do detalhe do cliente. */
export interface EstadoPedidos {
  pedidoId?: string;
  busca?: string;
}

interface Passo {
  status: StatusPedido;
  rotulo: string;
  cor: string;
}

/** Uma cor por próximo passo: a fila de trabalho escaneia pela cor do botão. */
const PASSOS: Passo[] = [
  { status: 'EM PROCESSAMENTO', rotulo: 'Conferir pagamento', cor: 'var(--cor-tijolo)' },
  { status: 'PAGAMENTO REALIZADO', rotulo: 'Despachar', cor: 'var(--cor-vinil)' },
  { status: 'EM TRÂNSITO', rotulo: 'Confirmar entrega', cor: 'var(--cor-sucesso)' },
  { status: 'TROCA SOLICITADA', rotulo: 'Autorizar troca', cor: 'var(--cor-cobalto)' },
  { status: 'ITEM ENVIADO', rotulo: 'Receber item', cor: 'var(--cor-violeta)' },
];

type Filtro = 'todos' | 'acao' | 'trocas' | StatusPedido;

const CHIPS: { filtro: Filtro; rotulo: string }[] = [
  { filtro: 'todos', rotulo: 'Todos' },
  { filtro: 'acao', rotulo: 'Precisam de ação' },
  { filtro: 'EM PROCESSAMENTO', rotulo: 'Em processamento' },
  { filtro: 'EM TRÂNSITO', rotulo: 'Em trânsito' },
  { filtro: 'trocas', rotulo: 'Trocas' },
  { filtro: 'ENTREGUE', rotulo: 'Entregues' },
];

const OPCOES_STATUS = (Object.keys(ROTULOS_STATUS) as StatusPedido[]).map(
  (status) => ({ value: status, label: ROTULOS_STATUS[status] }),
);

function isStatus(filtro: Filtro): filtro is StatusPedido {
  return filtro in ROTULOS_STATUS;
}

function passaNoFiltro(pedido: Pedido, filtro: Filtro): boolean {
  if (filtro === 'todos') return true;
  if (filtro === 'acao') return precisaDeAcao(pedido);
  if (filtro === 'trocas') return pedido.troca !== null;
  return pedido.status === filtro;
}

interface EventoHistorico {
  data: string;
  texto: string;
}

function historicoDo(pedido: Pedido): EventoHistorico[] {
  const cartoes = pedido.cartoes
    .map((cartao) => `${cartao.bandeira} •••• ${cartao.ultimosDigitos}`)
    .join(' + ');
  const eventos: EventoHistorico[] = [
    { data: pedido.data, texto: cartoes ? `Pedido recebido · ${cartoes}` : 'Pedido recebido' },
  ];

  if (pedido.validacaoPagamento) {
    eventos.push({
      data: pedido.validacaoPagamento.data,
      texto: pedido.validacaoPagamento.aprovado
        ? 'Pagamento conferido'
        : 'Pagamento recusado · itens voltaram ao estoque',
    });
  }
  if (pedido.troca) {
    eventos.push({ data: pedido.troca.solicitadaEm, texto: 'Troca solicitada pelo cliente' });
  }

  // só entra o que o pedido registra com data: despacho, entrega e a decisão
  // da troca mudam o status sem guardar quando
  return eventos.sort((a, b) => a.data.localeCompare(b.data));
}

type Retorno = 'sim' | 'nao';

interface DetalhesPedidoProps {
  pedido: Pedido;
  nomeCliente: string;
  cupons: Cupom[];
  retornaAoEstoque: Retorno | null;
  onAlterarRetorno: (valor: Retorno) => void;
  onFechar: () => void;
  onAvancar: (proximo: StatusPedido) => void;
  onResolverPagamento: (validacao: ValidacaoPagamento) => void;
  onConfirmarRecebimento: () => void;
}

function DetalhesPedido({
  pedido,
  nomeCliente,
  cupons,
  retornaAoEstoque,
  onAlterarRetorno,
  onFechar,
  onAvancar,
  onResolverPagamento,
  onConfirmarRecebimento,
}: Readonly<DetalhesPedidoProps>) {
  const itensTroca = itensDaTroca(pedido);
  const valorTroca = pedido.troca ? valorDosItens(pedido, pedido.troca.itens) : 0;
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
    <div className={painel.drawer}>
      <div className={painel.drawerTopo}>
        <div className={painel.drawerTitulo}>
          <span className={styles.metaPedido}>
            #{pedido.id} · {FORMATO_DATA.format(new Date(pedido.data))}
          </span>
          <h2>{nomeCliente}</h2>
          <StatusPonto cor={CORES_STATUS[pedido.status]}>
            {ROTULOS_STATUS[pedido.status]}
          </StatusPonto>
        </div>
        <Button variant="default" size="xs" leftSection={<Close size={16} />} onClick={onFechar}>
          Fechar
        </Button>
      </div>

      <div className={styles.itens}>
        {pedido.itens.map((item) => (
          <div key={item.discoId} className={styles.item}>
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

      {pedido.troca && (
        <div className={styles.troca}>
          <span className={styles.trocaRotulo}>
            Troca ·{' '}
            {itensTroca.map((item) => `${item.titulo} · ${item.quantidade}×`).join(', ')}
          </span>
          <span>“{pedido.troca.motivo}”</span>
          {pedido.troca.cupomGeradoId && (
            <span className={styles.nota}>
              Cupom de troca gerado ·{' '}
              {pedido.troca.retornouAoEstoque
                ? 'itens de volta ao estoque'
                : 'itens baixados como avaria'}
            </span>
          )}
        </div>
      )}

      {pedido.status === 'EM PROCESSAMENTO' && (
        <ConferenciaPagamento
          pedido={pedido}
          cupons={cupons}
          onConfirmar={onResolverPagamento}
        />
      )}

      {pedido.status === 'TROCA SOLICITADA' && (
        <div className={styles.caixa}>
          <div className={styles.caixaCabecalho}>
            <strong>Autorizar a troca?</strong>
            <span className={styles.nota}>
              Autorizada, o cliente envia o item de volta para conferência.
            </span>
          </div>
          <div className={styles.botoesCaixa}>
            <Button size="sm" onClick={() => onAvancar('TROCA ACEITA')}>
              Autorizar troca
            </Button>
            <Button
              size="sm"
              variant="default"
              className={styles.botaoRecusa}
              onClick={() => onAvancar('TROCA NEGADA')}
            >
              Negar troca
            </Button>
          </div>
        </div>
      )}

      {/* RF0044, RF0045 e RF0054: o recebimento decide o estoque e gera o cupom */}
      {pedido.status === 'ITEM ENVIADO' && (
        <div className={styles.caixa}>
          <Radio.Group
            label="Os itens retornam ao estoque?"
            classNames={{ label: styles.tituloGrupo }}
            value={retornaAoEstoque}
            onChange={(valor) => onAlterarRetorno(valor as Retorno)}
          >
            <div className={styles.opcoes}>
              <Radio.Card value="sim" className={styles.opcao}>
                <Radio.Indicator />
                Sim, em condição de revenda
              </Radio.Card>
              <Radio.Card value="nao" className={styles.opcao}>
                <Radio.Indicator />
                Não, item avariado
              </Radio.Card>
            </div>
          </Radio.Group>
          <span className={styles.nota}>
            Ao confirmar, o cliente recebe um cupom de troca de {formatarBRL(valorTroca)}.
            {retornaAoEstoque === 'sim' && ' O item volta ao estoque.'}
            {retornaAoEstoque === 'nao' && ' O item é baixado como avaria.'}
          </span>
          <Button
            size="sm"
            className={styles.botaoSozinho}
            disabled={!retornaAoEstoque}
            onClick={onConfirmarRecebimento}
          >
            Confirmar recebimento
          </Button>
        </div>
      )}

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

      <div className={painel.secao}>
        <span className={painel.rotuloSecao}>Histórico</span>
        {historicoDo(pedido).map((evento) => {
          const data = new Date(evento.data);
          return (
            <div key={evento.texto} className={styles.evento}>
              <span>
                {FORMATO_DIA.format(data)} {FORMATO_HORA.format(data)}
              </span>
              <span>{evento.texto}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CuradoriaPedidos() {
  const {
    pedidos,
    clientes,
    carregandoClientes,
    cupons,
    atualizarPedido,
    receberItensDeTroca,
    resolverPagamento,
  } = useLoja();
  const estado = useLocation().state as EstadoPedidos | null;
  const [busca, setBusca] = useState(estado?.busca ?? '');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [pagina, setPagina] = useState(1);
  const [pedidoAbertoId, setPedidoAbertoId] = useState<string | null>(
    estado?.pedidoId ?? null,
  );
  const [retornaAoEstoque, setRetornaAoEstoque] = useState<Retorno | null>(null);

  const pedidoAberto =
    pedidos.find((pedido) => pedido.id === pedidoAbertoId) ?? null;
  const qtdPrecisamDeAcao = pedidos.filter(precisaDeAcao).length;

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos.filter((pedido) => {
      if (!passaNoFiltro(pedido, filtro)) return false;
      if (!termo) return true;

      const nomeCliente =
        clientes.find((cliente) => cliente.id === pedido.clienteId)?.nome ??
        '';

      return (
        pedido.id.toLowerCase().includes(termo) ||
        nomeCliente.toLowerCase().includes(termo)
      );
    });
  }, [pedidos, clientes, busca, filtro]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(pedidosFiltrados.length / POR_PAGINA),
  );
  // avançar um status pode tirar o pedido do filtro e encurtar a lista com a
  // página lá na frente; clampar aqui evita um efeito só para corrigir o estado
  const paginaAtual = Math.min(pagina, totalPaginas);

  const pedidosDaPagina = useMemo(
    () =>
      pedidosFiltrados.slice(
        (paginaAtual - 1) * POR_PAGINA,
        paginaAtual * POR_PAGINA,
      ),
    [pedidosFiltrados, paginaAtual],
  );

  function nomeDoCliente(clienteId: string): string {
    return clientes.find((cliente) => cliente.id === clienteId)?.nome ?? clienteId;
  }

  function handleFiltrar(novo: Filtro): void {
    setFiltro(novo);
    setPagina(1);
  }

  function handleBuscar(termo: string): void {
    setBusca(termo);
    setPagina(1);
  }

  function handleAbrirDetalhe(pedido: Pedido): void {
    setPedidoAbertoId(pedido.id);
    setRetornaAoEstoque(null);
  }

  function handleFecharDetalhe(): void {
    setPedidoAbertoId(null);
    setRetornaAoEstoque(null);
  }

  function handleAvancarStatus(pedido: Pedido, proximo: StatusPedido): void {
    // RN0037: a forma de pagamento é conferida antes de virar PAGAMENTO
    // REALIZADO, e o resultado pode ser recusa (RN0038); o recebimento da troca
    // pede a condição dos itens. Os dois passos acontecem no drawer
    if (proximo === 'PAGAMENTO REALIZADO' || proximo === 'ITEM RECEBIDO') {
      handleAbrirDetalhe(pedido);
      return;
    }

    atualizarPedido(pedido.id, { status: proximo });
  }

  function handleConfirmarRecebimento(pedido: Pedido): void {
    if (!pedido.troca || !retornaAoEstoque) return;

    const id = crypto.randomUUID().slice(0, 8);
    const cupom: Cupom = {
      id,
      codigo: 'TROCA-' + id.toUpperCase(),
      tipo: 'troca',
      valor: valorDosItens(pedido, pedido.troca.itens),
      clienteId: pedido.clienteId,
      isUtilizado: false,
    };

    receberItensDeTroca(pedido.id, retornaAoEstoque === 'sim', cupom);
    setRetornaAoEstoque(null);
  }

  function renderProximoPasso(pedido: Pedido) {
    const proximos = proximosStatusAdmin(pedido.status);

    if (proximos.length === 0) {
      return (
        <span className={styles.semPasso}>
          {podeInformarDespacho(pedido.status) ? 'Aguardando cliente enviar' : '—'}
        </span>
      );
    }

    const passo = PASSOS.find((candidato) => candidato.status === pedido.status) ?? {
      rotulo: ROTULOS_STATUS[proximos[0]],
      cor: 'var(--cor-vinil)',
    };

    return (
      <button
        type="button"
        className={styles.botaoPasso}
        style={{ background: passo.cor }}
        aria-label={`${passo.rotulo} do pedido ${pedido.id}`}
        onClick={() => handleAvancarStatus(pedido, proximos[0])}
      >
        {passo.rotulo}
      </button>
    );
  }

  function renderLinhas() {
    if (carregandoClientes) {
      return <EsqueletoLinhas colunas={COLUNAS} linhas={8} altura={60} />;
    }

    if (pedidosFiltrados.length === 0) {
      return <p className={painel.vazio}>Nenhum pedido com esses filtros.</p>;
    }

    return pedidosDaPagina.map((pedido) => {
      const quantidadeTotal = pedido.itens.reduce(
        (soma, item) => soma + item.quantidade,
        0,
      );

      return (
        <div
          key={pedido.id}
          className={`${painel.linhaTabela} ${styles.linha}`}
          style={{ gridTemplateColumns: COLUNAS }}
          // RF0043: troca parada esperando a curadoria precisa saltar aos olhos
          data-destaque={(pedido.troca !== null && precisaDeAcao(pedido)) || undefined}
        >
          <button
            type="button"
            className={styles.numeroPedido}
            aria-label={`Ver detalhes do pedido ${pedido.id}`}
            onClick={() => handleAbrirDetalhe(pedido)}
          >
            {pedido.id}
          </button>
          <span className={styles.cliente}>{nomeDoCliente(pedido.clienteId)}</span>
          <span className={`${painel.numero} ${styles.data}`}>
            {FORMATO_DATA.format(new Date(pedido.data))}
          </span>
          <span className={painel.numero}>{quantidadeTotal}</span>
          <span className={`${painel.preco} ${painel.direita}`}>
            {formatarBRL(pedido.total)}
          </span>
          <StatusPonto cor={CORES_STATUS[pedido.status]}>
            {ROTULOS_STATUS[pedido.status]}
          </StatusPonto>
          <span className={styles.proximoPasso}>{renderProximoPasso(pedido)}</span>
        </div>
      );
    });
  }

  return (
    <div className={painel.painel}>
      <Drawer
        size={520}
        opened={Boolean(pedidoAberto)}
        onClose={handleFecharDetalhe}
        withCloseButton={false}
      >
        {pedidoAberto && (
          <DetalhesPedido
            pedido={pedidoAberto}
            nomeCliente={nomeDoCliente(pedidoAberto.clienteId)}
            cupons={cupons}
            retornaAoEstoque={retornaAoEstoque}
            onAlterarRetorno={setRetornaAoEstoque}
            onFechar={handleFecharDetalhe}
            onAvancar={(proximo) => handleAvancarStatus(pedidoAberto, proximo)}
            onResolverPagamento={(validacao) =>
              resolverPagamento(pedidoAberto.id, validacao)
            }
            onConfirmarRecebimento={() => handleConfirmarRecebimento(pedidoAberto)}
          />
        )}
      </Drawer>

      <CabecalhoPainel
        titulo="Pedidos"
        resumo={
          carregandoClientes ? (
            <Skeleton height={12} width={220} />
          ) : (
            `${qtdPrecisamDeAcao} ${qtdPrecisamDeAcao === 1 ? 'precisa' : 'precisam'} de ação · ${pedidos.length} no total`
          )
        }
      />

      <div className={styles.filtros}>
        <div className={styles.chips}>
          {CHIPS.map((chip) => (
            <button
              key={chip.filtro}
              type="button"
              className={styles.chip}
              aria-pressed={filtro === chip.filtro}
              onClick={() => handleFiltrar(chip.filtro)}
            >
              {chip.rotulo}
              {!carregandoClientes && (
                <span className={styles.chipContagem}>
                  {pedidos.filter((pedido) => passaNoFiltro(pedido, chip.filtro)).length}
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
            value={busca}
            onChange={(event) => handleBuscar(event.currentTarget.value)}
          />
          {/* os chips cobrem a fila do dia; qualquer outro status sai daqui */}
          <Select
            w={220}
            placeholder="Qualquer status"
            aria-label="Filtrar por status"
            data={OPCOES_STATUS}
            value={isStatus(filtro) ? filtro : null}
            onChange={(valor) => handleFiltrar((valor as StatusPedido | null) ?? 'todos')}
            clearable
          />
        </div>
      </div>

      <div className={painel.tabela}>
        <div
          className={`${painel.cabecalhoTabela} ${styles.grade}`}
          style={{ gridTemplateColumns: COLUNAS }}
        >
          <span>Pedido</span>
          <span>Cliente</span>
          <span>Data</span>
          <span>Itens</span>
          <span className={painel.direita}>Total</span>
          <span>Status</span>
          <span className={painel.direita}>Próximo passo</span>
        </div>
        {renderLinhas()}
      </div>

      {!carregandoClientes && totalPaginas > 1 && (
        <Pagination
          size="sm"
          total={totalPaginas}
          value={paginaAtual}
          onChange={setPagina}
        />
      )}
    </div>
  );
}

export default CuradoriaPedidos;
