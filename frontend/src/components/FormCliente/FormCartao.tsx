import {
  Button,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { Cartao } from '../../types/cliente';
import { BANDEIRAS } from '../../types/cliente';
import { apenasDigitos } from '../../utils/texto';

export interface FormCartaoValues {
  numero: string;
  nomeImpresso: string;
  bandeira: string;
  codigoSeguranca: string;
  isPreferencial: boolean;
}

interface FormCartaoProps {
  initialValues?: Cartao;
  onCancelar: () => void;
  onSubmit: (valores: FormCartaoValues) => void;
}

export default function FormCartao({
  initialValues,
  onCancelar,
  onSubmit,
}: Readonly<FormCartaoProps>) {
  const form = useForm<FormCartaoValues>({
    mode: 'uncontrolled',
    initialValues: {
      numero: initialValues?.numero ?? '',
      nomeImpresso: initialValues?.nomeImpresso ?? '',
      bandeira: initialValues?.bandeira ?? '',
      codigoSeguranca: initialValues?.codigoSeguranca ?? '',
      isPreferencial: initialValues?.isPreferencial ?? false,
    },

    validate: {
      numero: (value) => {
        const digitos = apenasDigitos(value).length;
        return digitos >= 13 && digitos <= 19 ? null : 'Número de cartão inválido';
      },
      nomeImpresso: (value) =>
        value.trim() ? null : 'Informe o nome impresso no cartão',
      bandeira: (value) => (value ? null : 'Selecione a bandeira'),
      codigoSeguranca: (value) => {
        const digitos = apenasDigitos(value).length;
        return digitos === 3 || digitos === 4
          ? null
          : 'Código de segurança inválido';
      },
    },
  });

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Text fw={600} size="lg" mb="md">
        {initialValues ? 'Editar cartão' : 'Novo cartão'}
      </Text>

      <Stack gap="sm">
        <TextInput
          label="Número do cartão"
          placeholder="0000 0000 0000 0000"
          withAsterisk
          key={form.key('numero')}
          {...form.getInputProps('numero')}
        />

        <TextInput
          label="Nome impresso"
          placeholder="Ex: JOAO S SILVA"
          withAsterisk
          key={form.key('nomeImpresso')}
          {...form.getInputProps('nomeImpresso')}
        />

        <Group grow>
          <Select
            label="Bandeira"
            placeholder="Selecione"
            data={BANDEIRAS}
            withAsterisk
            allowDeselect={false}
            key={form.key('bandeira')}
            {...form.getInputProps('bandeira')}
          />

          <TextInput
            label="Código de segurança"
            placeholder="CVV"
            withAsterisk
            key={form.key('codigoSeguranca')}
            {...form.getInputProps('codigoSeguranca')}
          />
        </Group>

        <Switch
          label="Cartão preferencial"
          key={form.key('isPreferencial')}
          {...form.getInputProps('isPreferencial', { type: 'checkbox' })}
        />
      </Stack>

      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" color="dark">
          Salvar cartão
        </Button>
      </Group>
    </form>
  );
}
