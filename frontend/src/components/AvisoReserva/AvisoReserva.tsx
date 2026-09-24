import { useEffect, useState } from 'react';
import { useLoja } from '../../contexts/loja';
import {
  AVISO_ANTES_MINUTOS,
  formatarContagem,
  segundosRestantes,
} from '../../utils/carrinho';
import styles from './AvisoReserva.module.scss';

interface AvisoReservaProps {
  texto: string;
}

/**
 * RN0044: relógio da reserva do carrinho. O provider anda de 15 em 15 segundos
 * para derrubar o carrinho vencido; aqui o tique é de 1s só para o mostrador.
 */
export default function AvisoReserva({ texto }: Readonly<AvisoReservaProps>) {
  const { carrinhoAtualizadoEm } = useLoja();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  const segundos = segundosRestantes(carrinhoAtualizadoEm, agora);
  if (segundos === null) return null;

  // RN0044: aviso 5 minutos antes de a reserva cair
  const acabando = segundos <= AVISO_ANTES_MINUTOS * 60;

  return (
    <div className={styles.aviso} data-testid="aviso-reserva">
      <span className={styles.tempo} data-acabando={acabando || undefined}>
        {formatarContagem(segundos)}
      </span>
      <span>{acabando ? 'Sua reserva está perto de cair: finalize antes do fim do contador.' : texto}</span>
    </div>
  );
}
