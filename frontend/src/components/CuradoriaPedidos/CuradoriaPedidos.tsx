import styles from './CuradoriaPedidos.module.scss';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Divider,
  Flex,
  Group,
  Image,
  Modal,
  Pagination,
  Radio,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import type { Cupom } from '../../types/cupom';
import type { Pedido, StatusPedido } from '../../types/pedido';
import {
  CORES_STATUS,
  itensDaTroca,
  proximosStatusAdmin,
  valorDosItens,
} from '../../utils/pedido';
import { resumirEndereco } from '../../utils/perfilCliente';
import { formatarBRL } from '../../utils/precificacao';
import { useLoja } from '../../contexts/loja';
import ConferenciaPagamento from './ConferenciaPagamento';

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR');

// 147 pedidos em uma página só faziam cada clique re-renderizar a tabela inteira
const POR_PAGINA = 15;

const OPCOES_STATUS = [
  { value: '', label: 'Todos' },
  ...(Object.keys(CORES_STATUS) as StatusPedido[]).map((status) => ({
    value: status,
    label: status,
  })),
];

function CuradoriaPedidos() {
  const {
    pedidos,
    clientes,
    cupons,
    atualizarPedido,
    receberItensDeTroca,
    resolverPagamento,
  } = useLoja();
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<string | null>('');
  const [somenteTrocas, setSomenteTrocas] = useState(false);
  const [pedidoDetalhe, setPedidoDetalhe] = useState<Pedido | null>(null);
  const [pedidoParaValidar, setPedidoParaValidar] = useState<Pedido | null>(null);
  const [pagina, setPagina] = useState(1);
  const [pedidoParaReceber, setPedidoParaReceber] = useState<Pedido | null>(
    null,
  );
  const [retornaAoEstoque, setRetornaAoEstoque] = useState<
    'sim' | 'nao' | null
  >(null);

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos.filter((pedido) => {
      if (somenteTrocas && pedido.troca === null) return false;
      if (statusFiltro && pedido.status !== statusFiltro) return false;
      if (!termo) return true;

      const nomeCliente =
        clientes.find((cliente) => cliente.id === pedido.clienteId)?.nome ??
        '';

      return (
        pedido.id.toLowerCase().includes(termo) ||
        nomeCliente.toLowerCase().includes(termo)
      );
    });
  }, [pedidos, clientes, busca, statusFiltro, somenteTrocas]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(pedidosFiltrados.length / POR_PAGINA),
  );
  // filtrar pode encurtar a lista com a página lá na frente; clampar aqui evita
  // um efeito só para corrigir o estado
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

  function handleAbrirDetalhe(pedido: Pedido): void {
    setPedidoDetalhe(pedido);
  }

  function handleFecharDetalhe(): void {
    setPedidoDetalhe(null);
  }

  function handleAvancarStatus(pedido: Pedido, proximo: StatusPedido): void {
    if (proximo === 'ITEM RECEBIDO') {
      setPedidoParaReceber(pedido);
      setRetornaAoEstoque(null);
      return;
    }

    // RN0037: a forma de pagamento é conferida antes de virar PAGAMENTO
    // REALIZADO, e o resultado pode ser recusa (RN0038)
    if (proximo === 'PAGAMENTO REALIZADO') {
      setPedidoParaValidar(pedido);
      return;
    }

    atualizarPedido(pedido.id, { status: proximo });
  }

  function handleFecharRecebimento(): void {
    setPedidoParaReceber(null);
    setRetornaAoEstoque(null);
  }

  function handleConfirmarRecebimento(): void {
    if (!pedidoParaReceber?.troca || !retornaAoEstoque) return;

    const id = crypto.randomUUID().slice(0, 8);
    const cupom: Cupom = {
      id,
      codigo: 'TROCA-' + id.toUpperCase(),
      tipo: 'troca',
      valor: valorDosItens(pedidoParaReceber, pedidoParaReceber.troca.itens),
      clienteId: pedidoParaReceber.clienteId,
      isUtilizado: false,
    };

    receberItensDeTroca(pedidoParaReceber.id, retornaAoEstoque === 'sim', cupom);
    handleFecharRecebimento();
  }

  const itensTrocaRecebimento = pedidoParaReceber
    ? itensDaTroca(pedidoParaReceber)
    : [];
  const valorTrocaRecebimento = pedidoParaReceber?.troca
    ? valorDosItens(pedidoParaReceber, pedidoParaReceber.troca.itens)
    : 0;

  return (
    <>
      {pedidoParaValidar && (
        <Modal
          centered
          size="lg"
          opened={Boolean(pedidoParaValidar)}
          onClose={() => setPedidoParaValidar(null)}
          title={
            <Text fw={600} size="lg">
              Validar forma de pagamento
            </Text>
          }
        >
          <ConferenciaPagamento
            pedido={pedidoParaValidar}
            cupons={cupons}
            onCancelar={() => setPedidoParaValidar(null)}
            onConfirmar={(validacao) => {
              resolverPagamento(pedidoParaValidar.id, validacao);
              setPedidoParaValidar(null);
            }}
          />
        </Modal>
      )}
      {pedidoDetalhe && (
        <Modal
          centered
          size="lg"
          opened={Boolean(pedidoDetalhe)}
          onClose={handleFecharDetalhe}
          title={
            <Text fw={600} size="lg">
              Pedido #{pedidoDetalhe.id}
            </Text>
          }
        >
          <Stack gap="sm">
            {pedidoDetalhe.itens.map((item) => (
              <div key={item.discoId} className={styles.itemDetalhe}>
                <Image
                  src={item.coverSrc}
                  alt={item.titulo}
                  w={48}
                  h={48}
                  radius="sm"
                  fit="cover"
                />
                <Stack gap={0} flex={1}>
                  <Text size="sm" fw={600}>
                    {item.titulo}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {item.artista}
                  </Text>
                </Stack>
                <Text size="sm">Qtd: {item.quantidade}</Text>
                <Text size="sm" fw={600}>
                  {formatarBRL(item.precoUnitario * item.quantidade)}
                </Text>
              </div>
            ))}
          </Stack>

          <Divider my="sm" />

          <Text size="sm">
            Entrega em {resumirEndereco(pedidoDetalhe.enderecoEntrega)}
          </Text>

          <Divider my="sm" />

          <Stack gap={4}>
            <div className={styles.linhaValor}>
              <Text size="sm">Subtotal</Text>
              <Text size="sm">{formatarBRL(pedidoDetalhe.subtotal)}</Text>
            </div>
            <div className={styles.linhaValor}>
              <Text size="sm">Frete</Text>
              <Text size="sm">{formatarBRL(pedidoDetalhe.frete)}</Text>
            </div>
            {pedidoDetalhe.cupons.map((cupom) => (
              <div key={cupom.cupomId} className={styles.linhaValor}>
                <Text size="sm">Cupom {cupom.codigo}</Text>
                <Text size="sm" c="green">
                  - {formatarBRL(cupom.valor)}
                </Text>
              </div>
            ))}
            {pedidoDetalhe.cartoes.map((cartao) => (
              <div key={cartao.cartaoId} className={styles.linhaValor}>
                <Text size="sm">
                  {cartao.bandeira} •••• {cartao.ultimosDigitos}
                </Text>
                <Text size="sm">{formatarBRL(cartao.valor)}</Text>
              </div>
            ))}
            <div className={styles.linhaValor}>
              <Text fw={700}>Total</Text>
              <Text fw={700} size="lg">
                {formatarBRL(pedidoDetalhe.total)}
              </Text>
            </div>
          </Stack>

          {pedidoDetalhe.troca && (
            <>
              <Divider my="sm" />
              <Stack gap={4}>
                <Text fw={600} size="sm">
                  Troca solicitada
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(pedidoDetalhe.troca.solicitadaEm).toLocaleDateString(
                    'pt-BR',
                  )}{' '}
                  — {pedidoDetalhe.troca.motivo}
                </Text>
                {itensDaTroca(pedidoDetalhe).map((item) => (
                  <div key={item.discoId} className={styles.itemDetalhe}>
                    <Image
                      src={item.coverSrc}
                      alt={item.titulo}
                      w={40}
                      h={40}
                      radius="sm"
                      fit="cover"
                    />
                    <Text size="sm" flex={1}>
                      {item.titulo}
                    </Text>
                    <Text size="sm">Qtd: {item.quantidade}</Text>
                  </div>
                ))}
              </Stack>
            </>
          )}
        </Modal>
      )}
      {pedidoParaReceber && (
        <Modal
          centered
          size="md"
          opened={Boolean(pedidoParaReceber)}
          onClose={handleFecharRecebimento}
          title={
            <Text fw={600} size="lg">
              Confirmar recebimento dos itens de troca
            </Text>
          }
        >
          <Stack gap="sm">
            {itensTrocaRecebimento.map((item) => (
              <div key={item.discoId} className={styles.itemDetalhe}>
                <Image
                  src={item.coverSrc}
                  alt={item.titulo}
                  w={44}
                  h={44}
                  radius="sm"
                  fit="cover"
                />
                <Text size="sm" flex={1}>
                  {item.titulo}
                </Text>
                <Text size="sm">Qtd: {item.quantidade}</Text>
              </div>
            ))}

            <Divider />

            <div className={styles.linhaValor}>
              <Text size="sm" fw={600}>
                Valor a devolver em cupom
              </Text>
              <Text size="sm" fw={600}>
                {formatarBRL(valorTrocaRecebimento)}
              </Text>
            </div>

            <Radio.Group
              label="Os itens retornam ao estoque?"
              withAsterisk
              value={retornaAoEstoque}
              onChange={(valor) =>
                setRetornaAoEstoque(valor as 'sim' | 'nao')
              }
            >
              <Group mt="xs">
                <Radio value="sim" label="Sim, em condição de revenda" />
                <Radio value="nao" label="Não, item avariado" />
              </Group>
            </Radio.Group>
          </Stack>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={handleFecharRecebimento}>
              Cancelar
            </Button>
            <Button
              color="orange"
              disabled={!retornaAoEstoque}
              onClick={handleConfirmarRecebimento}
            >
              Confirmar recebimento
            </Button>
          </Group>
        </Modal>
      )}
      <div className={styles.painelPedidos}>
        <nav className={styles.navBar}>
          <Button
            variant={somenteTrocas ? 'filled' : 'default'}
            color="dark"
            size="sm"
            onClick={() => setSomenteTrocas((atual) => !atual)}
          >
            Somente trocas
          </Button>
          <Select
            placeholder="Status"
            data={OPCOES_STATUS}
            value={statusFiltro}
            onChange={setStatusFiltro}
            allowDeselect={false}
            w={220}
          />
          <TextInput
            placeholder="Busque pelo número do pedido ou nome do cliente"
            radius="sm"
            rightSection={<IconSearch />}
            flex={0.3}
            value={busca}
            onChange={(event) => setBusca(event.currentTarget.value)}
          />
        </nav>
        <div className={styles.tabelaContainer}>
          <Table
            withTableBorder
            withColumnBorders
            highlightOnHover
            className={styles.tabela}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={130}>Pedido</Table.Th>
                <Table.Th w={200}>Cliente</Table.Th>
                <Table.Th w={110}>Data</Table.Th>
                <Table.Th w={70}>Itens</Table.Th>
                <Table.Th w={120}>Total</Table.Th>
                <Table.Th w={190}>Status</Table.Th>
                <Table.Th w={300}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pedidosFiltrados.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={7} ta="center" py="xl">
                    <Text fw={300} size="sm" c="dimmed">
                      Nenhum pedido encontrado
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {pedidosDaPagina.map((pedido) => {
                const proximos = proximosStatusAdmin(pedido.status);
                const quantidadeTotal = pedido.itens.reduce(
                  (soma, item) => soma + item.quantidade,
                  0,
                );
                const isTrocaPendente =
                  pedido.troca !== null && pedido.troca.cupomGeradoId === null;

                return (
                  <Table.Tr
                    key={pedido.id}
                    className={`${styles.linhaPedido} ${
                      isTrocaPendente ? styles.linhaTrocaPendente : ''
                    }`}
                    tabIndex={0}
                    aria-label={`Ver detalhes do pedido ${pedido.id}`}
                    onClick={() => handleAbrirDetalhe(pedido)}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter' || evento.key === ' ') {
                        evento.preventDefault();
                        handleAbrirDetalhe(pedido);
                      }
                    }}
                  >
                    <Table.Td>
                      <Text truncate="end" size="sm">
                        {pedido.id}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text truncate="end" size="sm">
                        {nomeDoCliente(pedido.clienteId)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {FORMATO_DATA.format(new Date(pedido.data))}
                    </Table.Td>
                    <Table.Td>{quantidadeTotal}</Table.Td>
                    <Table.Td>{formatarBRL(pedido.total)}</Table.Td>
                    <Table.Td>
                      <Badge color={CORES_STATUS[pedido.status]}>
                        {pedido.status}
                      </Badge>
                    </Table.Td>
                    {/* os botões de status não podem abrir o detalhe junto */}
                    <Table.Td onClick={(evento) => evento.stopPropagation()}>
                      <Flex gap="0.5em" align="center" wrap="nowrap">
                        {proximos.length === 0 ? (
                          <Text size="xs" c="dimmed">
                            —
                          </Text>
                        ) : (
                          proximos.map((proximo) => (
                            <Button
                              key={proximo}
                              size="xs"
                              variant="default"
                              onClick={() =>
                                handleAvancarStatus(pedido, proximo)
                              }
                            >
                              {proximo}
                            </Button>
                          ))
                        )}
                      </Flex>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {pedidosDaPagina.length > 0 &&
                Array.from(
                  { length: POR_PAGINA - pedidosDaPagina.length },
                  (_, indice) => (
                    <Table.Tr key={`vazia-${indice}`} className={styles.linhaVazia}>
                      <Table.Td colSpan={7} />
                    </Table.Tr>
                  ),
                )}
            </Table.Tbody>
          </Table>

          {totalPaginas > 1 && (
            <Pagination
              total={totalPaginas}
              value={paginaAtual}
              onChange={setPagina}
              color="dark"
              mt="md"
            />
          )}
        </div>
      </div>
    </>
  );
}

export default CuradoriaPedidos;
