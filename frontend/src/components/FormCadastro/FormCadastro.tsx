import styles from './FormCadastro.module.scss';
import formulario from '../FormCliente/Formulario.module.scss';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Checkbox, PasswordInput, SegmentedControl, Select, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { GENEROS, TIPOS_TELEFONE } from '../../types/cliente';
import type { Endereco } from '../../types/cliente';
import { apenasDigitos, mascararCpf, mascararData, mascararTelefone } from '../../utils/texto';
import { comMascara } from '../../utils/formulario';
import { senhaForte } from '../../utils/senha';
import type { FormClienteValues } from '../FormCliente/FormCliente';
import ChecklistSenha from '../FormCliente/ChecklistSenha';
import CamposEndereco from '../FormCliente/CamposEndereco';
import { useFormEndereco } from '../FormCliente/useFormEndereco';
import Forma from '../Forma/Forma';
import { Checkmark } from '@carbon/icons-react';

interface CamposCadastro {
  nome: string;
  email: string;
  senha: string;
  confirmacao: string;
  cpf: string;
  nascimento: string;
  genero: string;
  tipoTelefone: string;
  telefone: string;
}

const ETAPAS = [
  { titulo: 'Conta', descricao: 'E-mail e senha para entrar', cabecalho: 'Crie sua conta' },
  { titulo: 'Dados pessoais', descricao: 'CPF, nascimento e telefone', cabecalho: 'Sobre você' },
  { titulo: 'Endereço', descricao: 'Onde seus discos vão chegar', cabecalho: 'Onde entregar' },
];

const CAMPOS_DA_ETAPA: (keyof CamposCadastro)[][] = [
  ['nome', 'email', 'senha', 'confirmacao'],
  ['cpf', 'nascimento', 'genero', 'tipoTelefone', 'telefone'],
  [],
];

/** dd/mm/aaaa → aaaa-mm-dd, ou null se a data não existir no calendário. */
function paraIsoData(valor: string): string | null {
  const [dia, mes, ano] = valor.split('/').map(Number);
  if (!dia || !mes || !ano || String(ano).length !== 4) return null;
  const data = new Date(ano, mes - 1, dia);
  const valida =
    data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  if (!valida || data > new Date()) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

interface FormCadastroProps {
  enviando: boolean;
  /** Mensagens do servidor, mostradas na etapa em que o cliente está. */
  alerta?: ReactNode;
  onSubmit: (valores: FormClienteValues) => void;
}

/** RF0021 pelo próprio cliente, em três etapas curtas que cabem na tela. */
export default function FormCadastro({ enviando, alerta, onSubmit }: Readonly<FormCadastroProps>) {
  const [etapa, setEtapa] = useState(0);
  const [tentativas, setTentativas] = useState<boolean[]>([false, false, false]);
  const [senhaDigitada, setSenhaDigitada] = useState('');
  const [isMesmoEndereco, setIsMesmoEndereco] = useState(true);
  // controlado à parte: sem valor, o segmentado não pode aparecer com a 1ª opção marcada
  const [generoEscolhido, setGeneroEscolhido] = useState('');

  const form = useForm<CamposCadastro>({
    mode: 'uncontrolled',
    validateInputOnBlur: true,
    initialValues: {
      nome: '',
      email: '',
      senha: '',
      confirmacao: '',
      cpf: '',
      nascimento: '',
      genero: '',
      tipoTelefone: 'Celular',
      telefone: '',
    },
    validate: {
      nome: (valor) => (/\S+\s+\S+/.test(valor.trim()) ? null : 'Informe nome e sobrenome.'),
      email: (valor) =>
        /^\S+@\S+\.\S+$/.test(valor) ? null : 'Confira o e-mail: falta o @ ou o domínio.',
      senha: (valor) => (senhaForte(valor) ? null : 'A senha ainda não atende aos requisitos.'),
      confirmacao: (valor, valores) =>
        valor === valores.senha ? null : 'As senhas não coincidem.',
      cpf: (valor) => {
        const faltam = 11 - apenasDigitos(valor).length;
        if (faltam <= 0) return null;
        return `CPF incompleto: ${faltam === 1 ? 'falta 1 dígito' : `faltam ${faltam} dígitos`}.`;
      },
      nascimento: (valor) => (paraIsoData(valor) ? null : 'Use o formato dd/mm/aaaa.'),
      genero: (valor) => (valor ? null : 'Escolha uma opção.'),
      telefone: (valor) => {
        const digitos = apenasDigitos(valor).length;
        return digitos === 10 || digitos === 11 ? null : 'Inclua o DDD e o número.';
      },
    },
  });

  const enderecoEntrega = useFormEndereco({ nome: 'Casa', tipo: 'entrega' });
  const enderecoCobranca = useFormEndereco({ nome: 'Cobrança', tipo: 'cobranca' });

  function etapaValida(indice: number): boolean {
    if (indice < 2) {
      return CAMPOS_DA_ETAPA[indice]
        .map((campo) => form.validateField(campo).hasError)
        .every((erro) => !erro);
    }
    const entregaOk = !enderecoEntrega.validate().hasErrors;
    const cobrancaOk = isMesmoEndereco || !enderecoCobranca.validate().hasErrors;
    return entregaOk && cobrancaOk;
  }

  function avancar(): void {
    setTentativas((atuais) => atuais.map((tentou, indice) => tentou || indice === etapa));
    if (!etapaValida(etapa)) return;
    if (etapa < 2) {
      setEtapa(etapa + 1);
      return;
    }
    enviar();
  }

  function enviar(): void {
    const valores = form.getValues();
    const telefone = apenasDigitos(valores.telefone);
    const novoId = () => crypto.randomUUID().slice(0, 8);

    // RN0021 e RN0022: um endereço só já cobre os dois papéis quando marcado
    const entrega: Endereco = {
      id: novoId(),
      ...enderecoEntrega.getValues(),
      tipo: isMesmoEndereco ? 'ambos' : 'entrega',
    };
    const enderecos = isMesmoEndereco
      ? [entrega]
      : [entrega, { id: novoId(), ...enderecoCobranca.getValues(), tipo: 'cobranca' as const }];

    onSubmit({
      nome: valores.nome.trim(),
      email: valores.email.trim(),
      genero: valores.genero,
      telefone: { tipo: valores.tipoTelefone, ddd: telefone.slice(0, 2), numero: telefone.slice(2) },
      cpf: valores.cpf,
      dataNascimento: paraIsoData(valores.nascimento),
      password: valores.senha,
      confirmPassword: valores.confirmacao,
      isAtivo: true,
      enderecos,
      cartoes: [],
    });
  }

  const cpf = form.getInputProps('cpf');
  const nascimento = form.getInputProps('nascimento');
  const telefone = form.getInputProps('telefone');
  const senha = form.getInputProps('senha');

  return (
    <div className={styles.cadastro}>
      <aside className={styles.painel}>
        <span className={styles.rotulo}>Criar conta</span>
        <ol className={styles.passos}>
          {ETAPAS.map((passo, indice) => {
            const estado = indice < etapa ? 'feito' : indice === etapa ? 'atual' : 'futuro';
            return (
              <li key={passo.titulo} className={styles.passo} data-estado={estado}>
                <button
                  type="button"
                  disabled={indice >= etapa}
                  onClick={() => setEtapa(indice)}
                  aria-current={estado === 'atual' ? 'step' : undefined}
                >
                  <span className={styles.passoNumero}>
                    {estado === 'feito' ? <Checkmark size={16} /> : String(indice + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.passoTexto}>
                    <strong>{passo.titulo}</strong>
                    <span>{passo.descricao}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className={styles.forma}>
          <Forma tipo="trevo" paleta="laranja" giro={70} />
        </div>
      </aside>

      <div className={styles.lado}>
        <div className={styles.conteudo} data-testid="cadastro-etapa" data-etapa={etapa + 1}>
          <div className={styles.cabecalho}>
            <span className={styles.etapaDe}>Etapa {etapa + 1} de 3</span>
            <h1>{ETAPAS[etapa].cabecalho}</h1>
          </div>

          {alerta}

          {etapa === 0 && (
            <div className={formulario.campos}>
              <TextInput
                label="Nome completo"
                description="Como está no seu documento"
                autoComplete="name"
                data-testid="input-nome"
                key={form.key('nome')}
                {...form.getInputProps('nome')}
              />
              <TextInput
                label="E-mail"
                placeholder="voce@email.com"
                type="email"
                autoComplete="email"
                data-testid="input-email"
                key={form.key('email')}
                {...form.getInputProps('email')}
              />
              <div className={formulario.grade2}>
                <PasswordInput
                  label="Senha"
                  autoComplete="new-password"
                  data-testid="input-senha"
                  key={form.key('senha')}
                  {...senha}
                  onChange={(evento) => {
                    senha.onChange(evento);
                    setSenhaDigitada(evento.currentTarget.value);
                  }}
                />
                <PasswordInput
                  label="Confirmar senha"
                  autoComplete="new-password"
                  data-testid="input-confirmar-senha"
                  key={form.key('confirmacao')}
                  {...form.getInputProps('confirmacao')}
                />
              </div>
              <ChecklistSenha senha={senhaDigitada} destacarPendentes={tentativas[0]} />
            </div>
          )}

          {etapa === 1 && (
            <div className={formulario.campos}>
              <div className={formulario.grade2}>
                <TextInput
                  label="CPF"
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  data-testid="input-cpf"
                  key={form.key('cpf')}
                  {...cpf}
                  onChange={comMascara(mascararCpf, cpf.onChange)}
                />
                <TextInput
                  label="Data de nascimento"
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                  data-testid="input-nascimento"
                  key={form.key('nascimento')}
                  {...nascimento}
                  onChange={comMascara(mascararData, nascimento.onChange)}
                />
              </div>

              <div className={styles.grupo}>
                <span className={formulario.subtitulo} style={{ fontSize: 14 }}>
                  Gênero
                </span>
                <SegmentedControl
                  fullWidth
                  data={GENEROS}
                  data-testid="cadastro-genero"
                  value={generoEscolhido}
                  onChange={(valor) => {
                    setGeneroEscolhido(valor);
                    form.setFieldValue('genero', valor);
                  }}
                />
                {form.errors.genero && <span className={styles.erro}>{form.errors.genero}</span>}
              </div>

              <div className={styles.gradeTelefone}>
                <Select
                  label="Tipo"
                  data={TIPOS_TELEFONE}
                  allowDeselect={false}
                  data-testid="select-tipo-telefone"
                  key={form.key('tipoTelefone')}
                  {...form.getInputProps('tipoTelefone')}
                />
                <TextInput
                  label="Telefone"
                  placeholder="(11) 90000-0000"
                  inputMode="tel"
                  data-testid="input-telefone"
                  key={form.key('telefone')}
                  {...telefone}
                  onChange={comMascara(mascararTelefone, telefone.onChange)}
                />
              </div>

              <p className={formulario.ajuda}>
                O CPF é exigido para emitir a nota fiscal. Ele não aparece para outros clientes.
              </p>
            </div>
          )}

          {etapa === 2 && (
            <div className={formulario.campos}>
              <CamposEndereco form={enderecoEntrega} comTipo={false} />
              <Checkbox
                label="Usar também como endereço de cobrança"
                checked={isMesmoEndereco}
                data-testid="cadastro-mesmo-endereco"
                onChange={(evento) => setIsMesmoEndereco(evento.currentTarget.checked)}
              />
              {!isMesmoEndereco && (
                <div className={styles.cobranca}>
                  <h3 className={formulario.subtitulo}>Endereço de cobrança</h3>
                  <CamposEndereco form={enderecoCobranca} comTipo={false} />
                </div>
              )}
            </div>
          )}

          <div className={styles.rodape}>
            {etapa === 0 ? (
              <Link to="/login" className={styles.voltar}>
                Já tenho conta
              </Link>
            ) : (
              <button type="button" className={styles.voltar} onClick={() => setEtapa(etapa - 1)}>
                Voltar
              </button>
            )}
            <Button
              type="button"
              loading={enviando}
              data-testid={etapa < 2 ? 'btn-continuar' : 'btn-criar-conta'}
              onClick={avancar}
            >
              {etapa < 2 ? 'Continuar' : 'Criar conta'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
