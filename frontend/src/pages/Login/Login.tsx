import styles from './Login.module.scss';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, PasswordInput, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useLoja } from '../../contexts/loja';
import { ErroApi } from '../../services/api';
import { entrar } from '../../services/sessaoService';
import Forma from '../../components/Forma/Forma';

// massa de db/clientes.sql e db/administradores.sql, para a demonstração não
// depender de lembrar a senha
const CONTAS_DEMONSTRACAO = [
  { rotulo: 'Cliente', email: 'ana.ribeiro@email.com', senha: 'Senha@123' },
  { rotulo: 'Administrador', email: 'admin@33rpm.com.br', senha: 'Admin@123' },
];

interface EstadoNavegacao {
  depois?: string;
}

function fraseDoPainel(destino: string | undefined): string {
  if (destino === '/checkout') return 'Falta pouco para esses discos girarem aí.';
  if (destino?.startsWith('/curadoria')) return 'Clientes, estoque e pedidos da loja.';
  return 'Seus pedidos, cupons e trocas num lugar só.';
}

function Login() {
  const { iniciarSessao } = useLoja();
  const navegar = useNavigate();
  const { state } = useLocation();
  const destino = (state as EstadoNavegacao | null)?.depois;
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { email: '', senha: '' },
    validate: {
      email: (valor) => (/^\S+@\S+$/.test(valor) ? null : 'Informe um e-mail válido.'),
      senha: (valor) => (valor ? null : 'Informe a senha.'),
    },
  });

  async function handleEntrar(valores: { email: string; senha: string }) {
    setEnviando(true);
    try {
      const resposta = await entrar(valores.email, valores.senha);
      iniciarSessao(resposta);
      // o administrador entra pela curadoria; o cliente volta para onde estava
      const inicio = resposta.papel === 'administrador' ? '/curadoria' : '/';
      navegar(destino ?? inicio, { replace: true });
    } catch (erro) {
      setErros(erro instanceof ErroApi ? erro.mensagens : ['Falha ao entrar.']);
    } finally {
      setEnviando(false);
    }
  }

  function preencherDemonstracao(conta: (typeof CONTAS_DEMONSTRACAO)[number]): void {
    form.setFieldValue('email', conta.email);
    form.setFieldValue('senha', conta.senha);
  }

  return (
    <main className={styles.main}>
      <div className={styles.painel}>
        <span className={styles.rotulo}>33⅓ rotações por minuto</span>
        <div className={styles.formaArco}>
          <Forma tipo="arco" paleta="nevoa" />
        </div>
        <div className={styles.formaCruz}>
          <Forma tipo="cruz" paleta="laranja" />
        </div>
        <p className={styles.frase}>{fraseDoPainel(destino)}</p>
      </div>

      <div className={styles.lado}>
        <div className={styles.conteudo}>
          {destino === '/checkout' && (
            <Alert color="orange">
              Seus discos continuam reservados. Entre para finalizar a compra.
            </Alert>
          )}

          <div className={styles.titulo}>
            <h1>Entrar</h1>
            <p>Use o e-mail e a senha do seu cadastro.</p>
          </div>

          {erros.length > 0 && (
            <Alert color="red" data-testid="alerta-login">
              {erros.map((mensagem) => (
                <div key={mensagem}>{mensagem}</div>
              ))}
            </Alert>
          )}

          <form className={styles.form} onSubmit={form.onSubmit(handleEntrar)}>
            <TextInput
              label="E-mail"
              placeholder="voce@email.com"
              type="email"
              autoComplete="email"
              data-testid="login-email"
              key={form.key('email')}
              {...form.getInputProps('email')}
            />
            <PasswordInput
              label="Senha"
              autoComplete="current-password"
              data-testid="login-senha"
              visibilityToggleIcon={({ reveal }) => (
                <span className={styles.mostrar}>{reveal ? 'Ocultar' : 'Mostrar'}</span>
              )}
              rightSectionWidth={80}
              classNames={{ visibilityToggle: styles.alternarSenha }}
              key={form.key('senha')}
              {...form.getInputProps('senha')}
            />
            <Button type="submit" fullWidth loading={enviando} data-testid="btn-entrar">
              Entrar
            </Button>
          </form>

          <div className={styles.divisor}>
            <span>Primeira vez aqui?</span>
          </div>

          <Button variant="outline" fullWidth component={Link} to="/cadastro" state={state}>
            Criar conta
          </Button>

          <div className={styles.demonstracoes}>
            <span>Contas de demonstração</span>
            {CONTAS_DEMONSTRACAO.map((conta) => (
              <button
                key={conta.email}
                type="button"
                className={styles.demonstracao}
                onClick={() => preencherDemonstracao(conta)}
              >
                {conta.rotulo} · {conta.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default Login;
