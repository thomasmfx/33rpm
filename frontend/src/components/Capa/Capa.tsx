import { useState } from 'react';
import { Skeleton } from '@mantine/core';
import styles from './Capa.module.scss';

interface CapaProps {
  src: string;
  alt: string;
  /** Vinil atrás da capa, que desliza para fora no hover do card (var --deslize). */
  comVinil?: boolean;
  className?: string;
}

/**
 * Capa quadrada em canto vivo. As capas vêm do Discogs e demoram: até a imagem
 * chegar, fica o esqueleto no lugar dela.
 */
export default function Capa({ src, alt, comVinil = false, className }: Readonly<CapaProps>) {
  // guarda qual src terminou de carregar, para a troca de disco reabrir o esqueleto
  const [carregada, setCarregada] = useState<string | null>(null);
  const pronta = carregada === src;

  return (
    <div className={[styles.capa, className].filter(Boolean).join(' ')}>
      {comVinil && <img src="/images/vinil.svg" alt="" className={styles.vinil} />}
      <Skeleton visible={!pronta} radius={0} className={styles.moldura}>
        <img
          src={src}
          alt={alt}
          className={styles.imagem}
          onLoad={() => setCarregada(src)}
          onError={() => setCarregada(src)}
        />
      </Skeleton>
    </div>
  );
}
