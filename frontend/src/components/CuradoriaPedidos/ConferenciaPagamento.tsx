import { Alert, Button, Group, List, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { Cupom } from '../../types/cupom';
import type { Pedido, ValidacaoPagamento } from '../../types/pedido';
import { validarFormaDePagamento } from '../../utils/pagamento';
import { formatarBRL } from '../../utils/precificacao';

interface ConferenciaPagamentoProps {
  pedido: Pedido;
  cupons: Cupom[];
  onCancelar: () => void;
  onConfirmar: (validacao: ValidacaoPagamento) => void;
}

export default function ConferenciaPagamento({
  pedido,
  cupons,
  onCancelar,
  onConfirmar,
}: Readonly<ConferenciaPagamentoProps>) {
  // roda no clique, não no render: new Date() no corpo do componente é impuro
  function handleConfirmar(): void {
    onConfirmar(validarFormaDePagamento(pedido, cupons, new Date()));
  }

  const previa = validarFormaDePagamento(pedido, cupons, new Date(pedido.data));

  return (
    <Stack gap="md">
      <Text size="sm" fw={300}>
        A RN0037 exige conferir a validade dos cupons e o aceite da operadora
        antes de dar a compra por paga. Sem integração real, a resposta da
        operadora é simulada.
      </Text>

      <List spacing="xs" size="sm">
        {previa.verificacoes.map((verificacao) => (
          <List.Item
            key={verificacao.rotulo}
            icon={
              <ThemeIcon color={verificacao.ok ? 'green' : 'red'} size={20} radius="xl">
                {verificacao.ok ? <IconCheck size={12} /> : <IconX size={12} />}
              </ThemeIcon>
            }
          >
            <Text span fw={600} size="sm">{verificacao.rotulo}</Text>
            <Text size="xs" c="dimmed">{verificacao.detalhe}</Text>
          </List.Item>
        ))}
      </List>

      <Alert color={previa.aprovado ? 'green' : 'red'}>
        {previa.aprovado
          ? `Tudo conferido. A compra de ${formatarBRL(pedido.total)} passa a PAGAMENTO REALIZADO.`
          : 'Alguma verificação falhou. A compra passa a PAGAMENTO RECUSADO e os itens voltam ao estoque (RN0028).'}
      </Alert>

      <Group justify="flex-end">
        <Button variant="default" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button color={previa.aprovado ? 'dark' : 'red'} onClick={handleConfirmar}>
          {previa.aprovado ? 'Confirmar pagamento' : 'Registrar recusa'}
        </Button>
      </Group>
    </Stack>
  );
}
