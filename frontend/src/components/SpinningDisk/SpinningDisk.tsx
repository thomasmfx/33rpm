import { useState, useEffect } from 'react';
import classes from './SpinningDisk.module.scss';
import vinilSvg from '/images/vinil.svg';
import { discosMock } from '../../utils/discosMock';

const capas = discosMock.map((disco) => disco.coverSrc);

// Fisher-Yates: toda permutação com a mesma probabilidade
function embaralhar(itens: string[]): string[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function SpinningDisk() {
  // initializer lazy: embaralha uma vez por carregamento, não a cada render
  const [ordem] = useState(() => embaralhar(capas));
  const [indexCapa, setIndexCapa] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndexCapa((prev) => (prev + 1) % ordem.length);
    }, 10000);
    return () => clearInterval(intervalo);
  }, [ordem]);

  return (
    <div className={classes.meioDiscoContainer}>
      <div className={classes.wrapperAnimacao}>
        <img src={ordem[indexCapa]} alt="" className={classes.capaTraseira} />
        <img src={vinilSvg} alt="" className={classes.discoFrente} />
      </div>
    </div>
  );
}

export default SpinningDisk;
