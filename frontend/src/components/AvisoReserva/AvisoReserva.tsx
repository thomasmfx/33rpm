import { useEffect, useState } from 'react';
import { useLoja } from '../../contexts/loja';
import { formatarContagem, segundosRestantes } from '../../utils/carrinho';
import styles from './AvisoReserva.module.scss';

interface AvisoReservaProps {
  texto: string;
}

/**
 * RN0044: relógio da reserva do carrinho. Quem derruba o carrinho vencido é o servidor;
 * aqui o tique de 1s só anda o mostrador e avisa perto do fim.
 */
export default function AvisoReserva({ texto }: Readonly<AvisoReservaProps>) {
  const { carrinhoExpiraEm, avisoReservaMinutos } = useLoja();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  const segundos = segundosRestantes(carrinhoExpiraEm, agora);
  if (segundos === null) return null;

  // RN0044: o cliente é avisado minutos antes de a reserva cair
  const acabando = segundos <= avisoReservaMinutos * 60;

  return (
    <div className={styles.aviso} data-testid="aviso-reserva" data-acabando={acabando || undefined}>
      <span className={styles.tempo} data-acabando={acabando || undefined}>
        {formatarContagem(segundos)}
      </span>
      <span>{acabando ? 'Sua reserva está perto de cair: finalize antes do fim do contador.' : texto}</span>
    </div>
  );
}
