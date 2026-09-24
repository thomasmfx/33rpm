import styles from './Quantidade.module.scss';
import { Add, Subtract } from '@carbon/icons-react';

interface QuantidadeProps {
  valor: number;
  minimo?: number;
  /** RN0031: o teto é o estoque disponível. */
  maximo: number;
  tamanho?: 'md' | 'sm';
  rotulo?: string;
  disabled?: boolean;
  onChange: (valor: number) => void;
}

export default function Quantidade({
  valor,
  minimo = 1,
  maximo,
  tamanho = 'md',
  rotulo = 'Quantidade',
  disabled = false,
  onChange,
}: Readonly<QuantidadeProps>) {
  return (
    <div className={styles.quantidade} data-tamanho={tamanho} role="group" aria-label={rotulo}>
      <button
        type="button"
        aria-label="Diminuir"
        disabled={disabled || valor <= minimo}
        onClick={() => onChange(valor - 1)}
      >
        <Subtract size={16} />
      </button>
      <span className={styles.valor} aria-live="polite">
        {valor}
      </span>
      <button
        type="button"
        aria-label="Aumentar"
        disabled={disabled || valor >= maximo}
        onClick={() => onChange(valor + 1)}
      >
        <Add size={16} />
      </button>
    </div>
  );
}
