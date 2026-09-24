import styles from './LinhaDoTempo.module.scss';
import { PASSOS_PEDIDO } from '../../utils/pedido';
import { Checkmark } from '@carbon/icons-react';

interface LinhaDoTempoProps {
  /** Índice do passo atual em PASSOS_PEDIDO. */
  passo: number;
  /** Texto miúdo sob cada passo, como a previsão de cada etapa. */
  detalhes?: string[];
}

export default function LinhaDoTempo({ passo, detalhes }: Readonly<LinhaDoTempoProps>) {
  return (
    <ol className={styles.linha}>
      {PASSOS_PEDIDO.map((rotulo, indice) => (
        <li
          key={rotulo}
          className={styles.passo}
          data-feito={indice <= passo || undefined}
          aria-current={indice === passo ? 'step' : undefined}
        >
          <span className={styles.numero}>
            {String(indice + 1).padStart(2, '0')}
            {indice < passo && <Checkmark size={12} />}
          </span>
          <strong>{rotulo}</strong>
          {detalhes?.[indice] && <span className={styles.detalhe}>{detalhes[indice]}</span>}
        </li>
      ))}
    </ol>
  );
}
