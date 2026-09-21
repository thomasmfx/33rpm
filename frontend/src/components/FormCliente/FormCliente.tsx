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
import { DateInput } from '@mantine/dates';
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
  onSubmit: (valores: FormClienteValues) => void | Promise<void>;
  /** RF0028: troca de senha sem passar pelo resto do cadastro. */
  onAlterarSenha?: (senha: string, confirmacao: string) => void | Promise<void>;
  /** RNF0034: endereços salvos sem passar pelo resto do cadastro. */
  onAlterarEnderecos?: (enderecos: Endereco[]) => void | Promise<void>;
}

export default function FormCliente({
  initialValues,
  isEdit,
  onClose,
  onSubmit,
  onAlterarSenha,
  onAlterarEnderecos,
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

  function handleAlterarSenha(): void {
    const { password, confirmPassword } = form.getValues();
    if (form.validateField('password').hasError) return;
    if (form.validateField('confirmPassword').hasError) return;
    void onAlterarSenha?.(password, confirmPassword);
  }

  function handleAlterarEnderecos(): void {
    if (faltandoEndereco.length > 0) return;
    void onAlterarEnderecos?.(enderecos);
  }

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
        <Button type="button" variant="subtle" color="gray" px="xs" onClick={onClose}>
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
          <Tabs.Tab value="dados" data-testid="aba-dados">
            Dados
          </Tabs.Tab>
          <Tabs.Tab
            value="enderecos"
            data-testid="aba-enderecos"
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
          <Tabs.Tab value="cartoes" data-testid="aba-cartoes">
            Cartões
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dados" pt="md">
          <Flex direction="column" gap="sm" >
        <TextInput
          label="Nome Completo"
          placeholder="Ex: João da Silva"
          withAsterisk
          data-testid="input-nome"
          key={form.key('nome')}
          {...form.getInputProps('nome')}
          radius="sm"
          fw={300}
        />

        <Flex gap="2em">
          <DateInput
            label="Data de Nascimento"
            placeholder="Selecione uma data"
            valueFormat="DD/MM/YYYY"
            clearable
            data-testid="input-nascimento"
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
            data-testid="select-genero"
            radius="sm"
            key={form.key('genero')}
            {...form.getInputProps('genero')}
            flex="1"
          />

          <TextInput
            label="CPF"
            placeholder="000.000.000-00"
            disabled={isEdit}
            data-testid="input-cpf"
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
            data-testid="select-tipo-telefone"
            withAsterisk
            radius="sm"
            w={140}
            key={form.key('telefone.tipo')}
            {...form.getInputProps('telefone.tipo')}
          />

          <TextInput
            label="DDD"
            placeholder="11"
            data-testid="input-ddd"
            withAsterisk
            radius="sm"
            w={80}
            key={form.key('telefone.ddd')}
            {...form.getInputProps('telefone.ddd')}
          />

          <TextInput
            label="Número"
            placeholder="90000-0000"
            data-testid="input-telefone"
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
          data-testid="input-email"
          withAsterisk
          key={form.key('email')}
          {...form.getInputProps('email')}
          flex="1"
          radius="sm"
        />

        <PasswordInput
          label={isEdit ? 'Nova Senha (opcional)' : 'Senha'}
          placeholder="Sua senha segura"
          data-testid="input-senha"
          withAsterisk={!isEdit}
          description="Mínimo 8 caracteres, maiúsculas, minúsculas e especial."
          key={form.key('password')}
          {...form.getInputProps('password')}
          radius="sm"
        />

        <PasswordInput
          label="Confirmação de Senha"
          placeholder="Digite a senha novamente"
          data-testid="input-confirmar-senha"
          withAsterisk={!isEdit}
          key={form.key('confirmPassword')}
          {...form.getInputProps('confirmPassword')}
          radius="sm"
        />

        {isEdit && onAlterarSenha && (
          <Group justify="flex-start">
            <Button
              type="button"
              variant="light"
              color="dark"
              size="xs"
              data-testid="btn-alterar-somente-senha"
              onClick={handleAlterarSenha}
            >
              Salvar apenas a senha
            </Button>
          </Group>
        )}

        {isEdit && (
          <Switch
            label="Cliente Ativo no Sistema"
            data-testid="switch-ativo"
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
          {isEdit && onAlterarEnderecos && !isSubFormAberto && (
            <Group justify="flex-start" mt="md">
              <Button
                type="button"
                variant="light"
                color="dark"
                size="xs"
                disabled={faltandoEndereco.length > 0}
                data-testid="btn-alterar-somente-enderecos"
                onClick={handleAlterarEnderecos}
              >
                Salvar apenas os endereços
              </Button>
            </Group>
          )}
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
          <Button type="button" variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" color="dark" data-testid="btn-salvar-cliente">
            {isEdit ? 'Salvar' : 'Cadastrar'}
          </Button>
        </Group>
      )}
    </form>
  );
}
