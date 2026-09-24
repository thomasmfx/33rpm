import styles from './Perfil.module.scss';
import formulario from '../../components/FormCliente/Formulario.module.scss';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Button, PasswordInput, Radio, SegmentedControl, Select, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useLoja } from '../../contexts/loja';
import type { Cartao, Cliente, Endereco, TipoEndereco } from '../../types/cliente';
import { GENEROS, TIPOS_TELEFONE } from '../../types/cliente';
import { ErroApi } from '../../services/api';
import {
  alterarCartoes,
  alterarCliente,
  alterarEnderecos,
  alterarSenha,
} from '../../services/clientesService';
import type { FormClienteValues } from '../../components/FormCliente/FormCliente';
import FormEndereco, { type FormEnderecoValues } from '../../components/FormCliente/FormEndereco';
import FormCartao, { type FormCartaoValues } from '../../components/FormCliente/FormCartao';
import ChecklistSenha from '../../components/FormCliente/ChecklistSenha';
import { EsqueletoPagina } from '../../components/Esqueleto/Esqueleto';
import PerfilAdministrador from './PerfilAdministrador';
import {
  adicionarCartao,
  atendeTipo,
  definirPreferencial,
  linhaDoEndereco,
  mascararCartao,
  motivoBloqueioRemocao,
  removerCartao,
  telefoneCompleto,
  temEnderecoDe,
} from '../../utils/perfilCliente';
import { mascararCpf, mascararNumeroTelefone } from '../../utils/texto';
import { comMascara } from '../../utils/formulario';
import { formatarDataBR } from '../../utils/estoque';
import { senhaForte } from '../../utils/senha';
import { VALIDACOES_DADOS_CLIENTE } from '../../utils/validacaoCliente';
import { Add, Checkmark, Edit, Logout } from '@carbon/icons-react';

type Secao = 'dados' | 'enderecos' | 'cartoes' | 'senha';

interface Aviso {
  secao: Secao;
  tipo: 'sucesso' | 'erro';
  mensagens: string[];
}

/** O PUT completo substitui endereços e cartões: tudo segue junto com os dados. */
function valoresDoCliente(cliente: Cliente, mudancas: Partial<FormClienteValues> = {}): FormClienteValues {
  return {
    nome: cliente.nome,
    email: cliente.email,
    genero: cliente.genero,
    telefone: cliente.telefone,
    cpf: cliente.cpf,
    dataNascimento: cliente.dataNascimento,
    password: '',
    confirmPassword: '',
    isAtivo: cliente.isAtivo,
    enderecos: cliente.enderecos,
    cartoes: cliente.cartoes,
    ...mudancas,
  };
}

function tipoCom(endereco: Endereco, papel: 'entrega' | 'cobranca', ligado: boolean): TipoEndereco | null {
  const entrega = papel === 'entrega' ? ligado : atendeTipo(endereco, 'entrega');
  const cobranca = papel === 'cobranca' ? ligado : atendeTipo(endereco, 'cobranca');
  if (entrega && cobranca) return 'ambos';
  if (entrega) return 'entrega';
  if (cobranca) return 'cobranca';
  return null;
}

type CamposDados = Pick<
  FormClienteValues,
  'nome' | 'email' | 'genero' | 'cpf' | 'dataNascimento' | 'telefone'
>;

interface DadosPessoaisProps {
  cliente: Cliente;
  salvando: boolean;
  onSalvar: (valores: FormClienteValues) => Promise<boolean>;
}

function DadosPessoais({ cliente, salvando, onSalvar }: Readonly<DadosPessoaisProps>) {
  const [isEditando, setIsEditando] = useState(false);

  const form = useForm<CamposDados>({
    mode: 'uncontrolled',
    validateInputOnBlur: true,
    initialValues: {
      nome: cliente.nome,
      email: cliente.email,
      genero: cliente.genero,
      cpf: mascararCpf(cliente.cpf),
      dataNascimento: cliente.dataNascimento,
      telefone: {
        tipo: cliente.telefone.tipo,
        ddd: cliente.telefone.ddd,
        numero: mascararNumeroTelefone(cliente.telefone.numero),
      },
    },
    validate: VALIDACOES_DADOS_CLIENTE,
  });

  const [genero, setGenero] = useState(cliente.genero);
  const numero = form.getInputProps('telefone.numero');

  async function handleSalvar(valores: CamposDados): Promise<void> {
    const salvou = await onSalvar(valoresDoCliente(cliente, { ...valores, cpf: cliente.cpf }));
    if (salvou) setIsEditando(false);
  }

  if (!isEditando) {
    const linhas: [string, string][] = [
      ['Nome', cliente.nome],
      ['E-mail', cliente.email],
      ['Nascimento', cliente.dataNascimento ? formatarDataBR(cliente.dataNascimento) : '—'],
      ['Telefone', `${telefoneCompleto(cliente.telefone)} · ${cliente.telefone.tipo}`],
      ['CPF', mascararCpf(cliente.cpf)],
      ['Gênero', cliente.genero],
    ];

    return (
      <div className={styles.secaoCorpo}>
        <dl className={styles.kv}>
          {linhas.map(([chave, valor]) => (
            <div key={chave} className={styles.kvLinha}>
              <dt>{chave}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
        <div>
          <Button
            variant="outline"
            size="sm"
            leftSection={<Edit size={16} />}
            onClick={() => setIsEditando(true)}
            data-testid="btn-editar-dados"
          >
            Editar dados
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.secaoCorpo} onSubmit={form.onSubmit(handleSalvar)}>
      <div className={formulario.campos}>
        <TextInput label="Nome completo" key={form.key('nome')} {...form.getInputProps('nome')} />
        <div className={formulario.grade2}>
          <TextInput label="E-mail" type="email" key={form.key('email')} {...form.getInputProps('email')} />
          <DateInput
            label="Data de nascimento"
            placeholder="dd/mm/aaaa"
            valueFormat="DD/MM/YYYY"
            key={form.key('dataNascimento')}
            {...form.getInputProps('dataNascimento')}
          />
        </div>
        <div className={formulario.gradeTelefone}>
          <Select
            label="Tipo"
            data={TIPOS_TELEFONE}
            allowDeselect={false}
            key={form.key('telefone.tipo')}
            {...form.getInputProps('telefone.tipo')}
          />
          <TextInput label="DDD" maxLength={2} key={form.key('telefone.ddd')} {...form.getInputProps('telefone.ddd')} />
          <TextInput
            label="Telefone"
            key={form.key('telefone.numero')}
            {...numero}
            onChange={comMascara(mascararNumeroTelefone, numero.onChange)}
          />
        </div>
        <TextInput
          label="CPF"
          disabled
          description="Para alterar o CPF, fale com o atendimento."
          inputWrapperOrder={['label', 'input', 'description']}
          key={form.key('cpf')}
          {...form.getInputProps('cpf')}
        />
        <div className={styles.grupo}>
          <span className={styles.rotuloCampo}>Gênero</span>
          <SegmentedControl
            fullWidth
            data={GENEROS}
            value={genero}
            onChange={(valor) => {
              setGenero(valor);
              form.setFieldValue('genero', valor);
            }}
          />
        </div>
      </div>
      <div className={formulario.rodapeInline} style={{ justifyContent: 'flex-start' }}>
        <Button type="button" variant="default" size="sm" onClick={() => setIsEditando(false)}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={salvando}>
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}

function Perfil() {
  const { clienteAtivo, administradorAtivo, carregandoSessao, recarregarClientes, sairDaSessao } =
    useLoja();
  const [secao, setSecao] = useState<Secao>('dados');
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enderecoEmEdicao, setEnderecoEmEdicao] = useState<Endereco | 'novo' | null>(null);
  const [isFormCartaoAberto, setIsFormCartaoAberto] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [tentouSenha, setTentouSenha] = useState(false);

  if (carregandoSessao) {
    return (
      <main className={styles.main}>
        <EsqueletoPagina blocos={[52, 52, 52, 52]} />
      </main>
    );
  }

  if (administradorAtivo) return <PerfilAdministrador administrador={administradorAtivo} />;

  if (!clienteAtivo) {
    return <Navigate to="/login" state={{ depois: '/perfil' }} replace />;
  }

  const cliente = clienteAtivo;

  async function salvar(
    alvo: Secao,
    escrita: () => Promise<unknown>,
    sucesso: string,
  ): Promise<boolean> {
    setSalvando(true);
    setAviso(null);
    try {
      await escrita();
      await recarregarClientes();
      setAviso({ secao: alvo, tipo: 'sucesso', mensagens: [sucesso] });
      return true;
    } catch (erro) {
      setAviso({
        secao: alvo,
        tipo: 'erro',
        mensagens: erro instanceof ErroApi ? erro.mensagens : ['Não foi possível salvar agora.'],
      });
      return false;
    } finally {
      setSalvando(false);
    }
  }

  // RNF0034: endereços mudam sozinhos, sem reenviar o cadastro inteiro
  function salvarEnderecos(enderecos: Endereco[], sucesso: string): Promise<boolean> {
    return salvar('enderecos', () => alterarEnderecos(cliente.id, enderecos), sucesso);
  }

  /**
   * RF0036 pelo endpoint de cartões; o backend só reconhece a alteração parcial
   * com ao menos um cartão, então remover o último passa pelo PUT completo.
   */
  function salvarCartoes(cartoes: Cartao[], sucesso: string): Promise<boolean> {
    return salvar(
      'cartoes',
      () =>
        cartoes.length > 0
          ? alterarCartoes(cliente.id, cartoes)
          : alterarCliente(cliente.id, valoresDoCliente(cliente, { cartoes: [] })),
      sucesso,
    );
  }

  // RN0021 e RN0022: o cliente nunca fica sem entrega nem sem cobrança
  function alternarPapel(endereco: Endereco, papel: 'entrega' | 'cobranca'): void {
    const tipo = tipoCom(endereco, papel, !atendeTipo(endereco, papel));
    if (!tipo) {
      setAviso({
        secao: 'enderecos',
        tipo: 'erro',
        mensagens: ['Todo endereço serve para entrega, cobrança ou os dois. Remova-o em vez de desmarcar tudo.'],
      });
      return;
    }
    const proximos = cliente.enderecos.map((atual) =>
      atual.id === endereco.id ? { ...atual, tipo } : atual,
    );
    if (!temEnderecoDe(proximos, papel)) {
      const rotulo = papel === 'cobranca' ? 'cobrança' : 'entrega';
      setAviso({
        secao: 'enderecos',
        tipo: 'erro',
        mensagens: [`Este é seu único endereço de ${rotulo}. Marque outro antes de desmarcar este.`],
      });
      return;
    }
    void salvarEnderecos(proximos, 'Endereço atualizado.');
  }

  async function handleSubmitEndereco(valores: FormEnderecoValues): Promise<void> {
    const proximos =
      enderecoEmEdicao && enderecoEmEdicao !== 'novo'
        ? cliente.enderecos.map((atual) =>
            atual.id === enderecoEmEdicao.id ? { ...atual, ...valores } : atual,
          )
        : [...cliente.enderecos, { id: crypto.randomUUID().slice(0, 8), ...valores }];
    if (await salvarEnderecos(proximos, 'Endereço salvo.')) setEnderecoEmEdicao(null);
  }

  async function handleSubmitCartao(valores: FormCartaoValues): Promise<void> {
    const proximos = adicionarCartao(cliente.cartoes, {
      id: crypto.randomUUID().slice(0, 8),
      ...valores,
    });
    if (await salvarCartoes(proximos, 'Cartão adicionado.')) setIsFormCartaoAberto(false);
  }

  // RF0028: a senha muda sozinha, pelo endpoint próprio
  async function handleAlterarSenha(): Promise<void> {
    setTentouSenha(true);
    if (!senhaForte(novaSenha) || novaSenha !== confirmacaoSenha) return;
    const salvou = await salvar(
      'senha',
      () => alterarSenha(cliente.id, novaSenha, confirmacaoSenha),
      'Senha alterada. Use a nova senha no próximo login.',
    );
    if (salvou) {
      setNovaSenha('');
      setConfirmacaoSenha('');
      setTentouSenha(false);
    }
  }

  function renderAviso(alvo: Secao): ReactNode {
    if (aviso?.secao !== alvo) return null;
    return (
      <Alert
        color={aviso.tipo === 'sucesso' ? 'green' : 'red'}
        withCloseButton
        onClose={() => setAviso(null)}
        data-testid={`aviso-${alvo}`}
      >
        {aviso.mensagens.map((mensagem) => (
          <div key={mensagem} className={styles.avisoLinha}>
            {aviso.tipo === 'sucesso' && <Checkmark size={16} />}
            {mensagem}
          </div>
        ))}
      </Alert>
    );
  }

  const itensNav: { id: Secao; rotulo: string; contagem?: number }[] = [
    { id: 'dados', rotulo: 'Dados pessoais' },
    { id: 'enderecos', rotulo: 'Endereços', contagem: cliente.enderecos.length },
    { id: 'cartoes', rotulo: 'Cartões', contagem: cliente.cartoes.length },
    { id: 'senha', rotulo: 'Senha' },
  ];

  return (
    <main className={styles.main}>
      <div className={styles.cabecalho}>
        <div className={styles.identificacao}>
          <span className={styles.meta}>Minha conta · {cliente.codigo}</span>
          <h1>{cliente.nome}</h1>
          <span className={styles.email}>{cliente.email}</span>
        </div>
        <button type="button" className={styles.sair} onClick={sairDaSessao}>
          <Logout size={16} /> Sair da conta
        </button>
      </div>

      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Seções da conta">
          {itensNav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.navItem}
              aria-current={secao === item.id ? 'page' : undefined}
              onClick={() => {
                setSecao(item.id);
                setAviso(null);
              }}
            >
              {item.rotulo}
              {item.contagem !== undefined && <span>{item.contagem}</span>}
            </button>
          ))}
        </nav>

        <section className={styles.conteudo}>
          {secao === 'dados' && (
            <>
              <h2>Dados pessoais</h2>
              {renderAviso('dados')}
              <DadosPessoais
                key={`${cliente.id}-${cliente.nome}-${cliente.email}`}
                cliente={cliente}
                salvando={salvando}
                onSalvar={(valores) =>
                  salvar('dados', () => alterarCliente(cliente.id, valores), 'Dados atualizados.')
                }
              />
            </>
          )}

          {secao === 'enderecos' && (
            <>
              <h2>Endereços</h2>
              {renderAviso('enderecos')}
              {enderecoEmEdicao ? (
                <div className={styles.formInline}>
                  <FormEndereco
                    initialValues={enderecoEmEdicao === 'novo' ? undefined : enderecoEmEdicao}
                    onCancelar={() => setEnderecoEmEdicao(null)}
                    onSubmit={(valores) => void handleSubmitEndereco(valores)}
                  />
                </div>
              ) : (
                <>
                  <div className={styles.lista}>
                    {cliente.enderecos.map((endereco) => {
                      const bloqueio = motivoBloqueioRemocao(cliente.enderecos, endereco.id);
                      return (
                        <div key={endereco.id} className={styles.cartaoEndereco}>
                          <div className={styles.cartaoTopo}>
                            <strong>{endereco.nome}</strong>
                            <div className={styles.pilulas}>
                              {(['cobranca', 'entrega'] as const).map((papel) => (
                                <button
                                  key={papel}
                                  type="button"
                                  className={styles.pilula}
                                  aria-pressed={atendeTipo(endereco, papel)}
                                  disabled={salvando}
                                  onClick={() => alternarPapel(endereco, papel)}
                                >
                                  {atendeTipo(endereco, papel) && <Checkmark size={16} />}
                                  {papel === 'cobranca' ? 'Cobrança' : 'Entrega'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <span className={styles.leve}>{linhaDoEndereco(endereco)}</span>
                          <div className={styles.acoesItem}>
                            <button
                              type="button"
                              className={formulario.acaoTexto}
                              onClick={() => setEnderecoEmEdicao(endereco)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className={formulario.acaoPerigo}
                              disabled={salvando}
                              onClick={() => {
                                if (bloqueio) {
                                  setAviso({ secao: 'enderecos', tipo: 'erro', mensagens: [bloqueio] });
                                  return;
                                }
                                void salvarEnderecos(
                                  cliente.enderecos.filter((atual) => atual.id !== endereco.id),
                                  'Endereço removido.',
                                );
                              }}
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className={formulario.adicionar}
                    onClick={() => setEnderecoEmEdicao('novo')}
                  >
                    <Add size={20} /> Adicionar endereço
                  </button>
                </>
              )}
            </>
          )}

          {secao === 'cartoes' && (
            <>
              <h2>Cartões</h2>
              {renderAviso('cartoes')}
              {cliente.cartoes.length === 0 ? (
                <p className={styles.leve}>Nenhum cartão salvo.</p>
              ) : (
                <Radio.Group
                  value={cliente.cartoes.find((cartao) => cartao.isPreferencial)?.id ?? null}
                  onChange={(id) =>
                    void salvarCartoes(definirPreferencial(cliente.cartoes, id), 'Cartão preferencial atualizado.')
                  }
                  aria-label="Cartão preferencial"
                >
                  <div className={styles.lista}>
                    {cliente.cartoes.map((cartao) => (
                      <div key={cartao.id} className={styles.linhaCartao}>
                        <Radio.Card value={cartao.id} disabled={salvando}>
                          <Radio.Indicator />
                          <span className={styles.cartaoTexto}>
                            <strong>
                              {cartao.bandeira} {mascararCartao(cartao.numero)}
                            </strong>
                            <span>{cartao.nomeImpresso}</span>
                          </span>
                          {cartao.isPreferencial && (
                            <span className={styles.tagSelo}>Preferencial</span>
                          )}
                        </Radio.Card>
                        <button
                          type="button"
                          className={formulario.acaoPerigo}
                          disabled={salvando}
                          aria-label={`Remover cartão ${mascararCartao(cartao.numero)}`}
                          onClick={() =>
                            void salvarCartoes(removerCartao(cliente.cartoes, cartao.id), 'Cartão removido.')
                          }
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </Radio.Group>
              )}
              {isFormCartaoAberto ? (
                <div className={styles.formInline}>
                  <FormCartao
                    onCancelar={() => setIsFormCartaoAberto(false)}
                    onSubmit={(valores) => void handleSubmitCartao(valores)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className={formulario.adicionar}
                  onClick={() => setIsFormCartaoAberto(true)}
                >
                  <Add size={20} /> Adicionar cartão
                </button>
              )}
            </>
          )}

          {secao === 'senha' && (
            <>
              <h2>Senha</h2>
              {renderAviso('senha')}
              <div className={styles.senha}>
                <PasswordInput
                  label="Nova senha"
                  autoComplete="new-password"
                  value={novaSenha}
                  onChange={(evento) => setNovaSenha(evento.currentTarget.value)}
                />
                <PasswordInput
                  label="Confirmar nova senha"
                  autoComplete="new-password"
                  value={confirmacaoSenha}
                  error={
                    tentouSenha && confirmacaoSenha !== novaSenha ? 'As senhas não coincidem.' : undefined
                  }
                  onChange={(evento) => setConfirmacaoSenha(evento.currentTarget.value)}
                />
                <ChecklistSenha senha={novaSenha} destacarPendentes={tentouSenha} />
                <div>
                  <Button loading={salvando} onClick={() => void handleAlterarSenha()}>
                    Alterar senha
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default Perfil;
