import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '@mantine/core';
import type { FormClienteValues } from '../../components/FormCliente/FormCliente';
import FormCadastro from '../../components/FormCadastro/FormCadastro';
import { useLoja } from '../../contexts/loja';
import { ErroApi } from '../../services/api';
import { cadastrarCliente } from '../../services/clientesService';

function Cadastro() {
  const { iniciarSessao } = useLoja();
  const navegar = useNavigate();
  const { state } = useLocation();
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  // RF0021 pelo próprio cliente: quem decide as regras é o servidor
  async function handleCadastrar(valores: FormClienteValues): Promise<void> {
    setEnviando(true);
    setErros([]);
    try {
      const cliente = await cadastrarCliente(valores);
      iniciarSessao({ papel: 'cliente', cliente });
      navegar((state as { depois?: string } | null)?.depois ?? '/', { replace: true });
    } catch (erro) {
      setErros(erro instanceof ErroApi ? erro.mensagens : ['Falha ao cadastrar.']);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main>
      <FormCadastro
        enviando={enviando}
        onSubmit={handleCadastrar}
        alerta={
          erros.length > 0 && (
            <Alert color="red" title="Não deu para criar a conta" data-testid="alerta-cadastro">
              {erros.map((mensagem) => (
                <div key={mensagem}>{mensagem}</div>
              ))}
            </Alert>
          )
        }
      />
    </main>
  );
}

export default Cadastro;
