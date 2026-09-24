import styles from './Formulario.module.scss';
import { REGRAS_SENHA } from '../../utils/senha';
import { Checkmark } from '@carbon/icons-react';

interface ChecklistSenhaProps {
  senha: string;
  /** Depois de uma tentativa de avançar, o que falta fica em vermelho. */
  destacarPendentes?: boolean;
}

export default function ChecklistSenha({
  senha,
  destacarPendentes = false,
}: Readonly<ChecklistSenhaProps>) {
  return (
    <ul className={styles.regras} aria-label="Requisitos da senha">
      {REGRAS_SENHA.map((regra) => {
        const ok = regra.atende(senha);
        return (
          <li
            key={regra.rotulo}
            className={styles.regra}
            data-ok={ok || undefined}
            data-falhou={(!ok && destacarPendentes) || undefined}
          >
            <span className={styles.marcaRegra} aria-hidden>
              {ok && <Checkmark size={12} />}
            </span>
            {regra.rotulo}
          </li>
        );
      })}
    </ul>
  );
}
