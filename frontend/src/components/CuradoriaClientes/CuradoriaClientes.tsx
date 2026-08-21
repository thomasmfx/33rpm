import styles from './CuradoriaClientes.module.scss';
import { useMemo, useState } from 'react';
import {
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
import { useDisclosure } from '@mantine/hooks';
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
import { mockClientes } from './mockClientes';
import type {
  Cliente,
  FiltrosClientes,
  StatusFiltro,
} from '../../types/cliente';
import {
  contarFiltrosAtivos,
  filtrarClientes,
  FILTROS_VAZIOS,
} from '../../utils/filtrarClientes';
import FormCliente, {
  type FormClienteValues,
} from '../FormCliente/FormCliente';

function CuradoriaClientes() {
  const [clientes, setClientes] = useState<Cliente[]>(mockClientes);
  const [filtros, setFiltros] = useState<FiltrosClientes>(FILTROS_VAZIOS);
  const [isFormClienteVisible, setIsFormClienteVisible] =
    useState<boolean>(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null);
  const [clienteParaAlternarStatus, setClienteParaAlternarStatus] =
    useState<Cliente | null>(null);
  const [isFiltroAberto, { toggle: toggleFiltro, close: fecharFiltro }] =
    useDisclosure(false);

  const clientesFiltrados = useMemo(
    () => filtrarClientes(clientes, filtros),
    [clientes, filtros],
  );
  const qtdFiltrosAtivos = contarFiltrosAtivos(filtros);

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
    setIsFormClienteVisible(true);
  }

  function handleAbrirEdicaoCliente(cliente: Cliente): void {
    setClienteEmEdicao(cliente);
    setIsFormClienteVisible(true);
  }

  function handleFecharFormCliente(): void {
    setIsFormClienteVisible(false);
    setClienteEmEdicao(null);
  }

  function handleSubmitCliente(valores: FormClienteValues): void {
    const dadosCliente = {
      nome: valores.nome,
      email: valores.email,
      telefone: valores.telefone,
      cpf: valores.cpf,
      dataNascimento: valores.dataNascimento,
      isAtivo: valores.isAtivo,
    };

    if (clienteEmEdicao) {
      setClientes((clientesAtuais) =>
        clientesAtuais.map((cliente) =>
          cliente.id === clienteEmEdicao.id
            ? { ...cliente, ...dadosCliente }
            : cliente,
        ),
      );
    } else {
      setClientes((clientesAtuais) => [
        ...clientesAtuais,
        {
          ...dadosCliente,
          id: crypto.randomUUID().slice(0, 8),
          ranking: 0,
        },
      ]);
    }

    handleFecharFormCliente();
  }

  function handleSolicitarAlterarStatus(cliente: Cliente): void {
    setClienteParaAlternarStatus(cliente);
  }

  function handleCancelarAlterarStatus(): void {
    setClienteParaAlternarStatus(null);
  }

  function handleConfirmarAlterarStatus(): void {
    if (!clienteParaAlternarStatus) return;

    setClientes((clientesAtuais) =>
      clientesAtuais.map((cliente) =>
        cliente.id === clienteParaAlternarStatus.id
          ? { ...cliente, isAtivo: !clienteParaAlternarStatus.isAtivo }
          : cliente,
      ),
    );

    handleCancelarAlterarStatus();
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
          <FormCliente
            key={clienteEmEdicao?.id ?? 'novo'}
            initialValues={clienteEmEdicao ?? undefined}
            isEdit={Boolean(clienteEmEdicao)}
            onClose={handleFecharFormCliente}
            onSubmit={handleSubmitCliente}
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
                  value={filtros.cpf}
                  onChange={(event) =>
                    handleAlterarFiltro('cpf', event.currentTarget.value)
                  }
                />
                <TextInput
                  label="ID"
                  placeholder="c1-abc-123"
                  size="xs"
                  radius="sm"
                  value={filtros.id}
                  onChange={(event) =>
                    handleAlterarFiltro('id', event.currentTarget.value)
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
                    value={filtros.rankingMinimo}
                    onChange={(valor) =>
                      handleAlterarFiltro('rankingMinimo', valor)
                    }
                  />
                </div>
                <Group justify="flex-end">
                  <Button
                    variant="subtle"
                    color="dark"
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
            placeholder="Busque um cliente por nome"
            radius="sm"
            rightSection={<IconSearch />}
            flex={0.3}
            value={filtros.nome}
            onChange={(event) =>
              handleAlterarFiltro('nome', event.currentTarget.value)
            }
          />
        </nav>
        <Table withTableBorder withColumnBorders highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Telefone</Table.Th>
              <Table.Th>Ranking</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {clientesFiltrados.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6} ta="center" py="xl">
                  <Text fw={300} size="sm" c="dimmed">
                    Nenhum cliente encontrado
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {clientesFiltrados.map((cliente) => (
              <Table.Tr key={cliente.id} fw={300}>
                <Table.Td>{cliente.id}</Table.Td>
                <Table.Td maw={250}>
                  <Text truncate="end" fw={300} size="sm">
                    {cliente.nome}
                  </Text>
                </Table.Td>
                <Table.Td maw={250}>
                  <Text truncate="end" fw={300} size="sm">
                    {cliente.email}
                  </Text>
                </Table.Td>
                <Table.Td>{cliente.telefone}</Table.Td>
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
                    <button className={styles.actionButton} type="button">
                      <IconLogin stroke={1.8} />
                    </button>
                    <button
                      className={styles.actionButton}
                      type="button"
                      aria-label={`Editar ${cliente.nome}`}
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
