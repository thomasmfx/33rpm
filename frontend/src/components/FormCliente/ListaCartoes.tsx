import styles from './FormCliente.module.scss';
import { useState } from 'react';
import { Badge, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import type { Cartao } from '../../types/cliente';
import {
  adicionarCartao,
  atualizarCartao,
  definirPreferencial,
  mascararCartao,
  removerCartao,
} from '../../utils/perfilCliente';
import FormCartao, { type FormCartaoValues } from './FormCartao';

interface ListaCartoesProps {
  cartoes: Cartao[];
  onChange: (cartoes: Cartao[]) => void;
  onFormAberto: (aberto: boolean) => void;
}

export default function ListaCartoes({
  cartoes,
  onChange,
  onFormAberto,
}: Readonly<ListaCartoesProps>) {
  const [cartaoEmEdicao, setCartaoEmEdicao] = useState<Cartao | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  function abrirForm(cartao: Cartao | null): void {
    setCartaoEmEdicao(cartao);
    setIsFormVisible(true);
    onFormAberto(true);
  }

  function handleFecharForm(): void {
    setIsFormVisible(false);
    setCartaoEmEdicao(null);
    onFormAberto(false);
  }

  function handleSubmitCartao(valores: FormCartaoValues): void {
    onChange(
      cartaoEmEdicao
        ? atualizarCartao(cartoes, { ...cartaoEmEdicao, ...valores })
        : adicionarCartao(cartoes, {
            ...valores,
            id: crypto.randomUUID().slice(0, 8),
          }),
    );
    handleFecharForm();
  }

  if (isFormVisible) {
    return (
      <FormCartao
        initialValues={cartaoEmEdicao ?? undefined}
        onCancelar={handleFecharForm}
        onSubmit={handleSubmitCartao}
      />
    );
  }

  return (
    <Stack gap="md">
      <Text size="xs" c="dimmed">
        Cartão é opcional no cadastro. Havendo cartões, um deles é sempre o
        preferencial (RF0027).
      </Text>

      <div className={styles.listaItens}>
        {cartoes.map((cartao) => (
          <Paper key={cartao.id} withBorder p="sm">
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Stack gap={2}>
                <Group gap="xs">
                  <Text className={styles.numeroCartao}>
                    {mascararCartao(cartao.numero)}
                  </Text>
                  <Badge color="dark">{cartao.bandeira}</Badge>
                  {cartao.isPreferencial && (
                    <Badge color="orange">Preferencial</Badge>
                  )}
                </Group>
                <Text size="sm">{cartao.nomeImpresso}</Text>
                {!cartao.isPreferencial && (
                  <Button
                    type="button"
                    variant="subtle"
                    size="xs"
                    px={0}
                    onClick={() => onChange(definirPreferencial(cartoes, cartao.id))}
                  >
                    Tornar preferencial
                  </Button>
                )}
              </Stack>

              <Group gap="xs" wrap="nowrap">
                <Button
                  type="button"
                  variant="subtle"
                  color="gray"
                  px="xs"
                  aria-label={`Editar cartão ${mascararCartao(cartao.numero)}`}
                  onClick={() => abrirForm(cartao)}
                >
                  <IconPencil size={18} stroke={1.5} />
                </Button>
                <Button
                  type="button"
                  variant="subtle"
                  color="red"
                  px="xs"
                  aria-label={`Remover cartão ${mascararCartao(cartao.numero)}`}
                  onClick={() => onChange(removerCartao(cartoes, cartao.id))}
                >
                  <IconTrash size={18} stroke={1.5} />
                </Button>
              </Group>
            </Group>
          </Paper>
        ))}
      </div>

      <Button
        type="button"
        variant="default"
        leftSection={<IconPlus size={18} stroke={1.5} />}
        data-testid="btn-adicionar-cartao"
        onClick={() => abrirForm(null)}
      >
        Adicionar cartão
      </Button>
    </Stack>
  );
}
