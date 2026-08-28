import {
  Button,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { Endereco, TipoEndereco } from '../../types/cliente';
import { ESTADOS, TIPOS_LOGRADOURO, TIPOS_RESIDENCIA } from '../../types/cliente';
import { ROTULO_TIPO_ENDERECO } from '../../utils/perfilCliente';
import { apenasDigitos } from '../../utils/texto';

export interface FormEnderecoValues {
  nome: string;
  tipo: TipoEndereco;
  tipoResidencia: string;
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  pais: string;
  observacoes: string;
}

interface FormEnderecoProps {
  initialValues?: Endereco;
  onCancelar: () => void;
  onSubmit: (valores: FormEnderecoValues) => void;
}

const OPCOES_TIPO_ENDERECO = (
  Object.entries(ROTULO_TIPO_ENDERECO) as [TipoEndereco, string][]
).map(([value, label]) => ({ value, label }));

export default function FormEndereco({
  initialValues,
  onCancelar,
  onSubmit,
}: Readonly<FormEnderecoProps>) {
  const form = useForm<FormEnderecoValues>({
    mode: 'uncontrolled',
    initialValues: {
      nome: initialValues?.nome ?? '',
      tipo: initialValues?.tipo ?? 'ambos',
      tipoResidencia: initialValues?.tipoResidencia ?? '',
      tipoLogradouro: initialValues?.tipoLogradouro ?? '',
      logradouro: initialValues?.logradouro ?? '',
      numero: initialValues?.numero ?? '',
      bairro: initialValues?.bairro ?? '',
      cep: initialValues?.cep ?? '',
      cidade: initialValues?.cidade ?? '',
      estado: initialValues?.estado ?? '',
      pais: initialValues?.pais ?? 'Brasil',
      observacoes: initialValues?.observacoes ?? '',
    },

    validate: {
      nome: (value) => (value.trim() ? null : 'Informe um nome para o endereço'),
      tipoResidencia: (value) =>
        value ? null : 'Selecione o tipo de residência',
      tipoLogradouro: (value) =>
        value ? null : 'Selecione o tipo de logradouro',
      logradouro: (value) => (value.trim() ? null : 'Informe o logradouro'),
      numero: (value) => (value.trim() ? null : 'Informe o número'),
      bairro: (value) => (value.trim() ? null : 'Informe o bairro'),
      cep: (value) =>
        apenasDigitos(value).length === 8 ? null : 'CEP deve ter 8 dígitos',
      cidade: (value) => (value.trim() ? null : 'Informe a cidade'),
      estado: (value) => (value ? null : 'Selecione o estado'),
      pais: (value) => (value.trim() ? null : 'Informe o país'),
    },
  });

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Text fw={600} size="lg" mb="md">
        {initialValues ? 'Editar endereço' : 'Novo endereço'}
      </Text>

      <Stack gap="sm">
        <TextInput
          label="Nome do endereço"
          placeholder="Ex: Casa da praia"
          withAsterisk
          key={form.key('nome')}
          {...form.getInputProps('nome')}
        />

        <Select
          label="Tipo"
          data={OPCOES_TIPO_ENDERECO}
          withAsterisk
          allowDeselect={false}
          key={form.key('tipo')}
          {...form.getInputProps('tipo')}
        />

        <Group grow>
          <Select
            label="Tipo de residência"
            placeholder="Selecione"
            data={TIPOS_RESIDENCIA}
            withAsterisk
            allowDeselect={false}
            key={form.key('tipoResidencia')}
            {...form.getInputProps('tipoResidencia')}
          />
          <Select
            label="Tipo de logradouro"
            placeholder="Selecione"
            data={TIPOS_LOGRADOURO}
            withAsterisk
            allowDeselect={false}
            key={form.key('tipoLogradouro')}
            {...form.getInputProps('tipoLogradouro')}
          />
        </Group>

        <Group grow>
          <TextInput
            label="Logradouro"
            placeholder="Ex: das Flores"
            withAsterisk
            key={form.key('logradouro')}
            {...form.getInputProps('logradouro')}
          />
          <TextInput
            label="Número"
            placeholder="Ex: 123"
            withAsterisk
            key={form.key('numero')}
            {...form.getInputProps('numero')}
          />
        </Group>

        <Group grow>
          <TextInput
            label="Bairro"
            withAsterisk
            key={form.key('bairro')}
            {...form.getInputProps('bairro')}
          />
          <TextInput
            label="CEP"
            placeholder="00000-000"
            withAsterisk
            key={form.key('cep')}
            {...form.getInputProps('cep')}
          />
        </Group>

        <Group grow>
          <TextInput
            label="Cidade"
            withAsterisk
            key={form.key('cidade')}
            {...form.getInputProps('cidade')}
          />
          <Select
            label="Estado"
            placeholder="UF"
            data={ESTADOS}
            withAsterisk
            searchable
            allowDeselect={false}
            key={form.key('estado')}
            {...form.getInputProps('estado')}
          />
          <TextInput
            label="País"
            withAsterisk
            key={form.key('pais')}
            {...form.getInputProps('pais')}
          />
        </Group>

        <Textarea
          label="Observações"
          placeholder="Opcional"
          autosize
          minRows={2}
          key={form.key('observacoes')}
          {...form.getInputProps('observacoes')}
        />
      </Stack>

      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" color="dark">
          Salvar endereço
        </Button>
      </Group>
    </form>
  );
}
