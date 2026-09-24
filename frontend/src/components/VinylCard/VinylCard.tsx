import styles from './VinylCard.module.scss';
import { Link } from 'react-router-dom';
import type { Disco } from '../../types/disco';
import Capa from '../Capa/Capa';
import { nomeFormato } from '../../utils/catalogo';
import { formatarPrecoCurto } from '../../utils/precificacao';
import { estoqueAcabando } from '../../utils/estoque';

interface VinylCardProps {
  disco: Disco;
  /** Card grande da vitrine "Em alta", com o selo de destaque. */
  destaque?: boolean;
  /** No hover o disco desliza para fora da capa, ou a capa só cresce um pouco. */
  hover?: 'deslizar' | 'escala';
}

function VinylCard({ disco, destaque = false, hover = 'deslizar' }: Readonly<VinylCardProps>) {
  return (
    <Link
      to={`/disco/${disco.id}`}
      className={styles.card}
      data-destaque={destaque || undefined}
      data-hover={hover}
    >
      <div className={styles.capa}>
        <Capa src={disco.coverSrc} alt={disco.title} comVinil={hover === 'deslizar'} />
        {destaque && <span className={styles.selo}>Destaque da semana</span>}
        {!destaque && estoqueAcabando(disco.estoque) && (
          <span className={styles.selo}>Últimas {disco.estoque}</span>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.nomes}>
          <span className={styles.artista}>{disco.artist}</span>
          <strong className={styles.titulo}>{disco.title}</strong>
        </div>
        <div className={styles.linhaPreco}>
          <span className={styles.preco}>{formatarPrecoCurto(disco.price)}</span>
          <span className={styles.meta}>
            {nomeFormato(disco.formatoId)} · {disco.releaseYear}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default VinylCard;
