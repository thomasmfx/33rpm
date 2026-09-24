import styles from './Vinil.module.scss';

interface VinilProps {
  girando?: boolean;
  /** 1,8s é a rotação real a 33⅓ rpm; em destaque grande isso cansa a vista. */
  segundosPorVolta?: number;
  className?: string;
}

/** O disco com o selo central no laranja de destaque, como na bolha do assistente. */
export default function Vinil({
  girando = false,
  segundosPorVolta = 1.8,
  className,
}: Readonly<VinilProps>) {
  return (
    <span
      className={[styles.vinil, className].filter(Boolean).join(' ')}
      data-girando={girando || undefined}
      style={girando ? { animationDuration: `${segundosPorVolta}s` } : undefined}
      aria-hidden
    >
      <span className={styles.selo} />
      <img src="/images/vinil.svg" alt="" className={styles.disco} />
    </span>
  );
}
