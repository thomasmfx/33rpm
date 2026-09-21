import styles from './Login.module.scss';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useLoja } from '../../contexts/loja';
import { ErroApi } from '../../services/api';
import { autenticar } from '../../services/clientesService';

function Login() {
  const { iniciarSessao } = useLoja();
  const navegar = useNavigate();
  const [erros, setErros] = useState<string[]>([]);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { email: '', senha: '' },
    validate: {
      email: (valor) => (/^\S+@\S+$/.test(valor) ? null : 'E-mail inválido'),
      senha: (valor) => (valor ? null : 'Informe a senha'),
    },
  });

  async function handleEntrar(valores: { email: string; senha: string }) {
    try {
      const cliente = await autenticar(valores.email, valores.senha);
      iniciarSessao(cliente);
      navegar('/');
    } catch (erro) {
      setErros(erro instanceof ErroApi ? erro.mensagens : ['Falha ao entrar.']);
    }
  }

  return (
    <main className={styles.main}>
      <Paper className={styles.cartao} p="xl" radius="md" withBorder>
        <Title order={2} mb={4}>
          Entrar
        </Title>
        <Text size="sm" c="dimmed" mb="lg">
          Use o e-mail e a senha do seu cadastro.
        </Text>

        {erros.length > 0 && (
          <Alert color="red" mb="md" data-testid="alerta-login">
            <Stack gap={4}>
              {erros.map((mensagem) => (
                <Text key={mensagem} size="sm">
                  {mensagem}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleEntrar)}>
          <Stack gap="sm">
            <TextInput
              label="E-mail"
              placeholder="cliente@email.com"
              withAsterisk
              data-testid="login-email"
              key={form.key('email')}
              {...form.getInputProps('email')}
            />
            <PasswordInput
              label="Senha"
              placeholder="Sua senha"
              withAsterisk
              data-testid="login-senha"
              key={form.key('senha')}
              {...form.getInputProps('senha')}
            />
            <Button type="submit" color="dark" mt="sm" data-testid="btn-entrar">
              Entrar
            </Button>
          </Stack>
        </form>

        <Text size="sm" mt="lg">
          Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
        </Text>
      </Paper>
    </main>
  );
}

export default Login;
