import type { ReactNode } from 'react';
import { useLoja } from '../../contexts/loja';
import AcessoRestrito from '../../pages/AcessoRestrito/AcessoRestrito';
import { EsqueletoPagina } from '../Esqueleto/Esqueleto';
import styles from './RotaAdmin.module.scss';

/**
 * Guarda de rota da curadoria. É proteção de interface, não de segurança: a API
 * continua aberta, como definido nas delimitações do projeto (CLAUDE.md).
 */
export default function RotaAdmin({ children }: Readonly<{ children: ReactNode }>) {
  const { sessao, administradorAtivo, carregandoSessao } = useLoja();

  if (carregandoSessao) {
    return (
      <div className={styles.carregando}>
        <EsqueletoPagina blocos={[48, 64, 64, 64]} />
      </div>
    );
  }

  if (!administradorAtivo) return <AcessoRestrito isCliente={sessao?.papel === 'cliente'} />;

  return children;
}
