import type { ReactNode } from 'react';
import styles from './CabecalhoSecao.module.scss';

interface CabecalhoSecaoProps {
  numero: string;
  titulo: string;
  /** Link ou controles à direita do título. */
  acao?: ReactNode;
}

export default function CabecalhoSecao({ numero, titulo, acao }: Readonly<CabecalhoSecaoProps>) {
  return (
    <div className={styles.cabecalho}>
      <div className={styles.titulo}>
        <span className={styles.numero}>{numero}</span>
        <h2>{titulo}</h2>
      </div>
      {acao}
    </div>
  );
}
