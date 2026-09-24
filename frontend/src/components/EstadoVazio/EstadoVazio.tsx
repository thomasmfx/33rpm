import styles from './EstadoVazio.module.scss';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@mantine/core';
import Forma from '../Forma/Forma';
import type { PaletaForma, TipoForma } from '../Forma/Forma';

interface EstadoVazioProps {
  titulo: string;
  descricao: ReactNode;
  rotuloAcao?: string;
  paraAcao?: string;
  forma?: TipoForma;
  paleta?: PaletaForma;
}

export default function EstadoVazio({
  titulo,
  descricao,
  rotuloAcao,
  paraAcao,
  forma = 'semis',
  paleta = 'carvao',
}: Readonly<EstadoVazioProps>) {
  return (
    <div className={styles.container}>
      <div className={styles.texto}>
        <h1>{titulo}</h1>
        <p>{descricao}</p>
        {rotuloAcao && paraAcao && (
          <Button component={Link} to={paraAcao}>
            {rotuloAcao}
          </Button>
        )}
      </div>
      <div className={styles.forma}>
        <Forma tipo={forma} paleta={paleta} />
      </div>
    </div>
  );
}
