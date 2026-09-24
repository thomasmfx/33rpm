import type { ReactNode } from 'react';
import styles from './StatusPonto.module.scss';

interface StatusPontoProps {
  cor: string;
  children: ReactNode;
}

/** Status como ponto + texto, sem pílula: a tabela escaneia pela cor do ponto. */
export default function StatusPonto({ cor, children }: Readonly<StatusPontoProps>) {
  return (
    <span className={styles.status}>
      <span className={styles.ponto} style={{ background: cor }} aria-hidden />
      {children}
    </span>
  );
}
