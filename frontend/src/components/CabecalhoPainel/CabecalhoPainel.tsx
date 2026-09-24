import type { ReactNode } from 'react';
import styles from './CabecalhoPainel.module.scss';

interface CabecalhoPainelProps {
  titulo: string;
  resumo?: ReactNode;
  acoes?: ReactNode;
}

/** Cabeçalho de cada painel da curadoria: título, resumo mono e ações à direita. */
export default function CabecalhoPainel({ titulo, resumo, acoes }: Readonly<CabecalhoPainelProps>) {
  return (
    <div className={styles.cabecalho}>
      <div className={styles.texto}>
        <h1>{titulo}</h1>
        {resumo && <span className={styles.resumo}>{resumo}</span>}
      </div>
      {acoes && <div className={styles.acoes}>{acoes}</div>}
    </div>
  );
}
