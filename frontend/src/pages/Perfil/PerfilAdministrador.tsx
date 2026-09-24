import styles from './Perfil.module.scss';
import formulario from '../../components/FormCliente/Formulario.module.scss';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, PasswordInput, TextInput } from '@mantine/core';
import { Checkmark, Edit, Logout } from '@carbon/icons-react';
import { useLoja } from '../../contexts/loja';
import type { Administrador } from '../../types/sessao';
import { ErroApi } from '../../services/api';
import {
  alterarAdministrador,
  alterarSenhaAdministrador,
} from '../../services/administradoresService';
import ChecklistSenha from '../../components/FormCliente/ChecklistSenha';
import { senhaForte } from '../../utils/senha';

type Secao = 'dados' | 'senha';

interface Aviso {
  secao: Secao;
  tipo: 'sucesso' | 'erro';
  mensagens: string[];
}

/** Minha conta do administrador: só dados de acesso e senha, como no protótipo. */
export default function PerfilAdministrador({
  administrador,
}: Readonly<{ administrador: Administrador }>) {
  const { atualizarAdministrador, sairDaSessao } = useLoja();
  const navegar = useNavigate();
  const [secao, setSecao] = useState<Secao>('dados');
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [isEditando, setIsEditando] = useState(false);
  const [nome, setNome] = useState(administrador.nome);
  const [email, setEmail] = useState(administrador.email);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [tentouSenha, setTentouSenha] = useState(false);

  async function salvar(
    alvo: Secao,
    escrita: () => Promise<Administrador>,
    sucesso: string,
  ): Promise<boolean> {
    setSalvando(true);
    setAviso(null);
    try {
      atualizarAdministrador(await escrita());
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

  async function handleSalvarDados(): Promise<void> {
    const salvou = await salvar(
      'dados',
      () => alterarAdministrador(administrador.id, { nome, email }),
      'Dados atualizados.',
    );
    if (salvou) setIsEditando(false);
  }

  // RF0028 e RNF0031/32: o servidor decide; o checklist só antecipa
  async function handleAlterarSenha(): Promise<void> {
    setTentouSenha(true);
    if (!senhaForte(novaSenha) || novaSenha !== confirmacaoSenha) return;
    const salvou = await salvar(
      'senha',
      () => alterarSenhaAdministrador(administrador.id, novaSenha, confirmacaoSenha),
      'Senha alterada. Use a nova senha no próximo login.',
    );
    if (salvou) {
      setNovaSenha('');
      setConfirmacaoSenha('');
      setTentouSenha(false);
    }
  }

  function renderAviso(alvo: Secao) {
    if (aviso?.secao !== alvo) return null;
    return (
      <Alert
        color={aviso.tipo === 'sucesso' ? 'green' : 'red'}
        withCloseButton
        onClose={() => setAviso(null)}
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

  return (
    <main className={styles.main}>
      <div className={styles.cabecalho}>
        <div className={styles.identificacao}>
          <span className={styles.meta}>
            Minha conta · {administrador.codigo} · Administrador
          </span>
          <h1>{administrador.nome}</h1>
          <span className={styles.email}>{administrador.email}</span>
        </div>
        <button
          type="button"
          className={styles.sair}
          onClick={() => {
            sairDaSessao();
            navegar('/');
          }}
        >
          <Logout size={16} /> Sair da conta
        </button>
      </div>

      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Seções da conta">
          {(['dados', 'senha'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={styles.navItem}
              aria-current={secao === item ? 'page' : undefined}
              onClick={() => {
                setSecao(item);
                setAviso(null);
              }}
            >
              {item === 'dados' ? 'Dados de acesso' : 'Senha'}
            </button>
          ))}
        </nav>

        <section className={styles.conteudo}>
          {secao === 'dados' && (
            <>
              <h2>Dados de acesso</h2>
              {renderAviso('dados')}
              {isEditando ? (
                <div className={styles.secaoCorpo}>
                  <div className={formulario.campos}>
                    <TextInput
                      label="Nome"
                      value={nome}
                      onChange={(evento) => setNome(evento.currentTarget.value)}
                    />
                    <TextInput
                      label="E-mail"
                      type="email"
                      value={email}
                      onChange={(evento) => setEmail(evento.currentTarget.value)}
                    />
                  </div>
                  <div className={formulario.rodapeInline} style={{ justifyContent: 'flex-start' }}>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setNome(administrador.nome);
                        setEmail(administrador.email);
                        setIsEditando(false);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button size="sm" loading={salvando} onClick={() => void handleSalvarDados()}>
                      Salvar alterações
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.secaoCorpo}>
                  <dl className={styles.kv}>
                    {[
                      ['Código', administrador.codigo],
                      ['Nome', administrador.nome],
                      ['E-mail', administrador.email],
                      ['Papel', 'Administrador da curadoria'],
                    ].map(([chave, valor]) => (
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
                    >
                      Editar dados
                    </Button>
                  </div>
                </div>
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
