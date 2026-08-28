import styles from './Pedidos.module.scss';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Image,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { useLoja } from '../../contexts/loja';
import { IconPackageOff } from '@tabler/icons-react';
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio';
import type { Pedido } from '../../types/pedido';
import {
  CORES_STATUS,
  itensDaTroca,
  podeCancelar,
  podeConfirmarRecebimento,
  podeInformarDespacho,
  podeSolicitarTroca,
  valorDosItens,
} from '../../utils/pedido';
import { formatarBRL } from '../../utils/precificacao';
import { resumirEndereco } from '../../utils/perfilCliente';

const MOTIVO_MIN_CARACTERES = 10;

interface ItemSelecionadoTroca {
  discoId: number;
  quantidade: number;
}

export default function Pedidos() {
  const { clienteAtivo, pedidos, cupons, cancelarPedido, atualizarPedido } = useLoja();
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState<Pedido | null>(null);
  const [pedidoParaTroca, setPedidoParaTroca] = useState<Pedido | null>(null);
  const [itensTroca, setItensTroca] = useState<ItemSelecionadoTroca[]>([]);
  const [motivoTroca, setMotivoTroca] = useState<string>('');

  if (!clienteAtivo) {
    return (
      <main className={styles.main}>
<EstadoVazio
          icone={<IconPackageOff size={104} stroke={1.1} />}
          titulo="Nenhum perfil selecionado"
          descricao="Escolha um cliente no menu do topo para ver os pedidos dele. A sessão aqui é simulada, não há login."
          rotuloAcao="Explorar o acervo"
          paraAcao="/acervo"
        />
      </main>
    );
  }

  const pedidosDoCliente = pedidos
    .filter((pedido) => pedido.clienteId === clienteAtivo.id)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  if (pedidosDoCliente.length === 0) {
    return (
      <main className={styles.main}>
<EstadoVazio
          icone={<IconPackageOff size={104} stroke={1.1} />}
          titulo="Nenhum pedido ainda"
          descricao="Quando você fechar uma compra, ela aparece aqui com o status e o histórico de entrega."
          rotuloAcao="Explorar o acervo"
          paraAcao="/acervo"
        />
      </main>
    );
  }

  function handleAbrirCancelamento(pedido: Pedido): void {
    setPedidoParaCancelar(pedido);
  }

  function handleFecharCancelamento(): void {
    setPedidoParaCancelar(null);
  }

  function handleConfirmarCancelamento(): void {
    if (!pedidoParaCancelar) return;
    cancelarPedido(pedidoParaCancelar.id);
    handleFecharCancelamento();
  }

  function handleConfirmarRecebimento(pedido: Pedido): void {
    atualizarPedido(pedido.id, { status: 'ENTREGUE' });
  }

  function handleInformarDespacho(pedido: Pedido): void {
    atualizarPedido(pedido.id, { status: 'ITEM ENVIADO' });
  }

  function handleAbrirTroca(pedido: Pedido): void {
    setPedidoParaTroca(pedido);
    setItensTroca([]);
    setMotivoTroca('');
  }

  function handleFecharTroca(): void {
    setPedidoParaTroca(null);
    setItensTroca([]);
    setMotivoTroca('');
  }

  function handleAlternarItemTroca(discoId: number, marcado: boolean): void {
    if (marcado) {
      setItensTroca((atuais) => [...atuais, { discoId, quantidade: 1 }]);
    } else {
      setItensTroca((atuais) => atuais.filter((item) => item.discoId !== discoId));
    }
  }

  function handleAlterarQuantidadeTroca(discoId: number, quantidade: number): void {
    setItensTroca((atuais) =>
      atuais.map((item) => (item.discoId === discoId ? { ...item, quantidade } : item)),
    );
  }

  function handleConfirmarTroca(): void {
    if (!pedidoParaTroca) return;
    if (itensTroca.length === 0 || motivoTroca.trim().length < MOTIVO_MIN_CARACTERES) return;

    atualizarPedido(pedidoParaTroca.id, {
      status: 'TROCA SOLICITADA',
      troca: {
        itens: itensTroca,
        motivo: motivoTroca,
        solicitadaEm: new Date().toISOString(),
        cupomGeradoId: null,
        retornouAoEstoque: false,
      },
    });

    handleFecharTroca();
  }

  const trocaHabilitada =
    itensTroca.length > 0 && motivoTroca.trim().length >= MOTIVO_MIN_CARACTERES;

  return (
    <main className={styles.main}>
      <Title order={1} size="40">Meus pedidos</Title>

      {pedidoParaCancelar && (
        <Modal
          centered
          size="md"
          opened={Boolean(pedidoParaCancelar)}
          onClose={handleFecharCancelamento}
          title={<Text fw={600} size="lg">Cancelar pedido</Text>}
        >
          <Text fw={300} size="sm">
            Os itens deste pedido voltam ao estoque. Confirmar o cancelamento do
            pedido #{pedidoParaCancelar.id}?
          </Text>
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={handleFecharCancelamento}>
              Voltar
            </Button>
            <Button color="red" onClick={handleConfirmarCancelamento}>
              Cancelar pedido
            </Button>
          </Group>
        </Modal>
      )}

      {pedidoParaTroca && (
        <Modal
          centered
          size="lg"
          opened={Boolean(pedidoParaTroca)}
          onClose={handleFecharTroca}
          title={<Text fw={600} size="lg">Solicitar troca</Text>}
        >
          <Stack gap="sm">
            {pedidoParaTroca.itens.map((item) => {
              const selecionado = itensTroca.find((atual) => atual.discoId === item.discoId);

              return (
                <Group key={item.discoId} wrap="nowrap" align="flex-start">
                  <Checkbox
                    checked={Boolean(selecionado)}
                    onChange={(event) =>
                      handleAlternarItemTroca(item.discoId, event.currentTarget.checked)
                    }
                  />
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Text size="sm" fw={600}>{item.titulo}</Text>
                    <Text size="sm" c="dimmed">{item.artista}</Text>
                  </Stack>
                  <NumberInput
                    disabled={!selecionado}
                    value={selecionado?.quantidade ?? 1}
                    onChange={(valor) =>
                      handleAlterarQuantidadeTroca(item.discoId, Number(valor) || 1)
                    }
                    min={1}
                    max={item.quantidade}
                    w={90}
                  />
                </Group>
              );
            })}

            <Textarea
              label="Motivo da troca"
              placeholder="Descreva o motivo (mínimo 10 caracteres)"
              minRows={3}
              value={motivoTroca}
              onChange={(event) => setMotivoTroca(event.currentTarget.value)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleFecharTroca}>
                Voltar
              </Button>
              <Button disabled={!trocaHabilitada} onClick={handleConfirmarTroca}>
                Confirmar troca
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}

      <Stack gap="lg">
        {pedidosDoCliente.map((pedido) => {
          const cupomTroca = pedido.cupomTrocaGeradoId
            ? cupons.find((cupom) => cupom.id === pedido.cupomTrocaGeradoId)
            : null;
          const cupomDaTroca = pedido.troca?.cupomGeradoId
            ? cupons.find((cupom) => cupom.id === pedido.troca?.cupomGeradoId)
            : null;

          return (
            <Paper key={pedido.id} withBorder p="md">
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <Stack gap={2}>
                  <Text fw={600}>Pedido #{pedido.id}</Text>
                  <Text size="sm" c="dimmed">
                    {new Date(pedido.data).toLocaleDateString('pt-BR')}
                  </Text>
                </Stack>
                <Badge color={CORES_STATUS[pedido.status]}>{pedido.status}</Badge>
              </Group>

              <Divider my="sm" />

              <Stack gap="sm">
                {pedido.itens.map((item) => (
                  <div key={item.discoId} className={styles.item}>
                    <div className={styles.capa}>
                      <Image src={item.coverSrc} alt={item.titulo} w={48} h={48} fit="cover" />
                    </div>
                    <Stack gap={0}>
                      <Text size="sm" fw={600}>{item.titulo}</Text>
                      <Text size="sm" c="dimmed">{item.artista}</Text>
                    </Stack>
                    <Text size="sm">Qtd: {item.quantidade}</Text>
                    <Text size="sm" fw={600} ta="right">
                      {formatarBRL(item.precoUnitario * item.quantidade)}
                    </Text>
                  </div>
                ))}
              </Stack>

              <Divider my="sm" />

              <Text size="sm">
                Entrega em {resumirEndereco(pedido.enderecoEntrega)}
              </Text>

              <Divider my="sm" />

              <Stack gap={4}>
                <div className={styles.linhaValor}>
                  <Text size="sm">Subtotal</Text>
                  <Text size="sm">{formatarBRL(pedido.subtotal)}</Text>
                </div>
                <div className={styles.linhaValor}>
                  <Text size="sm">Frete</Text>
                  <Text size="sm">{formatarBRL(pedido.frete)}</Text>
                </div>
                {pedido.cupons.map((cupom) => (
                  <div key={cupom.cupomId} className={styles.linhaValor}>
                    <Text size="sm">Cupom {cupom.codigo}</Text>
                    <Text size="sm" c="green">- {formatarBRL(cupom.valor)}</Text>
                  </div>
                ))}
                {pedido.cartoes.map((cartao) => (
                  <div key={cartao.cartaoId} className={styles.linhaValor}>
                    <Text size="sm">{cartao.bandeira} •••• {cartao.ultimosDigitos}</Text>
                    <Text size="sm">{formatarBRL(cartao.valor)}</Text>
                  </div>
                ))}
                <div className={styles.linhaValor}>
                  <Text fw={700}>Total</Text>
                  <Text fw={700} size="lg">{formatarBRL(pedido.total)}</Text>
                </div>
              </Stack>

              {cupomTroca && (
                <Alert color="green" title="Sobrou crédito" mt="sm">
                  A diferença dos cupons virou o cupom {cupomTroca.codigo}, no valor
                  de {formatarBRL(cupomTroca.valor)} (RN0036).
                </Alert>
              )}

              {pedido.status === 'PAGAMENTO RECUSADO' &&
                pedido.validacaoPagamento && (
                  <Alert color="red" title="Pagamento recusado">
                    <Stack gap={4}>
                      {pedido.validacaoPagamento.verificacoes
                        .filter((verificacao) => !verificacao.ok)
                        .map((verificacao) => (
                          <Text key={verificacao.rotulo} size="sm">
                            {verificacao.rotulo}: {verificacao.detalhe}
                          </Text>
                        ))}
                      <Text size="xs" c="dimmed">
                        Os itens voltaram ao estoque. Refaça a compra com outra
                        forma de pagamento.
                      </Text>
                    </Stack>
                  </Alert>
                )}
              {pedido.troca && (
                <Paper withBorder p="sm" mt="sm" bg="var(--mantine-color-gray-0)">
                  <Text size="sm" fw={600}>Troca solicitada</Text>
                  <Text size="sm" c="dimmed">
                    Em {new Date(pedido.troca.solicitadaEm).toLocaleDateString('pt-BR')}
                  </Text>
                  <Stack gap={4} mt="xs">
                    {itensDaTroca(pedido).map((item) => (
                      <div key={item.discoId} className={styles.linhaValor}>
                        <Text size="sm">{item.titulo} (Qtd: {item.quantidade})</Text>
                      </div>
                    ))}
                  </Stack>
                  <Text size="sm" mt="xs">Motivo: {pedido.troca.motivo}</Text>
                  <Text size="sm" fw={600} mt="xs">
                    Valor: {formatarBRL(valorDosItens(pedido, pedido.troca.itens))}
                  </Text>

                  {cupomDaTroca && (
                    <Alert color="green" title="Crédito disponível" mt="sm">
                      O crédito da troca já está disponível no cupom {cupomDaTroca.codigo},
                      no valor de {formatarBRL(cupomDaTroca.valor)} (RF0045).
                    </Alert>
                  )}
                </Paper>
              )}

              <Group justify="flex-end" mt="sm">
                {podeCancelar(pedido.status) && (
                  <Button
                    color="red"
                    variant="subtle"
                    onClick={() => handleAbrirCancelamento(pedido)}
                  >
                    Cancelar pedido
                  </Button>
                )}
                {podeConfirmarRecebimento(pedido.status) && (
                  <Button color="green" onClick={() => handleConfirmarRecebimento(pedido)}>
                    Confirmar recebimento
                  </Button>
                )}
                {podeSolicitarTroca(pedido.status) && (
                  <Button onClick={() => handleAbrirTroca(pedido)}>
                    Solicitar troca
                  </Button>
                )}
                {podeInformarDespacho(pedido.status) && (
                  <Button onClick={() => handleInformarDespacho(pedido)}>
                    Informar despacho do item
                  </Button>
                )}
              </Group>
            </Paper>
          );
        })}
      </Stack>
    </main>
  );
}
