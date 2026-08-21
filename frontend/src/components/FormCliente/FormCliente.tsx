import styles from './FormCliente.module.scss';
import {
  Button,
  Flex,
  Text,
  TextInput,
  PasswordInput,
  Switch,
  Group,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconX } from '@tabler/icons-react';
import type { Cliente } from '../../types/cliente';
import { apenasDigitos } from '../../utils/filtrarClientes';

export interface FormClienteValues {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  dataNascimento: string | null;
  password: string;
  confirmPassword: string;
  isAtivo: boolean;
}

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
  const form = useForm<FormClienteValues>({
    mode: 'uncontrolled',
    initialValues: {
      nome: initialValues?.nome || '',
      email: initialValues?.email || '',
      telefone: initialValues?.telefone || '',
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

  return (
    <form className={styles.form} onSubmit={form.onSubmit(onSubmit)}>
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
          <TextInput
            label="Telefone"
            placeholder="(11) 90000-0000"
            withAsterisk
            key={form.key('telefone')}
            {...form.getInputProps('telefone')}
            flex="1"
            radius="sm"
          />

          <TextInput
            label="E-mail"
            placeholder="cliente@email.com"
            withAsterisk
            key={form.key('email')}
            {...form.getInputProps('email')}
            flex="1"
            radius="sm"
          />
        </Flex>

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

      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" color="dark">
          {isEdit ? 'Salvar' : 'Cadastrar'}
        </Button>
      </Group>
    </form>
  );
}
