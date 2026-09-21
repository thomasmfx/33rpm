import styles from './CuradoriaClientes.module.scss';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Flex,
  Group,
  Indicator,
  Modal,
  Popover,
  Rating,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import {
  IconFilter2,
  IconLogin,
  IconPencil,
  IconSearch,
  IconStar,
  IconStarFilled,
  IconToggleLeftFilled,
  IconToggleRightFilled,
  IconUserPlus,
} from '@tabler/icons-react';
import type {
  Cliente,
  Endereco,
  FiltrosClientes,
  StatusFiltro,
} from '../../types/cliente';
import {
  contarFiltrosAtivos,
  FILTROS_VAZIOS,
} from '../../utils/filtrarClientes';
import FormCliente, {
  type FormClienteValues,
} from '../FormCliente/FormCliente';
import { useLoja } from '../../contexts/loja';
import { telefoneCompleto } from '../../utils/perfilCliente';
import { ErroApi } from '../../services/api';
import {
  alterarCliente,
  alterarEnderecos,
  alterarSenha,
  cadastrarCliente,
  inativarCliente,
  listarClientes,
  reativarCliente,
} from '../../services/clientesService';

function mensagensDe(erro: unknown, padrao: string): string[] {
  return erro instanceof ErroApi ? erro.mensagens : [padrao];
}

function CuradoriaClientes() {
  const { recarregarClientes, entrarComoCliente } = useLoja();
  const navegar = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosClientes>(FILTROS_VAZIOS);
  const [filtrosAplicados] = useDebouncedValue(filtros, 300);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [erroLista, setErroLista] = useState<string[]>([]);
  const [erroForm, setErroForm] = useState<string[]>([]);
  const [isFormClienteVisible, setIsFormClienteVisible] =
    useState<boolean>(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null);
  const [clienteParaAlternarStatus, setClienteParaAlternarStatus] =
    useState<Cliente | null>(null);
  const [isFiltroAberto, { toggle: toggleFiltro, close: fecharFiltro }] =
    useDisclosure(false);

  const qtdFiltrosAtivos = contarFiltrosAtivos(filtros);

  // RF0024: a consulta é do servidor; a interface só monta os parâmetros
  const buscar = useCallback(async () => {
    try {
      setClientes(await listarClientes(filtrosAplicados));
      setErroLista([]);
    } catch (erro) {
      setErroLista(mensagensDe(erro, 'Falha ao consultar os clientes.'));
    }
  }, [filtrosAplicados]);

  useEffect(() => {
    // busca no servidor a cada mudança de filtro; a API é o sistema externo aqui
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void buscar();
  }, [buscar]);

  async function atualizarTudo(): Promise<void> {
    await buscar();
    await recarregarClientes();
  }

  function handleAlterarFiltro<Campo extends keyof FiltrosClientes>(
    campo: Campo,
    valor: FiltrosClientes[Campo],
  ): void {
    setFiltros((filtrosAtuais) => ({ ...filtrosAtuais, [campo]: valor }));
  }

  function handleLimparFiltros(): void {
    setFiltros(FILTROS_VAZIOS);
  }

  function handleAbrirNovoCliente(): void {
    setClienteEmEdicao(null);
    setErroForm([]);
    setIsFormClienteVisible(true);
  }

  function handleAbrirEdicaoCliente(cliente: Cliente): void {
    setClienteEmEdicao(cliente);
    setErroForm([]);
    setIsFormClienteVisible(true);
  }

  function handleFecharFormCliente(): void {
    setIsFormClienteVisible(false);
    setClienteEmEdicao(null);
    setErroForm([]);
  }

  async function handleSubmitCliente(valores: FormClienteValues): Promise<void> {
    try {
      if (clienteEmEdicao) {
        await alterarCliente(clienteEmEdicao.id, valores);
      } else {
        await cadastrarCliente(valores);
      }
      handleFecharFormCliente();
      await atualizarTudo();
    } catch (erro) {
      setErroForm(mensagensDe(erro, 'Falha ao salvar o cliente.'));
    }
  }

  /** RF0028: a senha muda sozinha, sem reenviar o cadastro inteiro. */
  async function handleAlterarSenha(
    senha: string,
    confirmacao: string,
  ): Promise<void> {
    if (!clienteEmEdicao) return;
    try {
      await alterarSenha(clienteEmEdicao.id, senha, confirmacao);
      handleFecharFormCliente();
      await atualizarTudo();
    } catch (erro) {
      setErroForm(mensagensDe(erro, 'Falha ao alterar a senha.'));
    }
  }

  /** RNF0034: os endereços mudam sozinhos, sem reenviar o cadastro inteiro. */
  async function handleAlterarEnderecos(enderecos: Endereco[]): Promise<void> {
    if (!clienteEmEdicao) return;
    try {
      await alterarEnderecos(clienteEmEdicao.id, enderecos);
      handleFecharFormCliente();
      await atualizarTudo();
    } catch (erro) {
      setErroForm(mensagensDe(erro, 'Falha ao alterar os endereços.'));
    }
  }

  function handleEntrarComoCliente(clienteId: string): void {
    entrarComoCliente(clienteId);
    navegar('/');
  }

  function handleSolicitarAlterarStatus(cliente: Cliente): void {
    setClienteParaAlternarStatus(cliente);
  }

  function handleCancelarAlterarStatus(): void {
    setClienteParaAlternarStatus(null);
  }

  // RF0023: inativar não apaga o cadastro; reativar devolve o acesso
  async function handleConfirmarAlterarStatus(): Promise<void> {
    if (!clienteParaAlternarStatus) return;

    try {
      if (clienteParaAlternarStatus.isAtivo) {
        await inativarCliente(clienteParaAlternarStatus.id);
      } else {
        await reativarCliente(clienteParaAlternarStatus.id);
      }
      handleCancelarAlterarStatus();
      await atualizarTudo();
    } catch (erro) {
      setErroLista(mensagensDe(erro, 'Falha ao alterar o status do cliente.'));
      handleCancelarAlterarStatus();
    }
  }

  return (
    <>
      {isFormClienteVisible && (
        <Modal
          centered
          size="xl"
          withCloseButton={false}
          opened={isFormClienteVisible}
          onClose={handleFecharFormCliente}
        >
          {erroForm.length > 0 && (
            <Alert color="red" mb="md" data-testid="alerta-erro">
              <Stack gap={4}>
                {erroForm.map((mensagem) => (
                  <Text key={mensagem} size="sm">
                    {mensagem}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}
          <FormCliente
            key={clienteEmEdicao?.id ?? 'novo'}
            initialValues={clienteEmEdicao ?? undefined}
            isEdit={Boolean(clienteEmEdicao)}
            onClose={handleFecharFormCliente}
            onSubmit={handleSubmitCliente}
            onAlterarSenha={handleAlterarSenha}
            onAlterarEnderecos={handleAlterarEnderecos}
          />
        </Modal>
      )}
      {clienteParaAlternarStatus && (
        <Modal
          centered
          size="md"
          opened={Boolean(clienteParaAlternarStatus)}
          onClose={handleCancelarAlterarStatus}
          title={
            <Text fw={600} size="lg">
              {clienteParaAlternarStatus.isAtivo
                ? 'Inativar cliente'
                : 'Reativar cliente'}
            </Text>
          }
        >
          <Text fw={300} size="sm">
            {clienteParaAlternarStatus.isAtivo
              ? 'Ao inativar, o cliente perde o acesso à loja e deixa de aparecer nos filtros de ativos. Confirmar a inativação de '
              : 'Ao reativar, o cliente volta a ter acesso à loja. Confirmar a reativação de '}
            <Text span fw={600} size="sm">
              {clienteParaAlternarStatus.nome}
            </Text>
            ?
          </Text>
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={handleCancelarAlterarStatus}>
              Cancelar
            </Button>
            <Button
              color={'orange'}
              data-testid="btn-confirmar-status"
              onClick={handleConfirmarAlterarStatus}
            >
              {clienteParaAlternarStatus.isAtivo ? 'Inativar' : 'Reativar'}
            </Button>
          </Group>
        </Modal>
      )}
      <div className={styles.painelClientes}>
        <nav className={styles.navBar}>
          <button
            className={styles.navButton}
            type="button"
            aria-label="Cadastrar cliente"
            data-testid="btn-novo-cliente"
            onClick={handleAbrirNovoCliente}
          >
            <IconUserPlus />
          </button>
          <Popover
            position="bottom-end"
            width={280}
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
                aria-label="Filtrar clientes"
                data-testid="btn-filtros"
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
                  label="E-mail"
                  placeholder="cliente@email.com"
                  size="xs"
                  radius="sm"
                  data-testid="filtro-email"
                  value={filtros.email}
                  onChange={(event) =>
                    handleAlterarFiltro('email', event.currentTarget.value)
                  }
                />
                <TextInput
                  label="Telefone"
                  placeholder="(11) 90000-0000"
                  size="xs"
                  radius="sm"
                  data-testid="filtro-telefone"
                  value={filtros.telefone}
                  onChange={(event) =>
                    handleAlterarFiltro('telefone', event.currentTarget.value)
                  }
                />
                <TextInput
                  label="CPF"
                  placeholder="000.000.000-00"
                  size="xs"
                  radius="sm"
                  data-testid="filtro-cpf"
                  value={filtros.cpf}
                  onChange={(event) =>
                    handleAlterarFiltro('cpf', event.currentTarget.value)
                  }
                />
                <TextInput
                  label="Código"
                  placeholder="CLI-000001"
                  size="xs"
                  radius="sm"
                  data-testid="filtro-codigo"
                  value={filtros.codigo}
                  onChange={(event) =>
                    handleAlterarFiltro('codigo', event.currentTarget.value)
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
                    data-testid="filtro-status"
                    value={filtros.status}
                    onChange={(valor) =>
                      handleAlterarFiltro('status', valor as StatusFiltro)
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
                    Ranking mínimo
                  </Text>
                  <Rating
                    color="dark"
                    data-testid="filtro-ranking"
                    value={filtros.rankingMinimo}
                    onChange={(valor) =>
                      handleAlterarFiltro('rankingMinimo', valor)
                    }
                  />
                </div>
                <Group justify="flex-end">
                  <Button
                    variant="subtle"
                    color="black"
                    size="xs"
                    data-testid="btn-limpar-filtros"
                    onClick={handleLimparFiltros}
                  >
                    Limpar filtros
                  </Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
          <TextInput
            placeholder="Busque um cliente por nome"
            radius="sm"
            rightSection={<IconSearch />}
            flex={0.3}
            data-testid="filtro-nome"
            value={filtros.nome}
            onChange={(event) =>
              handleAlterarFiltro('nome', event.currentTarget.value)
            }
          />
        </nav>
        {erroLista.length > 0 && (
          <Alert color="red" mb="md" data-testid="alerta-erro-lista">
            <Stack gap={4}>
              {erroLista.map((mensagem) => (
                <Text key={mensagem} size="sm">
                  {mensagem}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}
        <Table withTableBorder withColumnBorders highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Código</Table.Th>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Telefone</Table.Th>
              <Table.Th>Ranking</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {clientes.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6} ta="center" py="xl">
                  <Text fw={300} size="sm" c="dimmed" data-testid="lista-vazia">
                    Nenhum cliente encontrado
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {clientes.map((cliente) => (
              <Table.Tr key={cliente.id} fw={300} data-testid="cliente-linha">
                <Table.Td data-testid="cliente-codigo">{cliente.codigo}</Table.Td>
                <Table.Td maw={250}>
                  <Text truncate="end" fw={300} size="sm" data-testid="cliente-nome">
                    {cliente.nome}
                  </Text>
                </Table.Td>
                <Table.Td maw={250}>
                  <Text truncate="end" fw={300} size="sm" data-testid="cliente-email">
                    {cliente.email}
                  </Text>
                </Table.Td>
                <Table.Td>{telefoneCompleto(cliente.telefone)}</Table.Td>
                <Table.Td>
                  <Flex>
                    {[1, 2, 3, 4, 5].map((star) => {
                      return star > cliente.ranking ? (
                        <IconStar size={16} key={star} />
                      ) : (
                        <IconStarFilled size={16} key={star} />
                      );
                    })}
                  </Flex>
                </Table.Td>
                <Table.Td
                  style={{
                    width: '110px',
                  }}
                >
                  <Flex gap="0.5em">
                    <button
                      className={styles.actionButton}
                      type="button"
                      disabled={!cliente.isAtivo}
                      aria-label={`Navegar como ${cliente.nome}`}
                      data-testid="btn-entrar-como"
                      onClick={() => handleEntrarComoCliente(cliente.id)}
                    >
                      <IconLogin stroke={1.8} opacity={cliente.isAtivo ? 1 : 0.3} />
                    </button>
                    <button
                      className={styles.actionButton}
                      type="button"
                      aria-label={`Editar ${cliente.nome}`}
                      data-testid="btn-editar"
                      onClick={() => handleAbrirEdicaoCliente(cliente)}
                    >
                      <IconPencil stroke={1.8} />
                    </button>
                    <button
                      className={styles.actionButton}
                      type="button"
                      aria-label={
                        cliente.isAtivo
                          ? `Desativar ${cliente.nome}`
                          : `Ativar ${cliente.nome}`
                      }
                      data-testid="btn-alternar-status"
                      onClick={() => handleSolicitarAlterarStatus(cliente)}
                    >
                      {cliente.isAtivo ? (
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
    </>
  );
}

export default CuradoriaClientes;
