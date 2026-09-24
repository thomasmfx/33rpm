import type { ChangeEvent } from 'react';

type Alteracao = (evento: ChangeEvent<HTMLInputElement>) => void;

/**
 * Aplica a máscara direto no DOM antes de repassar o evento. Os formulários
 * usam o useForm em modo uncontrolled: chamar setFieldValue a cada tecla
 * renumeraria a key do campo e o foco se perderia no meio da digitação.
 */
export function comMascara(mascara: (valor: string) => string, onChange?: Alteracao): Alteracao {
  return (evento) => {
    evento.currentTarget.value = mascara(evento.currentTarget.value);
    onChange?.(evento);
  };
}
