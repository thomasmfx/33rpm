import painel from '../../pages/Curadoria/Painel.module.scss';
import styles from './CuradoriaInventario.module.scss';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Modal,
  NumberInput,
  Pagination,
  SegmentedControl,
  Select,
  Skeleton,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import type { Disco } from '../../types/disco';
import type {
  EstoqueFiltro,
  FiltrosDiscos,
  StatusFiltroDisco,
} from '../../types/inventario';
import {
  CATEGORIA_INATIVACAO_AUTOMATICA,
  FORMATOS_DISCO,
  GRUPOS_PRECIFICACAO,
} from '../../types/inventario';
import {
  contarFiltrosDiscosAtivos,
  FILTROS_DISCOS_VAZIOS,
} from '../../utils/filtrarDiscos';
import {
  diasDesde,
  estaParado,
  estoqueAcabando,
  JUSTIFICATIVA_MINIMA_STATUS,
  PARAMETRO_INATIVACAO_AUTOMATICA,
} from '../../utils/estoque';
import { nomeFormato } from '../../utils/catalogo';
import { formatarBRL, nomeGrupoPrecificacao } from '../../utils/precificacao';
import { useLoja } from '../../contexts/loja';
import { ErroApi } from '../../services/api';
import {
  alterarDisco,
  alterarStatusDisco,
  cadastrarDisco,
  listarDiscos,
  rodarInativacaoAutomatica,
} from '../../services/discosService';
import { registrarEntrada } from '../../services/estoqueService';
import { buscarDominiosDisco, DOMINIOS_DISCO_PADRAO } from '../../services/dominiosService';
import type { DominiosDisco } from '../../services/dominiosService';
import CabecalhoPainel from '../CabecalhoPainel/CabecalhoPainel';
import Capa from '../Capa/Capa';
import { EsqueletoLinhas } from '../Esqueleto/Esqueleto';
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

interface AlertaInventario {
  cor: 'red' | 'green' | 'gray';
  titulo?: string;
  mensagens: string[];
}

function mensagensDe(erro: unknown, padrao: string): string[] {
  return erro instanceof ErroApi ? erro.mensagens : [padrao];
}

function comEstoqueBaixo(disco: Disco): boolean {
  return disco.isAtivo && estoqueAcabando(disco.estoque);
}

// o estoque baixo é recorte da tela sobre os ativos que o servidor devolveu
function recortar(discos: Disco[], recorte: Recorte): Disco[] {
  return recorte === 'baixo' ? discos.filter(comEstoqueBaixo) : discos;
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
  const { discos: acervo, carregandoDiscos, recarregarDiscos } = useLoja();
  const [filtros, setFiltros] = useState<FiltrosDiscos>(FILTROS_DISCOS_VAZIOS);
  const [recorte, setRecorte] = useState<Recorte>('todos');

  // RF0015: a consulta é do servidor; o recorte de estoque baixo pede só os ativos
  const consultaAtual = useMemo<FiltrosDiscos>(
    () => ({ ...filtros, status: recorte === 'baixo' ? 'ativos' : recorte }),
    [filtros, recorte],
  );
  const [consulta] = useDebouncedValue(consultaAtual, 300);
  const [discos, setDiscos] = useState<Disco[]>([]);
  // esqueleto só na primeira carga; nas seguintes a tabela antiga fica até a nova chegar
  const [carregando, setCarregando] = useState(true);
  const [alerta, setAlerta] = useState<AlertaInventario | null>(null);
  const [dominios, setDominios] = useState<DominiosDisco>(DOMINIOS_DISCO_PADRAO);

  const [isFormDiscoVisible, setIsFormDiscoVisible] = useState(false);
  const [discoEmEdicao, setDiscoEmEdicao] = useState<Disco | null>(null);
  const [discoParaEntrada, setDiscoParaEntrada] = useState<Disco | null>(null);
  const [discoParaAlternarStatus, setDiscoParaAlternarStatus] =
    useState<Disco | null>(null);
  const [categoriaStatus, setCategoriaStatus] = useState<string | null>(null);
  const [justificativaStatus, setJustificativaStatus] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [isRodandoRotina, setIsRodandoRotina] = useState(false);
  // mensagens do servidor no modal aberto, seja de disco, entrada ou status
  const [errosModal, setErrosModal] = useState<string[]>([]);
  const [pagina, setPagina] = useState(1);
  const [isFiltroAberto, { toggle: toggleFiltro }] = useDisclosure(false);

  const hoje = useMemo(() => new Date(), []);

  const buscar = useCallback(async (): Promise<Disco[]> => {
    try {
      const lista = await listarDiscos(consulta);
      setDiscos(lista);
      setAlerta((atual) => (atual?.cor === 'red' ? null : atual));
      return lista;
    } catch (erro) {
      setAlerta({ cor: 'red', mensagens: mensagensDe(erro, 'Falha ao consultar o inventário.') });
      return [];
    } finally {
      setCarregando(false);
    }
  }, [consulta]);

  useEffect(() => {
    // busca no servidor a cada mudança de filtro; a API é o sistema externo aqui
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void buscar();
  }, [buscar]);

  useEffect(() => {
    let cancelado = false;
    buscarDominiosDisco()
      .then((resposta) => {
        if (!cancelado) setDominios(resposta);
      })
      // sem resposta ficam as listas do seed, que o servidor também conhece
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, []);

  const discosFiltrados = useMemo(() => recortar(discos, recorte), [discos, recorte]);
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
  const discosAtivos = acervo.filter((disco) => disco.isAtivo);
  const qtdEstoqueBaixo = discosAtivos.filter(comEstoqueBaixo).length;
  const qtdParados = discosAtivos.filter((disco) => estaParado(disco, hoje)).length;

  const justificativaValida =
    justificativaStatus.trim().length >= JUSTIFICATIVA_MINIMA_STATUS;

  /** Depois de cada escrita, a tabela e a vitrine da loja voltam a bater com o servidor. */
  async function atualizarListas(discoSalvoId?: number): Promise<void> {
    const [lista] = await Promise.all([buscar(), recarregarDiscos()]);
    if (discoSalvoId === undefined) return;
    // a ordem é por título: o disco salvo pode ter ido para outra página
    const indice = recortar(lista, recorte).findIndex((disco) => disco.id === discoSalvoId);
    if (indice >= 0) setPagina(Math.floor(indice / POR_PAGINA) + 1);
  }

  function handleAlterarFiltro<Campo extends keyof FiltrosDiscos>(
    campo: Campo,
    valor: FiltrosDiscos[Campo]
  ): void {
    setFiltros((filtrosAtuais) => ({ ...filtrosAtuais, [campo]: valor }));
  }

  // o título fica na barra de busca e não conta como filtro do painel
  function handleLimparFiltros(): void {
    setFiltros((filtrosAtuais) => ({ ...FILTROS_DISCOS_VAZIOS, titulo: filtrosAtuais.titulo }));
  }

  function handleAbrirNovoDisco(): void {
    setDiscoEmEdicao(null);
    setErrosModal([]);
    setIsFormDiscoVisible(true);
  }

  function handleAbrirEdicaoDisco(disco: Disco): void {
    setDiscoEmEdicao(disco);
    setErrosModal([]);
    setIsFormDiscoVisible(true);
  }

  function handleFecharFormDisco(): void {
    setIsFormDiscoVisible(false);
    setDiscoEmEdicao(null);
    setErrosModal([]);
  }

  async function handleSubmitDisco(valores: FormDiscoValues): Promise<void> {
    setEnviando(true);
    try {
      const salvo = discoEmEdicao
        ? await alterarDisco(
            discoEmEdicao.id,
            valores,
            // a miniatura do Discogs não vale mais se a capa mudou
            valores.coverSrc === discoEmEdicao.coverSrc ? (discoEmEdicao.coverThumb ?? null) : null,
          )
        : await cadastrarDisco(valores);
      handleFecharFormDisco();
      await atualizarListas(salvo.id);
    } catch (erro) {
      setErrosModal(mensagensDe(erro, 'Falha ao salvar o disco.'));
    } finally {
      setEnviando(false);
    }
  }

  function handleAbrirEntradaEstoque(disco: Disco): void {
    setErrosModal([]);
    setDiscoParaEntrada(disco);
  }

  function handleFecharFormEntrada(): void {
    setDiscoParaEntrada(null);
    setErrosModal([]);
  }

  async function handleSubmitEntrada(valores: FormEntradaEstoqueValues): Promise<void> {
    if (!discoParaEntrada) return;

    setEnviando(true);
    try {
      await registrarEntrada(discoParaEntrada.id, valores);
      handleFecharFormEntrada();
      await atualizarListas();
    } catch (erro) {
      setErrosModal(mensagensDe(erro, 'Falha ao registrar a entrada.'));
    } finally {
      setEnviando(false);
    }
  }

  function handleSolicitarAlterarStatus(disco: Disco): void {
    setDiscoParaAlternarStatus(disco);
    setCategoriaStatus(null);
    setJustificativaStatus('');
    setErrosModal([]);
  }

  function handleCancelarAlterarStatus(): void {
    setDiscoParaAlternarStatus(null);
    setCategoriaStatus(null);
    setJustificativaStatus('');
    setErrosModal([]);
  }

  // RF0012 + RN0015 e RF0016 + RN0017: categoria e justificativa vão ao servidor
  async function handleConfirmarAlterarStatus(): Promise<void> {
    if (!discoParaAlternarStatus || !categoriaStatus || !justificativaValida) return;

    setEnviando(true);
    try {
      await alterarStatusDisco(
        discoParaAlternarStatus.id,
        !discoParaAlternarStatus.isAtivo,
        categoriaStatus,
        justificativaStatus,
      );
      handleCancelarAlterarStatus();
      await atualizarListas();
    } catch (erro) {
      setErrosModal(mensagensDe(erro, 'Falha ao alterar o status do disco.'));
    } finally {
      setEnviando(false);
    }
  }

  /** RF0013 + RN0016: a mesma rotina que o servidor roda todo dia, disparada à mão. */
  async function handleInativacaoAutomatica(): Promise<void> {
    setIsRodandoRotina(true);
    try {
      const inativados = await rodarInativacaoAutomatica();
      setAlerta(
        inativados.length === 0
          ? {
              cor: 'gray',
              mensagens: ['Nenhum disco sem estoque e parado para inativar agora (RF0013).'],
            }
          : {
              cor: 'green',
              titulo: `${plural(inativados.length, 'disco inativado', 'discos inativados')} como ${CATEGORIA_INATIVACAO_AUTOMATICA} (RN0016)`,
              mensagens: inativados.map((disco) => `${disco.title} · ${disco.artist}`),
            },
      );
      await atualizarListas();
    } catch (erro) {
      setAlerta({
        cor: 'red',
        mensagens: mensagensDe(erro, 'Falha ao rodar a inativação automática.'),
      });
    } finally {
      setIsRodandoRotina(false);
    }
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
    if (carregando) return <EsqueletoLinhas colunas={COLUNAS} />;

    if (discosFiltrados.length === 0) {
      return <p className={painel.vazio}>Nenhum disco com esses filtros.</p>;
    }

    return discosDaPagina.map((disco) => {
      const apagado = !disco.isAtivo || undefined;

      return (
        <div
          key={disco.id}
          className={painel.linhaTabela}
          style={GRADE_LINHA}
          data-testid="disco-linha"
          data-disco-id={disco.id}
          data-codigo={disco.codigo}
        >
          <div className={styles.capa} data-apagado={apagado}>
            <Capa src={disco.coverThumb ?? disco.coverSrc} alt="" />
          </div>
          <div className={styles.disco} data-apagado={apagado}>
            <strong>{disco.title}</strong>
            <span className={styles.sub}>
              <span className={styles.artista}>{disco.artist}</span>
              <span aria-hidden>·</span>
              <span className={styles.formato}>{nomeFormato(disco.formatoId)}</span>
              <span aria-hidden>·</span>
              <span className={styles.formato}>{disco.codigo}</span>
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
              data-testid="btn-nova-entrada"
              onClick={() => handleAbrirEntradaEstoque(disco)}
            >
              Entrada
            </button>
            <button
              type="button"
              className={painel.acao}
              aria-label={`Editar ${disco.title}`}
              data-testid="btn-editar-disco"
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
              data-testid={disco.isAtivo ? 'btn-inativar-disco' : 'btn-ativar-disco'}
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
            discos={acervo}
            dominios={dominios}
            erros={errosModal}
            enviando={enviando}
            onClose={handleFecharFormDisco}
            onSubmit={(valores) => void handleSubmitDisco(valores)}
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
            fornecedores={dominios.fornecedores}
            erros={errosModal}
            enviando={enviando}
            onClose={handleFecharFormEntrada}
            onSubmit={(valores) => void handleSubmitEntrada(valores)}
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
              <div className={styles.pilulas} data-testid="status-categoria">
                {(discoParaAlternarStatus.isAtivo
                  ? dominios.categoriasInativacao
                  : dominios.categoriasAtivacao
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
              data-testid="status-justificativa"
              value={justificativaStatus}
              onChange={(event) =>
                setJustificativaStatus(event.currentTarget.value)
              }
            />
          </div>

          {errosModal.length > 0 && (
            <Alert color="red" mt="md" data-testid="alerta-status">
              {errosModal.map((mensagem) => (
                <div key={mensagem}>{mensagem}</div>
              ))}
            </Alert>
          )}

          <div className={painel.rodapeModal}>
            <Button type="button" variant="default" size="sm" onClick={handleCancelarAlterarStatus}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              color={discoParaAlternarStatus.isAtivo ? 'red' : 'dark'}
              disabled={!categoriaStatus || !justificativaValida}
              loading={enviando}
              data-testid="btn-confirmar-status"
              onClick={() => void handleConfirmarAlterarStatus()}
            >
              {discoParaAlternarStatus.isAtivo ? 'Inativar disco' : 'Reativar disco'}
            </Button>
          </div>
        </Modal>
      )}

      <CabecalhoPainel
        titulo="Inventário"
        resumo={
          carregandoDiscos ? (
            <Skeleton height={12} width={260} />
          ) : (
            [
              plural(discosAtivos.length, 'ativo', 'ativos'),
              `${qtdEstoqueBaixo} com estoque baixo`,
              `${plural(qtdParados, 'parado', 'parados')} há +${PARAMETRO_INATIVACAO_AUTOMATICA.diasSemVenda} dias`,
            ].join(' · ')
          )
        }
        acoes={
          <>
            <Tooltip
              label={`RF0013: inativa como ${CATEGORIA_INATIVACAO_AUTOMATICA} os discos sem estoque e sem venda há ${PARAMETRO_INATIVACAO_AUTOMATICA.diasSemVenda} dias ou mais (nunca vendidos também entram).`}
              multiline
              w={300}
            >
              <Button
                variant="outline"
                loading={isRodandoRotina}
                onClick={() => void handleInativacaoAutomatica()}
                leftSection={<Time size={20} />}
                data-testid="btn-inativacao-automatica"
              >
                Rodar inativação automática
              </Button>
            </Tooltip>
            <Button
              leftSection={<Add size={20} />}
              onClick={handleAbrirNovoDisco}
              data-testid="btn-novo-disco"
            >
              Cadastrar disco
            </Button>
          </>
        }
      />

      {alerta && (
        <Alert
          color={alerta.cor}
          title={alerta.titulo}
          withCloseButton
          onClose={() => setAlerta(null)}
          data-testid="alerta-inventario"
        >
          {alerta.mensagens.map((mensagem) => (
            <div key={mensagem}>{mensagem}</div>
          ))}
        </Alert>
      )}

      <div className={painel.barra}>
        <TextInput
          className={painel.busca}
          placeholder="Busque pelo título"
          leftSection={<Search size={16} />}
          aria-label="Buscar disco pelo título"
          data-testid="filtro-titulo"
          value={filtros.titulo}
          onChange={(event) => handleAlterarFiltro('titulo', event.currentTarget.value)}
        />
        <SegmentedControl
          aria-label="Recorte do inventário"
          styles={{ label: { minHeight: 46 } }}
          data-testid="filtro-status"
          value={recorte}
          onChange={(valor) => setRecorte(valor as Recorte)}
          data={OPCOES_RECORTE}
        />
        <button
          type="button"
          className={painel.botaoFiltros}
          data-ativo={isFiltroAberto || qtdFiltrosAtivos > 0 || undefined}
          aria-expanded={isFiltroAberto}
          data-testid="btn-filtros"
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
            data-testid="filtro-artista"
            value={filtros.artista}
            onChange={(event) =>
              handleAlterarFiltro('artista', event.currentTarget.value)
            }
          />
          <TextInput
            label="Gravadora"
            placeholder="Nome da gravadora"
            size="sm"
            data-testid="filtro-gravadora"
            value={filtros.gravadora}
            onChange={(event) =>
              handleAlterarFiltro('gravadora', event.currentTarget.value)
            }
          />
          <TextInput
            label="Categoria"
            placeholder="Rock, Hip Hop..."
            size="sm"
            data-testid="filtro-categoria"
            value={filtros.categoria}
            onChange={(event) =>
              handleAlterarFiltro('categoria', event.currentTarget.value)
            }
          />
          <Select
            label="Formato"
            size="sm"
            data={OPCOES_FORMATO_FILTRO}
            data-testid="filtro-formato"
            value={filtros.formatoId}
            onChange={(valor) => handleAlterarFiltro('formatoId', valor ?? '')}
          />
          <TextInput
            label="Código"
            placeholder="DSC, catálogo ou código de barras"
            size="sm"
            data-testid="filtro-codigo"
            value={filtros.codigo}
            onChange={(event) =>
              handleAlterarFiltro('codigo', event.currentTarget.value)
            }
          />
          <Select
            label="Grupo de precificação"
            size="sm"
            data={OPCOES_GRUPO_FILTRO}
            data-testid="filtro-grupo"
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
            data-testid="filtro-ano-min"
            value={filtros.anoMin}
            onChange={(valor) => handleAlterarFiltro('anoMin', String(valor))}
          />
          <NumberInput
            label="Ano até"
            placeholder="2026"
            size="sm"
            hideControls
            data-testid="filtro-ano-max"
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
            data-testid="filtro-preco-min"
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
            data-testid="filtro-preco-max"
            value={filtros.precoMax}
            onChange={(valor) => handleAlterarFiltro('precoMax', String(valor))}
          />
          <div className={painel.filtroLargo}>
            <span className={painel.rotulo}>Estoque</span>
            <SegmentedControl
              data-testid="filtro-estoque"
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
            <Button variant="link" data-testid="btn-limpar-filtros" onClick={handleLimparFiltros}>
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
