import painel from '../../pages/Curadoria/Painel.module.scss';
import styles from './CuradoriaInventario.module.scss';
import { useMemo, useState } from 'react';
import {
  Button,
  Modal,
  NumberInput,
  Pagination,
  SegmentedControl,
  Select,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { Disco, MotivoStatus } from '../../types/disco';
import type {
  EntradaEstoque,
  EstoqueFiltro,
  FiltrosDiscos,
  StatusFiltroDisco,
} from '../../types/inventario';
import {
  CATEGORIAS_ATIVACAO,
  CATEGORIAS_INATIVACAO,
  FORMATOS_DISCO,
  GRUPOS_PRECIFICACAO,
} from '../../types/inventario';
import {
  buscarNoInventario,
  contarFiltrosDiscosAtivos,
  filtrarDiscos,
  FILTROS_DISCOS_VAZIOS,
} from '../../utils/filtrarDiscos';
import {
  aplicarEntradaEstoque,
  diasDesde,
  elegivelParaInativacaoAutomatica,
  estaParado,
  estoqueAcabando,
  JUSTIFICATIVA_MINIMA_STATUS,
  motivoInativacaoAutomatica,
  paraIso,
  PARAMETRO_INATIVACAO_AUTOMATICA,
} from '../../utils/estoque';
import { nomeFormato } from '../../utils/catalogo';
import { formatarBRL, nomeGrupoPrecificacao } from '../../utils/precificacao';
import { useLoja } from '../../contexts/loja';
import CabecalhoPainel from '../CabecalhoPainel/CabecalhoPainel';
import Capa from '../Capa/Capa';
import FormDisco, { type FormDiscoValues } from '../FormDisco/FormDisco';
import FormEntradaEstoque, {
  type FormEntradaEstoqueValues,
} from '../FormEntradaEstoque/FormEntradaEstoque';
import { Add, Filter, Search, Time } from '@carbon/icons-react';

// tabela cheia re-renderizava inteira a cada clique, inclusive para abrir modal
const POR_PAGINA = 12;

const COLUNAS = '48px minmax(180px, 1.6fr) 48px minmax(120px, 1fr) 90px 90px 80px 200px';
const GRADE = { gridTemplateColumns: COLUNAS, minWidth: 960 };
const GRADE_LINHA = { ...GRADE, minHeight: 68 };

// título e subtítulo formam um bloco só; o respiro de 20px vem depois do subtítulo
const CABECALHO_COM_SUBTITULO = { header: { marginBottom: 0, paddingBottom: 6 } };

type Recorte = StatusFiltroDisco | 'baixo';

const OPCOES_RECORTE: { label: string; value: Recorte }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Ativos', value: 'ativos' },
  { label: 'Inativos', value: 'inativos' },
  { label: 'Estoque baixo', value: 'baixo' },
];

const OPCOES_GRUPO_FILTRO = [
  { value: '', label: 'Todos' },
  ...GRUPOS_PRECIFICACAO.map((grupo) => ({
    value: grupo.id,
    label: grupo.nome,
  })),
];

const OPCOES_FORMATO_FILTRO = [
  { value: '', label: 'Todos' },
  ...FORMATOS_DISCO.map((formato) => ({
    value: formato.id,
    label: formato.nome,
  })),
];

function comEstoqueBaixo(disco: Disco): boolean {
  return disco.isAtivo && estoqueAcabando(disco.estoque);
}

type TomNota = 'inativo' | 'esgotado' | 'parado';

function notaDoDisco(disco: Disco, hoje: Date): { texto: string; tom: TomNota } | null {
  if (!disco.isAtivo) return { texto: 'Inativo', tom: 'inativo' };
  if (disco.estoque === 0) return { texto: 'Esgotado', tom: 'esgotado' };
  if (!estaParado(disco, hoje)) return null;

  const dias = diasDesde(disco.ultimaVendaEm, hoje);
  return { texto: dias === null ? 'Nunca vendido' : `Parado há ${dias} dias`, tom: 'parado' };
}

function nivelEstoque(estoque: number): 'zerado' | 'baixo' | undefined {
  if (estoque === 0) return 'zerado';
  return estoqueAcabando(estoque) ? 'baixo' : undefined;
}

// as categorias são constantes em caixa alta; na pílula leem como frase
function rotuloCategoria(categoria: string): string {
  return categoria.charAt(0) + categoria.slice(1).toLowerCase();
}

function plural(quantidade: number, singular: string, varios: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : varios}`;
}

export default function CuradoriaInventario() {
  const { discos, setDiscos, entradas, setEntradas } = useLoja();
  const [filtros, setFiltros] = useState<FiltrosDiscos>(FILTROS_DISCOS_VAZIOS);
  const [busca, setBusca] = useState('');
  const [recorte, setRecorte] = useState<Recorte>('todos');

  const [isFormDiscoVisible, setIsFormDiscoVisible] = useState(false);
  const [discoEmEdicao, setDiscoEmEdicao] = useState<Disco | null>(null);
  const [discoParaEntrada, setDiscoParaEntrada] = useState<Disco | null>(null);
  const [discoParaAlternarStatus, setDiscoParaAlternarStatus] =
    useState<Disco | null>(null);
  const [categoriaStatus, setCategoriaStatus] = useState<string | null>(null);
  const [justificativaStatus, setJustificativaStatus] = useState('');
  const [isInativacaoAutomaticaVisible, setIsInativacaoAutomaticaVisible] =
    useState(false);
  const [pagina, setPagina] = useState(1);
  const [isFiltroAberto, { toggle: toggleFiltro }] = useDisclosure(false);

  // fixo por sessão para a lista de elegíveis e a confirmação baterem (RF0013)
  const hoje = useMemo(() => new Date(), []);

  // status e busca ficam na barra; o painel de filtros guarda só os critérios finos
  const discosFiltrados = useMemo(() => {
    const status = recorte === 'baixo' ? 'todos' : recorte;
    return buscarNoInventario(filtrarDiscos(discos, { ...filtros, status }), busca).filter(
      (disco) => recorte !== 'baixo' || comEstoqueBaixo(disco),
    );
  }, [discos, filtros, busca, recorte]);
  const discosElegiveis = useMemo(
    () =>
      discos.filter((disco) => elegivelParaInativacaoAutomatica(disco, hoje)),
    [discos, hoje]
  );
  const totalPaginas = Math.max(1, Math.ceil(discosFiltrados.length / POR_PAGINA));
  // filtrar pode encurtar a lista com a página lá na frente
  const paginaAtual = Math.min(pagina, totalPaginas);

  const discosDaPagina = useMemo(
    () =>
      discosFiltrados.slice(
        (paginaAtual - 1) * POR_PAGINA,
        paginaAtual * POR_PAGINA,
      ),
    [discosFiltrados, paginaAtual],
  );

  const qtdFiltrosAtivos = contarFiltrosDiscosAtivos(filtros);
  const discosAtivos = discos.filter((disco) => disco.isAtivo);
  const qtdEstoqueBaixo = discosAtivos.filter(comEstoqueBaixo).length;
  const qtdParados = discosAtivos.filter((disco) => estaParado(disco, hoje)).length;

  const justificativaValida =
    justificativaStatus.trim().length >= JUSTIFICATIVA_MINIMA_STATUS;

  function handleAlterarFiltro<Campo extends keyof FiltrosDiscos>(
    campo: Campo,
    valor: FiltrosDiscos[Campo]
  ): void {
    setFiltros((filtrosAtuais) => ({ ...filtrosAtuais, [campo]: valor }));
  }

  function handleLimparFiltros(): void {
    setFiltros(FILTROS_DISCOS_VAZIOS);
  }

  function handleAbrirNovoDisco(): void {
    setDiscoEmEdicao(null);
    setIsFormDiscoVisible(true);
  }

  function handleAbrirEdicaoDisco(disco: Disco): void {
    setDiscoEmEdicao(disco);
    setIsFormDiscoVisible(true);
  }

  function handleFecharFormDisco(): void {
    setIsFormDiscoVisible(false);
    setDiscoEmEdicao(null);
  }

  function handleSubmitDisco(valores: FormDiscoValues): void {
    if (discoEmEdicao) {
      setDiscos((discosAtuais) =>
        discosAtuais.map((disco) =>
          disco.id === discoEmEdicao.id
            ? {
                ...disco,
                ...valores,
                // a miniatura do Discogs não vale mais se a capa mudou
                coverThumb:
                  valores.coverSrc === disco.coverSrc ? disco.coverThumb : undefined,
              }
            : disco
        )
      );
    } else {
      setDiscos((discosAtuais) => [
        ...discosAtuais,
        {
          ...valores,
          id: Date.now(), // id definitivo vem do backend (RNF0021) - mockado temporariamente
          numForSale: 0,
          discogsUri: '',
          estoque: 0,
          isAtivo: true,
          motivoStatus: null,
          ultimaVendaEm: null,
        },
      ]);

    }

    handleFecharFormDisco();
  }

  function handleAbrirEntradaEstoque(disco: Disco): void {
    setDiscoParaEntrada(disco);
  }

  function handleFecharFormEntrada(): void {
    setDiscoParaEntrada(null);
  }

  function handleSubmitEntrada(valores: FormEntradaEstoqueValues): void {
    if (!discoParaEntrada) return;

    const entradaNova: EntradaEstoque = {
      id: `ee-${String(entradas.length + 1).padStart(3, '0')}`,
      discoId: discoParaEntrada.id,
      quantidade: valores.quantidade,
      valorCusto: valores.valorCusto,
      fornecedor: valores.fornecedor,
      dataEntrada: valores.dataEntrada ?? paraIso(hoje),
    };

    setEntradas((entradasAtuais) => [...entradasAtuais, entradaNova]);
    setDiscos((discosAtuais) =>
      discosAtuais.map((disco) =>
        disco.id === discoParaEntrada.id
          ? aplicarEntradaEstoque(disco, entradaNova, entradas)
          : disco
      )
    );


    handleFecharFormEntrada();
  }

  function handleSolicitarAlterarStatus(disco: Disco): void {
    setDiscoParaAlternarStatus(disco);
    setCategoriaStatus(null);
    setJustificativaStatus('');
  }

  function handleCancelarAlterarStatus(): void {
    setDiscoParaAlternarStatus(null);
    setCategoriaStatus(null);
    setJustificativaStatus('');
  }

  function handleConfirmarAlterarStatus(): void {
    if (!discoParaAlternarStatus || !categoriaStatus) return;
    if (!justificativaValida) return;

    const motivo: MotivoStatus = {
      categoria: categoriaStatus,
      justificativa: justificativaStatus,
      data: paraIso(new Date()),
      automatico: false,
    };

    setDiscos((discosAtuais) =>
      discosAtuais.map((disco) =>
        disco.id === discoParaAlternarStatus.id
          ? { ...disco, isAtivo: !disco.isAtivo, motivoStatus: motivo }
          : disco
      )
    );


    handleCancelarAlterarStatus();
  }

  function handleAbrirInativacaoAutomatica(): void {
    setIsInativacaoAutomaticaVisible(true);
  }

  function handleFecharInativacaoAutomatica(): void {
    setIsInativacaoAutomaticaVisible(false);
  }

  function handleConfirmarInativacaoAutomatica(): void {
    setDiscos((discosAtuais) =>
      discosAtuais.map((disco) =>
        elegivelParaInativacaoAutomatica(disco, hoje)
          ? {
              ...disco,
              isAtivo: false,
              motivoStatus: motivoInativacaoAutomatica(disco, hoje),
            }
          : disco
      )
    );

    handleFecharInativacaoAutomatica();
  }

  function renderNota(disco: Disco) {
    const nota = notaDoDisco(disco, hoje);
    if (!nota) return null;

    const etiqueta = (
      <span className={styles.nota} data-tom={nota.tom}>
        {nota.texto}
      </span>
    );

    // RN0015: o motivo da inativação fica a um hover de distância
    return disco.motivoStatus && !disco.isAtivo ? (
      <Tooltip
        label={`${disco.motivoStatus.categoria} — ${disco.motivoStatus.justificativa}`}
        multiline
        w={260}
      >
        {etiqueta}
      </Tooltip>
    ) : (
      etiqueta
    );
  }

  function renderLinhas() {
    if (discosFiltrados.length === 0) {
      return <p className={painel.vazio}>Nenhum disco com esses filtros.</p>;
    }

    return discosDaPagina.map((disco) => {
      const apagado = !disco.isAtivo || undefined;

      return (
        <div key={disco.id} className={painel.linhaTabela} style={GRADE_LINHA}>
          <div className={styles.capa} data-apagado={apagado}>
            <Capa src={disco.coverThumb ?? disco.coverSrc} alt="" />
          </div>
          <div className={styles.disco} data-apagado={apagado}>
            <strong>{disco.title}</strong>
            <span className={styles.sub}>
              <span className={styles.artista}>{disco.artist}</span>
              <span aria-hidden>·</span>
              <span className={styles.formato}>{nomeFormato(disco.formatoId)}</span>
              {renderNota(disco)}
            </span>
          </div>
          <span className={painel.numero}>{disco.releaseYear}</span>
          <span className={styles.categorias} title={disco.genres.join(' · ')}>
            {disco.genres.join(' · ')}
          </span>
          <span className={styles.grupo}>
            {nomeGrupoPrecificacao(disco.grupoPrecificacaoId)}
          </span>
          <span className={styles.preco}>
            {disco.price === 0 ? (
              <span className={styles.semPreco}>Não precificado</span>
            ) : (
              formatarBRL(disco.price)
            )}
            {disco.autorizacaoGerente !== null && (
              <Tooltip
                label={`Preço abaixo da margem, autorizado por ${disco.autorizacaoGerente} (RN0014)`}
              >
                <span className={styles.autorizado}>Autorizado</span>
              </Tooltip>
            )}
          </span>
          <span className={styles.estoque} data-nivel={nivelEstoque(disco.estoque)}>
            {disco.estoque}
          </span>
          <span className={painel.acoes}>
            <button
              type="button"
              className={painel.acao}
              aria-label={`Registrar entrada de estoque de ${disco.title}`}
              onClick={() => handleAbrirEntradaEstoque(disco)}
            >
              Entrada
            </button>
            <button
              type="button"
              className={painel.acao}
              aria-label={`Editar ${disco.title}`}
              onClick={() => handleAbrirEdicaoDisco(disco)}
            >
              Editar
            </button>
            <button
              type="button"
              className={disco.isAtivo ? painel.acaoPerigo : painel.acao}
              aria-label={
                disco.isAtivo ? `Inativar ${disco.title}` : `Reativar ${disco.title}`
              }
              onClick={() => handleSolicitarAlterarStatus(disco)}
            >
              {disco.isAtivo ? 'Inativar' : 'Reativar'}
            </button>
          </span>
        </div>
      );
    });
  }

  return (
    <div className={painel.painel}>
      {isFormDiscoVisible && (
        <Modal
          size={880}
          opened={isFormDiscoVisible}
          onClose={handleFecharFormDisco}
          title={discoEmEdicao ? `Editar ${discoEmEdicao.title}` : 'Cadastrar disco'}
        >
          <FormDisco
            key={discoEmEdicao?.id ?? 'novo'}
            initialValues={discoEmEdicao ?? undefined}
            isEdit={Boolean(discoEmEdicao)}
            discos={discos}
            entradas={entradas}
            onClose={handleFecharFormDisco}
            onSubmit={handleSubmitDisco}
          />
        </Modal>
      )}
      {discoParaEntrada && (
        <Modal
          opened={Boolean(discoParaEntrada)}
          onClose={handleFecharFormEntrada}
          title="Entrada de estoque"
          styles={CABECALHO_COM_SUBTITULO}
        >
          <FormEntradaEstoque
            disco={discoParaEntrada}
            entradas={entradas}
            onClose={handleFecharFormEntrada}
            onSubmit={handleSubmitEntrada}
          />
        </Modal>
      )}
      {discoParaAlternarStatus && (
        <Modal
          opened={Boolean(discoParaAlternarStatus)}
          onClose={handleCancelarAlterarStatus}
          title={`${discoParaAlternarStatus.isAtivo ? 'Inativar' : 'Reativar'} ${discoParaAlternarStatus.title}`}
          styles={CABECALHO_COM_SUBTITULO}
        >
          <p className={painel.textoModal}>
            {discoParaAlternarStatus.isAtivo
              ? 'O disco sai da loja e some das buscas do cliente. O estoque e o histórico de vendas ficam preservados.'
              : 'O disco volta a aparecer na loja e nas buscas do cliente, com o estoque atual.'}
          </p>

          <div className={styles.camposStatus}>
            <fieldset className={styles.campo}>
              <legend className={styles.rotulo}>Categoria</legend>
              {/* RN0015 / RN0017: toda mudança de status leva uma categoria */}
              <div className={styles.pilulas}>
                {(discoParaAlternarStatus.isAtivo
                  ? CATEGORIAS_INATIVACAO
                  : CATEGORIAS_ATIVACAO
                ).map((categoria) => (
                  <button
                    key={categoria}
                    type="button"
                    className={styles.pilula}
                    aria-pressed={categoriaStatus === categoria}
                    onClick={() => setCategoriaStatus(categoria)}
                  >
                    {rotuloCategoria(categoria)}
                  </button>
                ))}
              </div>
            </fieldset>
            <Textarea
              label={
                <>
                  <span>Justificativa</span>
                  <span className={styles.contador} data-ok={justificativaValida || undefined}>
                    {justificativaStatus.trim().length} / {JUSTIFICATIVA_MINIMA_STATUS} mín.
                  </span>
                </>
              }
              styles={{
                label: { display: 'flex', justifyContent: 'space-between', width: '100%' },
              }}
              placeholder="Explique o motivo da mudança de status"
              rows={3}
              resize="vertical"
              value={justificativaStatus}
              onChange={(event) =>
                setJustificativaStatus(event.currentTarget.value)
              }
            />
          </div>

          <div className={painel.rodapeModal}>
            <Button type="button" variant="default" size="sm" onClick={handleCancelarAlterarStatus}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              color={discoParaAlternarStatus.isAtivo ? 'red' : 'dark'}
              disabled={!categoriaStatus || !justificativaValida}
              onClick={handleConfirmarAlterarStatus}
            >
              {discoParaAlternarStatus.isAtivo ? 'Inativar disco' : 'Reativar disco'}
            </Button>
          </div>
        </Modal>
      )}
      {isInativacaoAutomaticaVisible && (
        <Modal
          opened={isInativacaoAutomaticaVisible}
          onClose={handleFecharInativacaoAutomatica}
          title="Inativação automática"
          styles={CABECALHO_COM_SUBTITULO}
        >
          <p className={painel.textoModal}>
            A RF0013 inativa de uma vez os discos sem estoque e sem venda há{' '}
            {PARAMETRO_INATIVACAO_AUTOMATICA.diasSemVenda} dias ou mais (nunca
            vendidos também entram). Todos saem da loja marcados como{' '}
            <strong>FORA DE MERCADO</strong>.
          </p>

          <div className={styles.elegiveis}>
            {discosElegiveis.length === 0 && (
              <p className={painel.vazio}>Nenhum disco elegível agora.</p>
            )}
            {discosElegiveis.map((disco) => {
              const dias = diasDesde(disco.ultimaVendaEm, hoje);
              return (
                <div key={disco.id} className={styles.elegivel}>
                  <Capa src={disco.coverThumb ?? disco.coverSrc} alt="" />
                  <div className={styles.elegivelTexto}>
                    <strong>{disco.title}</strong>
                    <span>
                      {disco.artist} · {disco.estoque} em estoque
                    </span>
                  </div>
                  <span className={styles.dias}>
                    {dias === null ? 'Nunca vendido' : `${dias} dias`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={painel.rodapeModal}>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleFecharInativacaoAutomatica}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={discosElegiveis.length === 0}
              onClick={handleConfirmarInativacaoAutomatica}
            >
              Inativar {plural(discosElegiveis.length, 'disco', 'discos')}
            </Button>
          </div>
        </Modal>
      )}

      <CabecalhoPainel
        titulo="Inventário"
        resumo={[
          plural(discosAtivos.length, 'ativo', 'ativos'),
          `${qtdEstoqueBaixo} com estoque baixo`,
          `${plural(qtdParados, 'parado', 'parados')} há +${PARAMETRO_INATIVACAO_AUTOMATICA.diasSemVenda} dias`,
        ].join(' · ')}
        acoes={
          <>
            <Button
              variant="outline"
              disabled={discosElegiveis.length === 0}
              rightSection={
                discosElegiveis.length > 0 && (
                  <span className={styles.contagem}>{discosElegiveis.length}</span>
                )
              }
              onClick={handleAbrirInativacaoAutomatica}
              leftSection={<Time size={20} />}
            >
              Inativação automática
            </Button>
            <Button leftSection={<Add size={20} />} onClick={handleAbrirNovoDisco}>
              Cadastrar disco
            </Button>
          </>
        }
      />

      <div className={painel.barra}>
        <TextInput
          className={painel.busca}
          placeholder="Busque por título, artista ou código de catálogo"
          leftSection={<Search size={16} />}
          aria-label="Buscar disco"
          value={busca}
          onChange={(event) => setBusca(event.currentTarget.value)}
        />
        <SegmentedControl
          aria-label="Recorte do inventário"
          styles={{ label: { minHeight: 46 } }}
          value={recorte}
          onChange={(valor) => setRecorte(valor as Recorte)}
          data={OPCOES_RECORTE}
        />
        <button
          type="button"
          className={painel.botaoFiltros}
          data-ativo={isFiltroAberto || qtdFiltrosAtivos > 0 || undefined}
          aria-expanded={isFiltroAberto}
          onClick={toggleFiltro}
        >
          <Filter size={16} />
          {qtdFiltrosAtivos > 0 ? `Filtros · ${qtdFiltrosAtivos}` : 'Filtros'}
        </button>
      </div>

      {isFiltroAberto && (
        <div className={painel.filtros}>
          <TextInput
            label="Artista"
            placeholder="Nome do artista"
            size="sm"
            value={filtros.artista}
            onChange={(event) =>
              handleAlterarFiltro('artista', event.currentTarget.value)
            }
          />
          <TextInput
            label="Gravadora"
            placeholder="Nome da gravadora"
            size="sm"
            value={filtros.gravadora}
            onChange={(event) =>
              handleAlterarFiltro('gravadora', event.currentTarget.value)
            }
          />
          <TextInput
            label="Categoria"
            placeholder="Rock, Hip Hop..."
            size="sm"
            value={filtros.categoria}
            onChange={(event) =>
              handleAlterarFiltro('categoria', event.currentTarget.value)
            }
          />
          <Select
            label="Formato"
            size="sm"
            data={OPCOES_FORMATO_FILTRO}
            value={filtros.formatoId}
            onChange={(valor) => handleAlterarFiltro('formatoId', valor ?? '')}
          />
          <TextInput
            label="Código"
            placeholder="Catálogo ou código de barras"
            size="sm"
            value={filtros.codigo}
            onChange={(event) =>
              handleAlterarFiltro('codigo', event.currentTarget.value)
            }
          />
          <Select
            label="Grupo de precificação"
            size="sm"
            data={OPCOES_GRUPO_FILTRO}
            value={filtros.grupoPrecificacaoId}
            onChange={(valor) =>
              handleAlterarFiltro('grupoPrecificacaoId', valor ?? '')
            }
          />
          <NumberInput
            label="Ano de"
            placeholder="1970"
            size="sm"
            hideControls
            value={filtros.anoMin}
            onChange={(valor) => handleAlterarFiltro('anoMin', String(valor))}
          />
          <NumberInput
            label="Ano até"
            placeholder="2026"
            size="sm"
            hideControls
            value={filtros.anoMax}
            onChange={(valor) => handleAlterarFiltro('anoMax', String(valor))}
          />
          <NumberInput
            label="Preço de"
            placeholder="R$ 0,00"
            size="sm"
            hideControls
            decimalScale={2}
            prefix="R$ "
            value={filtros.precoMin}
            onChange={(valor) => handleAlterarFiltro('precoMin', String(valor))}
          />
          <NumberInput
            label="Preço até"
            placeholder="R$ 0,00"
            size="sm"
            hideControls
            decimalScale={2}
            prefix="R$ "
            value={filtros.precoMax}
            onChange={(valor) => handleAlterarFiltro('precoMax', String(valor))}
          />
          <div className={painel.filtroLargo}>
            <span className={painel.rotulo}>Estoque</span>
            <SegmentedControl
              value={filtros.estoque}
              onChange={(valor) =>
                handleAlterarFiltro('estoque', valor as EstoqueFiltro)
              }
              data={[
                { label: 'Todos', value: 'todos' },
                { label: 'Disponível', value: 'disponivel' },
                { label: 'Esgotado', value: 'esgotado' },
              ]}
            />
          </div>
          <div className={painel.filtrosRodape}>
            <Button variant="link" onClick={handleLimparFiltros}>
              Limpar filtros
            </Button>
          </div>
        </div>
      )}

      <div className={painel.tabela}>
        <div className={painel.cabecalhoTabela} style={GRADE}>
          <span />
          <span>Disco</span>
          <span>Ano</span>
          <span>Categorias</span>
          <span>Grupo</span>
          <span className={painel.direita}>Preço</span>
          <span className={painel.direita}>Estoque</span>
          <span className={painel.direita}>Ações</span>
        </div>
        {renderLinhas()}
      </div>

      {totalPaginas > 1 && (
        <Pagination total={totalPaginas} value={paginaAtual} onChange={setPagina} />
      )}
    </div>
  );
}
