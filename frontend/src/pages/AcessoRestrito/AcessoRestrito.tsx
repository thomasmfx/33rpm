import styles from './AcessoRestrito.module.scss';
import { Link } from 'react-router-dom';
import { Button } from '@mantine/core';
import { ArrowLeft } from '@carbon/icons-react';
import Forma from '../../components/Forma/Forma';

/** Mesma tela para quem não entrou e para o cliente: não diz que a área existe nem por que nega. */
export default function AcessoRestrito() {
  return (
    <main className={styles.main} data-testid="acesso-restrito">
      <div className={styles.painel}>
        <Link to="/" className={styles.marca}>
          <img src="/brand/logo-33rpm-escuro.svg" alt="33rpm" />
        </Link>
        <div className={styles.forma}>
          <Forma tipo="explosao" paleta="laranja" giro={60} />
        </div>
      </div>

      <div className={styles.lado}>
        <div className={styles.conteudo}>
          <h1>Página indisponível</h1>
          <p>Esta página não está disponível.</p>
          <div className={styles.acoes}>
            <Button component={Link} to="/" variant="outline" leftSection={<ArrowLeft size={20} />}>
              Voltar à loja
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
