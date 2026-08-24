import styles from './CuradoriaInventario.module.scss';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Flex,
  Group,
  Image,
  Indicator,
  Modal,
  NumberInput,
  Popover,
  Select,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconFilter2,
  IconPackageImport,
  IconPencil,
  IconPlus,
  IconSearch,
  IconToggleLeftFilled,
  IconToggleRightFilled,
  IconWand,
} from '@tabler/icons-react';
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
  contarFiltrosDiscosAtivos,
  filtrarDiscos,
  FILTROS_DISCOS_VAZIOS,
} from '../../utils/filtrarDiscos';
import {
  aplicarEntradaEstoque,
  diasDesde,
  elegivelParaInativacaoAutomatica,
  motivoInativacaoAutomatica,
  paraIso,
  PARAMETRO_INATIVACAO_AUTOMATICA,
} from '../../utils/estoque';
import { nomeFormato, nomesEdicoes } from '../../utils/catalogo';
import { formatarBRL, nomeGrupoPrecificacao } from '../../utils/precificacao';
import { discosMock } from '../../utils/discosMock';
import { entradasEstoqueMock } from '../../utils/estoqueMock';
import FormDisco, { type FormDiscoValues } from '../FormDisco/FormDisco';
import FormEntradaEstoque, {
  type FormEntradaEstoqueValues,
} from '../FormEntradaEstoque/FormEntradaEstoque';

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

export default function CuradoriaInventario() {
  const [discos, setDiscos] = useState<Disco[]>(discosMock);
  const [entradas, setEntradas] =
    useState<EntradaEstoque[]>(entradasEstoqueMock);
  const [filtros, setFiltros] = useState<FiltrosDiscos>(FILTROS_DISCOS_VAZIOS);

  const [isFormDiscoVisible, setIsFormDiscoVisible] = useState(false);
  const [discoEmEdicao, setDiscoEmEdicao] = useState<Disco | null>(null);
  const [discoParaEntrada, setDiscoParaEntrada] = useState<Disco | null>(null);
  const [discoParaAlternarStatus, setDiscoParaAlternarStatus] =
    useState<Disco | null>(null);
  const [categoriaStatus, setCategoriaStatus] = useState<string | null>(null);
  const [justificativaStatus, setJustificativaStatus] = useState('');
  const [isInativacaoAutomaticaVisible, setIsInativacaoAutomaticaVisible] =
    useState(false);
  const [isFiltroAberto, { toggle: toggleFiltro, close: fecharFiltro }] =
    useDisclosure(false);

  // fixo por sessão para a lista de elegíveis e a confirmação baterem (RF0013)
  const hoje = useMemo(() => new Date(), []);

  const discosFiltrados = useMemo(
    () => filtrarDiscos(discos, filtros),
    [discos, filtros]
  );
  const discosElegiveis = useMemo(
    () =>
      discos.filter((disco) => elegivelParaInativacaoAutomatica(disco, hoje)),
    [discos, hoje]
  );
  const qtdFiltrosAtivos = contarFiltrosDiscosAtivos(filtros);

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
          disco.id === discoEmEdicao.id ? { ...disco, ...valores } : disco
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
    if (justificativaStatus.trim().length < 10) return;

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

  return (
    <>
      {isFormDiscoVisible && (
        <Modal
          centered
          size="xl"
          withCloseButton={false}
          opened={isFormDiscoVisible}
          onClose={handleFecharFormDisco}
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
          centered
          size="md"
          withCloseButton={false}
          opened={Boolean(discoParaEntrada)}
          onClose={handleFecharFormEntrada}
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
          centered
          size="md"
          opened={Boolean(discoParaAlternarStatus)}
          onClose={handleCancelarAlterarStatus}
          title={
            <Text fw={600} size="lg">
              {discoParaAlternarStatus.isAtivo
                ? 'Inativar disco'
                : 'Reativar disco'}
            </Text>
          }
        >
          <Text fw={300} size="sm">
            {discoParaAlternarStatus.isAtivo
              ? 'Ao inativar, o disco sai da loja e some das buscas do cliente. Confirmar a inativação de '
              : 'Ao reativar, o disco volta a aparecer na loja e nas buscas do cliente. Confirmar a reativação de '}
            <Text span fw={600} size="sm">
              {discoParaAlternarStatus.title}
            </Text>
            ?
          </Text>

          <Stack gap="xs" mt="md">
            <Select
              label="Categoria"
              placeholder="Selecione um motivo"
              withAsterisk
              data={
                discoParaAlternarStatus.isAtivo
                  ? CATEGORIAS_INATIVACAO
                  : CATEGORIAS_ATIVACAO
              }
              value={categoriaStatus}
              onChange={setCategoriaStatus}
            />
            <Textarea
              label="Justificativa"
              placeholder="Explique o motivo da mudança de status"
              withAsterisk
              minRows={3}
              value={justificativaStatus}
              onChange={(event) =>
                setJustificativaStatus(event.currentTarget.value)
              }
            />
          </Stack>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={handleCancelarAlterarStatus}>
              Cancelar
            </Button>
            <Button
              color="orange"
              disabled={
                !categoriaStatus || justificativaStatus.trim().length < 10
              }
              onClick={handleConfirmarAlterarStatus}
            >
              {discoParaAlternarStatus.isAtivo ? 'Inativar' : 'Reativar'}
            </Button>
          </Group>
        </Modal>
      )}
      {isInativacaoAutomaticaVisible && (
        <Modal
          centered
          size="lg"
          opened={isInativacaoAutomaticaVisible}
          onClose={handleFecharInativacaoAutomatica}
          title={
            <Text fw={600} size="lg">
              Inativação automática
            </Text>
          }
        >
          <Text fw={300} size="sm" mb="md">
            A RF0013 inativa de uma vez os discos sem estoque e sem venda há{' '}
            {PARAMETRO_INATIVACAO_AUTOMATICA.diasSemVenda} dias ou mais (nunca
            vendidos também entram). Todos são marcados como{' '}
            <Text span fw={600} size="sm">
              FORA DE MERCADO
            </Text>
            .
          </Text>

          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Título</Table.Th>
                <Table.Th>Estoque</Table.Th>
                <Table.Th>Parado há</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {discosElegiveis.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={3} ta="center" py="md">
                    <Text fw={300} size="sm" c="dimmed">
                      Nenhum disco elegível agora
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {discosElegiveis.map((disco) => {
                const dias = diasDesde(disco.ultimaVendaEm, hoje);
                return (
                  <Table.Tr key={disco.id}>
                    <Table.Td>{disco.title}</Table.Td>
                    <Table.Td>{disco.estoque}</Table.Td>
                    <Table.Td>
                      {dias === null ? 'nunca vendido' : `${dias} dias`}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          <Group justify="flex-end" mt="xl">
            <Button
              variant="default"
              onClick={handleFecharInativacaoAutomatica}
            >
              Cancelar
            </Button>
            <Button
              color="orange"
              disabled={discosElegiveis.length === 0}
              onClick={handleConfirmarInativacaoAutomatica}
            >
              Inativar {discosElegiveis.length}{' '}
              {discosElegiveis.length === 1 ? 'disco' : 'discos'}
            </Button>
          </Group>
        </Modal>
      )}
      <div className={styles.painelInventario}>
        <nav className={styles.navBar}>
          <button
            className={styles.navButton}
            type="button"
            aria-label="Cadastrar disco"
            onClick={handleAbrirNovoDisco}
          >
            <IconPlus />
          </button>
          <button
            className={styles.navButton}
            type="button"
            aria-label="Executar inativação automática"
            disabled={discosElegiveis.length === 0}
            onClick={handleAbrirInativacaoAutomatica}
          >
            <Indicator
              label={discosElegiveis.length}
              size={16}
              color="orange"
              disabled={discosElegiveis.length === 0}
            >
              <IconWand />
            </Indicator>
          </button>
          <Popover
            position="bottom-end"
            width={320}
            shadow="md"
            withArrow
            trapFocus
            opened={isFiltroAberto}
            onChange={(aberto) => {
              if (!aberto) fecharFiltro();
            }}
          >
            <Popover.Target>
              <button
                className={styles.navButton}
                type="button"
                aria-label="Filtrar discos"
                onClick={toggleFiltro}
              >
                <Indicator
                  label={qtdFiltrosAtivos}
                  size={16}
                  color="dark"
                  disabled={qtdFiltrosAtivos === 0}
                >
                  <IconFilter2 />
                </Indicator>
              </button>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="xs">
                <TextInput
                  label="Artista"
                  placeholder="Nome do artista"
                  size="xs"
                  radius="sm"
                  value={filtros.artista}
                  onChange={(event) =>
                    handleAlterarFiltro('artista', event.currentTarget.value)
                  }
                />
                <TextInput
                  label="Gravadora"
                  placeholder="Nome da gravadora"
                  size="xs"
                  radius="sm"
                  value={filtros.gravadora}
                  onChange={(event) =>
                    handleAlterarFiltro('gravadora', event.currentTarget.value)
                  }
                />
                <Select
                  label="Formato"
                  size="xs"
                  radius="sm"
                  data={OPCOES_FORMATO_FILTRO}
                  value={filtros.formatoId}
                  onChange={(valor) =>
                    handleAlterarFiltro('formatoId', valor ?? '')
                  }
                />
                <TextInput
                  label="Categoria"
                  placeholder="Rock, Hip Hop..."
                  size="xs"
                  radius="sm"
                  value={filtros.categoria}
                  onChange={(event) =>
                    handleAlterarFiltro('categoria', event.currentTarget.value)
                  }
                />
                <TextInput
                  label="Código"
                  placeholder="Catálogo ou código de barras"
                  size="xs"
                  radius="sm"
                  value={filtros.codigo}
                  onChange={(event) =>
                    handleAlterarFiltro('codigo', event.currentTarget.value)
                  }
                />
                <Group gap="xs" grow>
                  <NumberInput
                    label="Ano de"
                    placeholder="1970"
                    size="xs"
                    radius="sm"
                    hideControls
                    value={filtros.anoMin}
                    onChange={(valor) =>
                      handleAlterarFiltro('anoMin', String(valor))
                    }
                  />
                  <NumberInput
                    label="Ano até"
                    placeholder="2026"
                    size="xs"
                    radius="sm"
                    hideControls
                    value={filtros.anoMax}
                    onChange={(valor) =>
                      handleAlterarFiltro('anoMax', String(valor))
                    }
                  />
                </Group>
                <Group gap="xs" grow>
                  <NumberInput
                    label="Preço de"
                    placeholder="0,00"
                    size="xs"
                    radius="sm"
                    hideControls
                    decimalScale={2}
                    prefix="R$ "
                    value={filtros.precoMin}
                    onChange={(valor) =>
                      handleAlterarFiltro('precoMin', String(valor))
                    }
                  />
                  <NumberInput
                    label="Preço até"
                    placeholder="0,00"
                    size="xs"
                    radius="sm"
                    hideControls
                    decimalScale={2}
                    prefix="R$ "
                    value={filtros.precoMax}
                    onChange={(valor) =>
                      handleAlterarFiltro('precoMax', String(valor))
                    }
                  />
                </Group>
                <Select
                  label="Grupo de precificação"
                  size="xs"
                  radius="sm"
                  data={OPCOES_GRUPO_FILTRO}
                  value={filtros.grupoPrecificacaoId}
                  onChange={(valor) =>
                    handleAlterarFiltro('grupoPrecificacaoId', valor ?? '')
                  }
                />
                <div>
                  <Text size="xs" fw={500} mb={4}>
                    Status
                  </Text>
                  <SegmentedControl
                    fullWidth
                    size="xs"
                    color="dark"
                    value={filtros.status}
                    onChange={(valor) =>
                      handleAlterarFiltro('status', valor as StatusFiltroDisco)
                    }
                    data={[
                      { label: 'Todos', value: 'todos' },
                      { label: 'Ativos', value: 'ativos' },
                      { label: 'Inativos', value: 'inativos' },
                    ]}
                  />
                </div>
                <div>
                  <Text size="xs" fw={500} mb={4}>
                    Estoque
                  </Text>
                  <SegmentedControl
                    fullWidth
                    size="xs"
                    color="dark"
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
                <Group justify="flex-end">
                  <Button
                    variant="subtle"
                    color="black"
                    size="xs"
                    onClick={handleLimparFiltros}
                  >
                    Limpar filtros
                  </Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
          <TextInput
            placeholder="Busque um disco por título"
            radius="sm"
            rightSection={<IconSearch />}
            flex={0.3}
            value={filtros.titulo}
            onChange={(event) =>
              handleAlterarFiltro('titulo', event.currentTarget.value)
            }
          />
        </nav>
        <div className={styles.tabelaContainer}>
          <Table withTableBorder withColumnBorders highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Capa</Table.Th>
                <Table.Th>Título</Table.Th>
                <Table.Th>Artista</Table.Th>
                <Table.Th>Ano</Table.Th>
                <Table.Th>Categorias</Table.Th>
                <Table.Th>Grupo</Table.Th>
                <Table.Th>Preço</Table.Th>
                <Table.Th>Estoque</Table.Th>
                <Table.Th>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {discosFiltrados.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={9} ta="center" py="xl">
                    <Text fw={300} size="sm" c="dimmed">
                      Nenhum disco encontrado
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {discosFiltrados.map((disco) => (
                <Table.Tr
                  key={disco.id}
                  className={disco.isAtivo ? undefined : styles.linhaInativa}
                >
                  <Table.Td>
                    <Image
                      src={disco.coverSrc}
                      w={44}
                      h={44}
                      radius="sm"
                      fit="cover"
                      alt={disco.title}
                    />
                  </Table.Td>
                  <Table.Td maw={220}>
                    <Stack gap={2}>
                      <Group gap={6} wrap="nowrap">
                        <Text truncate="end" fw={500} size="sm">
                          {disco.title}
                        </Text>
                        {!disco.isAtivo && disco.motivoStatus && (
                          <Tooltip
                            label={`${disco.motivoStatus.categoria} — ${disco.motivoStatus.justificativa}`}
                            multiline
                            w={260}
                          >
                            <Badge color="gray" size="xs">
                              Inativo
                            </Badge>
                          </Tooltip>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        {`${nomeFormato(disco.formatoId)} · ${nomesEdicoes(disco.edicaoIds)}`}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{disco.artist}</Text>
                  </Table.Td>
                  <Table.Td>{disco.releaseYear}</Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="wrap">
                      {disco.genres.slice(0, 2).map((genero) => (
                        <Badge
                          key={genero}
                          variant="light"
                          color="dark"
                          size="sm"
                        >
                          {genero}
                        </Badge>
                      ))}
                      {disco.genres.length > 2 && (
                        <Tooltip label={disco.genres.slice(2).join(', ')}>
                          <Badge variant="light" color="dark" size="sm">
                            +{disco.genres.length - 2}
                          </Badge>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {nomeGrupoPrecificacao(disco.grupoPrecificacaoId)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      {disco.price === 0 ? (
                        <Text size="sm" c="dimmed">
                          Não precificado
                        </Text>
                      ) : (
                        <Text size="sm">{formatarBRL(disco.price)}</Text>
                      )}
                      {disco.autorizacaoGerente !== null && (
                        <Tooltip
                          label={`Preço abaixo da margem, autorizado por ${disco.autorizacaoGerente}`}
                        >
                          <IconAlertTriangle size={14} color="orange" />
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        disco.estoque === 0
                          ? 'red'
                          : disco.estoque < 5
                            ? 'yellow'
                            : 'green'
                      }
                      variant="light"
                    >
                      {disco.estoque}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ width: '130px' }}>
                    <Flex gap="0.5em">
                      <button
                        className={styles.actionButton}
                        type="button"
                        aria-label={`Registrar entrada de estoque de ${disco.title}`}
                        onClick={() => handleAbrirEntradaEstoque(disco)}
                      >
                        <IconPackageImport stroke={1.8} />
                      </button>
                      <button
                        className={styles.actionButton}
                        type="button"
                        aria-label={`Editar ${disco.title}`}
                        onClick={() => handleAbrirEdicaoDisco(disco)}
                      >
                        <IconPencil stroke={1.8} />
                      </button>
                      <button
                        className={styles.actionButton}
                        type="button"
                        aria-label={
                          disco.isAtivo
                            ? `Inativar ${disco.title}`
                            : `Reativar ${disco.title}`
                        }
                        onClick={() => handleSolicitarAlterarStatus(disco)}
                      >
                        {disco.isAtivo ? (
                          <IconToggleRightFilled
                            stroke={1.8}
                            color="green"
                            className={styles.toggleIcon}
                          />
                        ) : (
                          <IconToggleLeftFilled
                            stroke={1.8}
                            opacity={0.4}
                            className={styles.toggleIcon}
                          />
                        )}
                      </button>
                    </Flex>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      </div>
    </>
  );
}
