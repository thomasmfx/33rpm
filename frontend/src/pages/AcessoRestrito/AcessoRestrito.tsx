import styles from './AcessoRestrito.module.scss';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@mantine/core';
import { ArrowLeft, Login } from '@carbon/icons-react';
import Forma from '../../components/Forma/Forma';

interface AcessoRestritoProps {
  /** Um cliente logado vê um motivo diferente de quem não entrou. */
  isCliente: boolean;
}

export default function AcessoRestrito({ isCliente }: Readonly<AcessoRestritoProps>) {
  const { pathname } = useLocation();

  return (
    <main className={styles.main} data-testid="acesso-restrito">
      <div className={styles.painel}>
        <Link to="/" className={styles.marca}>
          <img src="/brand/logo-33rpm-escuro.svg" alt="33rpm" />
        </Link>
        <div className={styles.forma}>
          <Forma tipo="explosao" paleta="laranja" giro={60} />
        </div>
        <span className={styles.rotulo}>Curadoria · área restrita</span>
      </div>

      <div className={styles.lado}>
        <div className={styles.conteudo}>
          <span className={styles.codigo}>403</span>
          <h1>Esta área é só para administradores</h1>
          <p>
            {isCliente
              ? 'Você está conectado como cliente. Entre com uma conta de administrador para acessar a curadoria.'
              : 'Você não está conectado. Entre com uma conta de administrador para gerenciar clientes, estoque e pedidos.'}
          </p>
          <div className={styles.acoes}>
            <Button
              component={Link}
              to="/login"
              state={{ depois: pathname }}
              leftSection={<Login size={20} />}
            >
              Entrar como administrador
            </Button>
            <Button component={Link} to="/" variant="outline" leftSection={<ArrowLeft size={20} />}>
              Voltar à loja
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
