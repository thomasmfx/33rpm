import styles from './Cadastro.module.scss';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Paper, Stack, Text, Title } from '@mantine/core';
import FormCliente, {
  type FormClienteValues,
} from '../../components/FormCliente/FormCliente';
import { useLoja } from '../../contexts/loja';
import { ErroApi } from '../../services/api';
import { cadastrarCliente } from '../../services/clientesService';

function Cadastro() {
  const { iniciarSessao } = useLoja();
  const navegar = useNavigate();
  const [erros, setErros] = useState<string[]>([]);

  // RF0021 pelo próprio cliente: mesmo formulário da curadoria, sem o controle de status
  async function handleCadastrar(valores: FormClienteValues): Promise<void> {
    try {
      const cliente = await cadastrarCliente(valores);
      iniciarSessao(cliente);
      navegar('/');
    } catch (erro) {
      setErros(erro instanceof ErroApi ? erro.mensagens : ['Falha ao cadastrar.']);
    }
  }

  return (
    <main className={styles.main}>
      <Paper className={styles.cartao} p="xl" radius="md" withBorder>
        <Title order={2} mb={4}>
          Criar conta
        </Title>
        <Text size="sm" c="dimmed" mb="lg">
          Cadastre-se para comprar, acompanhar pedidos e receber recomendações.
        </Text>

        {erros.length > 0 && (
          <Alert color="red" mb="md" data-testid="alerta-cadastro">
            <Stack gap={4}>
              {erros.map((mensagem) => (
                <Text key={mensagem} size="sm">
                  {mensagem}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        <FormCliente isEdit={false} onSubmit={handleCadastrar} />

        <Text size="sm" mt="lg">
          Já tem conta? <Link to="/login">Entrar</Link>
        </Text>
      </Paper>
    </main>
  );
}

export default Cadastro;
