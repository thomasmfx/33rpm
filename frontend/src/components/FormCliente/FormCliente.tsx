import styles from './FormCliente.module.scss';
import { useState } from 'react';
import {
  Badge,
  Button,
  Flex,
  Select,
  Text,
  TextInput,
  PasswordInput,
  Switch,
  Group,
  Tabs,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconX } from '@tabler/icons-react';
import type { Cartao, Cliente, Endereco, Telefone } from '../../types/cliente';
import { GENEROS, TIPOS_TELEFONE } from '../../types/cliente';
import { apenasDigitos } from '../../utils/texto';
import { tiposFaltando } from '../../utils/perfilCliente';
import ListaEnderecos from './ListaEnderecos';
import ListaCartoes from './ListaCartoes';

export interface FormClienteValues {
  nome: string;
  email: string;
  genero: string;
  telefone: Telefone;
  cpf: string;
  dataNascimento: string | null;
  password: string;
  confirmPassword: string;
  isAtivo: boolean;
  enderecos: Endereco[];
  cartoes: Cartao[];
}

type CamposCliente = Omit<FormClienteValues, 'enderecos' | 'cartoes'>;

interface FormClienteProps {
  initialValues?: Cliente;
  isEdit: boolean;
  onClose?: () => void;
  onSubmit: (valores: FormClienteValues) => void;
}

export default function FormCliente({
  initialValues,
  isEdit,
  onClose,
  onSubmit,
}: Readonly<FormClienteProps>) {
  const [enderecos, setEnderecos] = useState<Endereco[]>(
    initialValues?.enderecos ?? [],
  );
  const [cartoes, setCartoes] = useState<Cartao[]>(initialValues?.cartoes ?? []);
  const [abaAtiva, setAbaAtiva] = useState<string | null>('dados');
  const [isSubFormAberto, setIsSubFormAberto] = useState(false);

  const faltandoEndereco = tiposFaltando(enderecos);

  const form = useForm<CamposCliente>({
    mode: 'uncontrolled',
    initialValues: {
      nome: initialValues?.nome || '',
      email: initialValues?.email || '',
      genero: initialValues?.genero || '',
      telefone: {
        tipo: initialValues?.telefone?.tipo || 'Celular',
        ddd: initialValues?.telefone?.ddd || '',
        numero: initialValues?.telefone?.numero || '',
      },
      cpf: initialValues?.cpf || '',
      dataNascimento: initialValues?.dataNascimento ?? null,
      password: '',
      confirmPassword: '',
      isAtivo: initialValues?.isAtivo ?? true,
    },

    validate: {
      nome: (value) =>
        value.length < 3 ? 'O nome deve ter pelo menos 3 letras' : null,
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'E-mail inválido'),
      genero: (value) => (!value ? 'Selecione um gênero' : null),
      telefone: {
        ddd: (value) => (apenasDigitos(value).length !== 2 ? 'DDD inválido' : null),
        numero: (value) => {
          const digitos = apenasDigitos(value).length;
          return digitos === 8 || digitos === 9 ? null : 'Número inválido';
        },
      },
      cpf: (value) =>
        apenasDigitos(value).length !== 11 ? 'CPF inválido' : null,

      password: (value) => {
        if (isEdit && !value) return null;

        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
        if (!regex.test(value)) {
          return 'A senha deve ter no mínimo 8 caracteres, letras maiúsculas, minúsculas e um caractere especial.';
        }
        return null;
      },

      confirmPassword: (value, values) => {
        if (isEdit && !values.password) return null;
        return value !== values.password ? 'As senhas não coincidem' : null;
      },
    },
  });

  // RN0021 e RN0022: sem endereço de entrega e de cobrança o cadastro não fecha
  function handleSubmit(valores: CamposCliente): void {
    if (faltandoEndereco.length > 0) {
      setAbaAtiva('enderecos');
      return;
    }
    onSubmit({ ...valores, enderecos, cartoes });
  }

  return (
    <form className={styles.form} onSubmit={form.onSubmit(handleSubmit)}>
      <Flex
        className={styles.formHeader}
        justify="space-between"
        align="center"
        mb="md"
      >
        <Text fw={600} size="lg">
          {isEdit
            ? `Editar Cliente #${initialValues?.id || ''}`
            : 'Novo Cliente'}
        </Text>
        <Button variant="subtle" color="gray" px="xs" onClick={onClose}>
          <IconX stroke={1.5} />
        </Button>
      </Flex>

      <Tabs
        value={abaAtiva}
        onChange={setAbaAtiva}
        color="dark"
        keepMounted={false}
      >
        <Tabs.List>
          <Tabs.Tab value="dados">Dados</Tabs.Tab>
          <Tabs.Tab
            value="enderecos"
            rightSection={
              faltandoEndereco.length > 0 ? (
                <Badge size="xs" circle color="orange">
                  !
                </Badge>
              ) : null
            }
          >
            Endereços
          </Tabs.Tab>
          <Tabs.Tab value="cartoes">Cartões</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dados" pt="md">
          <Flex direction="column" gap="sm" >
        <TextInput
          label="Nome Completo"
          placeholder="Ex: João da Silva"
          withAsterisk
          key={form.key('nome')}
          {...form.getInputProps('nome')}
          radius="sm"
          fw={300}
        />

        <Flex gap="2em">
          <DatePickerInput
            label="Data de Nascimento"
            placeholder="Selecione uma data"
            valueFormat="DD/MM/YYYY"
            clearable
            key={form.key('dataNascimento')}
            {...form.getInputProps('dataNascimento')}
            flex="1"
          />

          <Select
            label="Gênero"
            placeholder="Selecione um gênero"
            withAsterisk
            data={GENEROS}
            allowDeselect={false}
            radius="sm"
            key={form.key('genero')}
            {...form.getInputProps('genero')}
            flex="1"
          />

          <TextInput
            label="CPF"
            placeholder="000.000.000-00"
            disabled={isEdit}
            withAsterisk
            key={form.key('cpf')}
            {...form.getInputProps('cpf')}
            flex="1"
            radius="sm"
          />
        </Flex>

        <Flex gap="2em">
          <Select
            label="Tipo"
            data={TIPOS_TELEFONE}
            allowDeselect={false}
            withAsterisk
            radius="sm"
            w={140}
            key={form.key('telefone.tipo')}
            {...form.getInputProps('telefone.tipo')}
          />

          <TextInput
            label="DDD"
            placeholder="11"
            withAsterisk
            radius="sm"
            w={80}
            key={form.key('telefone.ddd')}
            {...form.getInputProps('telefone.ddd')}
          />

          <TextInput
            label="Número"
            placeholder="90000-0000"
            withAsterisk
            radius="sm"
            flex={1}
            key={form.key('telefone.numero')}
            {...form.getInputProps('telefone.numero')}
          />
        </Flex>

        <TextInput
          label="E-mail"
          placeholder="cliente@email.com"
          withAsterisk
          key={form.key('email')}
          {...form.getInputProps('email')}
          flex="1"
          radius="sm"
        />

        <PasswordInput
          label={isEdit ? 'Nova Senha (opcional)' : 'Senha'}
          placeholder="Sua senha segura"
          withAsterisk={!isEdit}
          description="Mínimo 8 caracteres, maiúsculas, minúsculas e especial."
          key={form.key('password')}
          {...form.getInputProps('password')}
          radius="sm"
        />

        <PasswordInput
          label="Confirmação de Senha"
          placeholder="Digite a senha novamente"
          withAsterisk={!isEdit}
          key={form.key('confirmPassword')}
          {...form.getInputProps('confirmPassword')}
          radius="sm"
        />

        {isEdit && (
          <Switch
            label="Cliente Ativo no Sistema"
            mt="md"
            color="green"
            withThumbIndicator={false}
            key={form.key('isAtivo')}
            {...form.getInputProps('isAtivo', { type: 'checkbox' })}
          />
        )}
          </Flex>
        </Tabs.Panel>

        <Tabs.Panel value="enderecos" pt="md">
          <ListaEnderecos
            enderecos={enderecos}
            onChange={setEnderecos}
            onFormAberto={setIsSubFormAberto}
          />
        </Tabs.Panel>

        <Tabs.Panel value="cartoes" pt="md">
          <ListaCartoes
            cartoes={cartoes}
            onChange={setCartoes}
            onFormAberto={setIsSubFormAberto}
          />
        </Tabs.Panel>
      </Tabs>

      {!isSubFormAberto && (
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" color="dark">
            {isEdit ? 'Salvar' : 'Cadastrar'}
          </Button>
        </Group>
      )}
    </form>
  );
}
