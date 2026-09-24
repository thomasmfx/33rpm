import { Skeleton } from '@mantine/core';
import styles from './Esqueleto.module.scss';

// larguras fixas, não aleatórias: o esqueleto não pode mudar a cada render
const LARGURAS = ['72%', '88%', '56%', '64%', '80%', '48%'];

interface EsqueletoLinhasProps {
  /** Mesmo grid-template-columns da tabela que vai aparecer no lugar. */
  colunas: string;
  linhas?: number;
  altura?: number;
}

/**
 * Linhas de tabela em carregamento. Não levam data-testid de propósito: os
 * testes contam as linhas reais e não podem confundir o esqueleto com elas.
 */
export function EsqueletoLinhas({ colunas, linhas = 5, altura = 64 }: Readonly<EsqueletoLinhasProps>) {
  const quantidade = colunas.trim().split(/\s+(?![^(]*\))/).length;

  return (
    <div className={styles.linhas} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, linha) => (
        <div
          key={linha}
          className={styles.linha}
          style={{ gridTemplateColumns: colunas, minHeight: altura }}
        >
          {Array.from({ length: quantidade }, (_, coluna) => (
            <Skeleton
              key={coluna}
              height={12}
              width={LARGURAS[(linha + coluna) % LARGURAS.length]}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface EsqueletoPaginaProps {
  /** Blocos do corpo, em altura (px). */
  blocos?: number[];
  comAside?: boolean;
}

/** Página inteira em carregamento: título, meta e blocos no formato final. */
export function EsqueletoPagina({ blocos = [96, 96, 96], comAside = false }: Readonly<EsqueletoPaginaProps>) {
  return (
    <div className={styles.pagina} aria-busy="true" aria-label="Carregando">
      <div className={styles.cabecalho}>
        <Skeleton height={44} width="38%" />
        <Skeleton height={12} width={140} />
      </div>
      <div className={comAside ? styles.comAside : undefined}>
        <div className={styles.blocos}>
          {blocos.map((altura, indice) => (
            <Skeleton key={indice} height={altura} />
          ))}
        </div>
        {comAside && <Skeleton height={320} />}
      </div>
    </div>
  );
}
