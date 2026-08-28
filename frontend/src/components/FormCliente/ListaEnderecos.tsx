import styles from './FormCliente.module.scss';
import { useState } from 'react';
import { Alert, Badge, Button, Group, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import type { Endereco, TipoEndereco } from '../../types/cliente';
import {
  ROTULO_TIPO_ENDERECO,
  motivoBloqueioRemocao,
  resumirEndereco,
  tiposFaltando,
} from '../../utils/perfilCliente';
import FormEndereco, { type FormEnderecoValues } from './FormEndereco';

interface ListaEnderecosProps {
  enderecos: Endereco[];
  onChange: (enderecos: Endereco[]) => void;
  onFormAberto: (aberto: boolean) => void;
}

function mensagemTiposFaltando(faltando: TipoEndereco[]): string {
  if (faltando.includes('entrega') && faltando.includes('cobranca')) {
    return 'O cliente precisa de ao menos um endereço de entrega e um de cobrança (RN0021, RN0022). Um endereço marcado como "Entrega e cobrança" resolve os dois.';
  }
  if (faltando.includes('entrega')) {
    return 'O cliente precisa de ao menos um endereço de entrega (RN0022).';
  }
  return 'O cliente precisa de ao menos um endereço de cobrança (RN0021).';
}

export default function ListaEnderecos({
  enderecos,
  onChange,
  onFormAberto,
}: Readonly<ListaEnderecosProps>) {
  const [enderecoEmEdicao, setEnderecoEmEdicao] = useState<Endereco | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const faltando = tiposFaltando(enderecos);

  function abrirForm(endereco: Endereco | null): void {
    setEnderecoEmEdicao(endereco);
    setIsFormVisible(true);
    onFormAberto(true);
  }

  function handleFecharForm(): void {
    setIsFormVisible(false);
    setEnderecoEmEdicao(null);
    onFormAberto(false);
  }

  function handleSubmitEndereco(valores: FormEnderecoValues): void {
    onChange(
      enderecoEmEdicao
        ? enderecos.map((endereco) =>
            endereco.id === enderecoEmEdicao.id
              ? { ...endereco, ...valores }
              : endereco,
          )
        : [...enderecos, { ...valores, id: crypto.randomUUID().slice(0, 8) }],
    );
    handleFecharForm();
  }

  function handleRemover(enderecoId: string): void {
    onChange(enderecos.filter((endereco) => endereco.id !== enderecoId));
  }

  if (isFormVisible) {
    return (
      <FormEndereco
        initialValues={enderecoEmEdicao ?? undefined}
        onCancelar={handleFecharForm}
        onSubmit={handleSubmitEndereco}
      />
    );
  }

  return (
    <Stack gap="md">
      {faltando.length > 0 && (
        <Alert color="orange" title="Endereço obrigatório faltando">
          {mensagemTiposFaltando(faltando)}
        </Alert>
      )}

      <div className={styles.listaItens}>
        {enderecos.map((endereco) => {
          const motivoBloqueio = motivoBloqueioRemocao(enderecos, endereco.id);

          return (
            <Paper key={endereco.id} withBorder p="sm">
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={2}>
                  <Group gap="xs">
                    <Text fw={600}>{endereco.nome}</Text>
                    <Badge color="dark">
                      {ROTULO_TIPO_ENDERECO[endereco.tipo]}
                    </Badge>
                  </Group>
                  <Text size="sm">{resumirEndereco(endereco)}</Text>
                  <Text size="sm">CEP {endereco.cep}</Text>
                  {endereco.observacoes && (
                    <Text size="xs" c="dimmed">
                      {endereco.observacoes}
                    </Text>
                  )}
                </Stack>

                <Group gap="xs" wrap="nowrap">
                  <Button
                    variant="subtle"
                    color="gray"
                    px="xs"
                    aria-label={`Editar ${endereco.nome}`}
                    onClick={() => abrirForm(endereco)}
                  >
                    <IconPencil size={18} stroke={1.5} />
                  </Button>
                  <Tooltip label={motivoBloqueio} disabled={!motivoBloqueio}>
                    <span>
                      <Button
                        variant="subtle"
                        color="red"
                        px="xs"
                        disabled={Boolean(motivoBloqueio)}
                        aria-label={`Remover ${endereco.nome}`}
                        onClick={() => handleRemover(endereco.id)}
                      >
                        <IconTrash size={18} stroke={1.5} />
                      </Button>
                    </span>
                  </Tooltip>
                </Group>
              </Group>
            </Paper>
          );
        })}
      </div>

      <Button
        variant="default"
        leftSection={<IconPlus size={18} stroke={1.5} />}
        onClick={() => abrirForm(null)}
      >
        Adicionar endereço
      </Button>
    </Stack>
  );
}
