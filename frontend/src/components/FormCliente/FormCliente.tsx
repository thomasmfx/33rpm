import styles from './Formulario.module.scss';
import { useState } from 'react';
import {
  Button,
  Checkbox,
  Select,
  TextInput,
  PasswordInput,
  Tabs,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import type { Cartao, Cliente, Endereco, Telefone } from '../../types/cliente';
import { GENEROS, TIPOS_TELEFONE } from '../../types/cliente';
import { mascararCpf, mascararNumeroTelefone } from '../../utils/texto';
import { comMascara } from '../../utils/formulario';
import { tiposFaltando } from '../../utils/perfilCliente';
import { senhaForte } from '../../utils/senha';
import { VALIDACOES_DADOS_CLIENTE } from '../../utils/validacaoCliente';
import ListaEnderecos from './ListaEnderecos';
import ListaCartoes from './ListaCartoes';
import ChecklistSenha from './ChecklistSenha';
import { Close } from '@carbon/icons-react';

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
  /** Botão salvar em espera enquanto a API responde. */
  enviando?: boolean;
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
  enviando = false,
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
  const [senhaDigitada, setSenhaDigitada] = useState('');

  const faltandoEndereco = tiposFaltando(enderecos);

  const form = useForm<CamposCliente>({
    mode: 'uncontrolled',
    validateInputOnBlur: true,
    initialValues: {
      nome: initialValues?.nome || '',
      email: initialValues?.email || '',
      genero: initialValues?.genero || '',
      telefone: {
        tipo: initialValues?.telefone?.tipo || 'Celular',
        ddd: initialValues?.telefone?.ddd || '',
        numero: mascararNumeroTelefone(initialValues?.telefone?.numero || ''),
      },
      cpf: mascararCpf(initialValues?.cpf || ''),
      dataNascimento: initialValues?.dataNascimento ?? null,
      password: '',
      confirmPassword: '',
      isAtivo: initialValues?.isAtivo ?? true,
    },

    validate: {
      ...VALIDACOES_DADOS_CLIENTE,

      password: (value) => {
        if (isEdit && !value) return null;
        return senhaForte(value)
          ? null
          : 'A senha deve ter no mínimo 8 caracteres, letras maiúsculas, minúsculas e um caractere especial.';
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

  const cpf = form.getInputProps('cpf');
  const numero = form.getInputProps('telefone.numero');
  const senha = form.getInputProps('password');

  return (
    <form className={styles.form} onSubmit={form.onSubmit(handleSubmit)}>
      <div className={styles.cabecalho}>
        <h2 className={styles.titulo}>
          {isEdit ? initialValues?.nome : 'Cadastrar cliente'}
        </h2>
        {onClose && (
          <Button
            type="button"
            variant="default"
            size="xs"
            leftSection={<Close size={16} />}
            onClick={onClose}
          >
            Fechar
          </Button>
        )}
      </div>

      <Tabs value={abaAtiva} onChange={setAbaAtiva} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="dados" data-testid="aba-dados">
            Dados
          </Tabs.Tab>
          <Tabs.Tab
            value="enderecos"
            data-testid="aba-enderecos"
            rightSection={
              faltandoEndereco.length > 0 ? (
                <span className={styles.tagSelo} aria-label="Endereço obrigatório faltando">
                  !
                </span>
              ) : null
            }
          >
            Endereços
          </Tabs.Tab>
          <Tabs.Tab value="cartoes" data-testid="aba-cartoes">
            Cartões
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dados" pt={24}>
          <div className={styles.campos}>
            <TextInput
              label="Nome completo"
              placeholder="Como está no documento"
              data-testid="input-nome"
              key={form.key('nome')}
              {...form.getInputProps('nome')}
            />

            <div className={styles.grade3}>
              <DateInput
                label="Data de nascimento"
                placeholder="dd/mm/aaaa"
                valueFormat="DD/MM/YYYY"
                clearable
                data-testid="input-nascimento"
                key={form.key('dataNascimento')}
                {...form.getInputProps('dataNascimento')}
              />
              <Select
                label="Gênero"
                placeholder="Selecione"
                data={GENEROS}
                allowDeselect={false}
                data-testid="select-genero"
                key={form.key('genero')}
                {...form.getInputProps('genero')}
              />
              <TextInput
                label="CPF"
                placeholder="000.000.000-00"
                inputMode="numeric"
                disabled={isEdit}
                description={isEdit ? 'O CPF não pode ser alterado.' : undefined}
                inputWrapperOrder={['label', 'input', 'description', 'error']}
                data-testid="input-cpf"
                key={form.key('cpf')}
                {...cpf}
                onChange={comMascara(mascararCpf, cpf.onChange)}
              />
            </div>

            <div className={styles.gradeTelefone}>
              <Select
                label="Tipo"
                data={TIPOS_TELEFONE}
                allowDeselect={false}
                data-testid="select-tipo-telefone"
                key={form.key('telefone.tipo')}
                {...form.getInputProps('telefone.tipo')}
              />
              <TextInput
                label="DDD"
                placeholder="11"
                inputMode="numeric"
                maxLength={2}
                data-testid="input-ddd"
                key={form.key('telefone.ddd')}
                {...form.getInputProps('telefone.ddd')}
              />
              <TextInput
                label="Número"
                placeholder="90000-0000"
                inputMode="numeric"
                data-testid="input-telefone"
                key={form.key('telefone.numero')}
                {...numero}
                onChange={comMascara(mascararNumeroTelefone, numero.onChange)}
              />
            </div>

            <TextInput
              label="E-mail"
              placeholder="cliente@email.com"
              data-testid="input-email"
              key={form.key('email')}
              {...form.getInputProps('email')}
            />

            <div className={styles.grade2}>
              <PasswordInput
                label={isEdit ? 'Nova senha (opcional)' : 'Senha'}
                data-testid="input-senha"
                key={form.key('password')}
                {...senha}
                onChange={(evento) => {
                  senha.onChange(evento);
                  setSenhaDigitada(evento.currentTarget.value);
                }}
              />
              <PasswordInput
                label="Confirmar senha"
                data-testid="input-confirmar-senha"
                key={form.key('confirmPassword')}
                {...form.getInputProps('confirmPassword')}
              />
            </div>

            {(!isEdit || senhaDigitada) && <ChecklistSenha senha={senhaDigitada} />}

            {isEdit && onAlterarSenha && (
              <div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  data-testid="btn-alterar-somente-senha"
                  onClick={handleAlterarSenha}
                >
                  Salvar apenas a senha
                </Button>
              </div>
            )}

            {isEdit && (
              <Checkbox
                label="Cadastro ativo no sistema"
                data-testid="switch-ativo"
                key={form.key('isAtivo')}
                {...form.getInputProps('isAtivo', { type: 'checkbox' })}
              />
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="enderecos" pt={24}>
          <ListaEnderecos
            enderecos={enderecos}
            onChange={setEnderecos}
            onFormAberto={setIsSubFormAberto}
          />
          {isEdit && onAlterarEnderecos && !isSubFormAberto && (
            <div className={styles.rodapeInline} style={{ justifyContent: 'flex-start', marginTop: 16 }}>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={faltandoEndereco.length > 0}
                data-testid="btn-alterar-somente-enderecos"
                onClick={handleAlterarEnderecos}
              >
                Salvar apenas os endereços
              </Button>
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="cartoes" pt={24}>
          <ListaCartoes
            cartoes={cartoes}
            onChange={setCartoes}
            onFormAberto={setIsSubFormAberto}
          />
        </Tabs.Panel>
      </Tabs>

      {!isSubFormAberto && (
        <div className={styles.rodape}>
          <Button type="button" variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={enviando} data-testid="btn-salvar-cliente">
            {isEdit ? 'Salvar alterações' : 'Cadastrar cliente'}
          </Button>
        </div>
      )}
    </form>
  );
}
