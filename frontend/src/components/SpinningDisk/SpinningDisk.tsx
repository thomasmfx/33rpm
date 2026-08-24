import { useState, useEffect } from 'react';
import classes from './SpinningDisk.module.scss';
import vinilSvg from '../../../public/images/vinil.svg';

const capas = [
  '/images/capas/astroworld.jpg',
  '/images/capas/currents.jpg',
  '/images/capas/thriller.jpg',
  '/images/capas/tpab.jpg',
  '/images/capas/thedarksideofthemoon.jpg',
  '/images/capas/ridethelightning.jpg',
  '/images/capas/am.jpg',
  '/images/capas/mezmerize.jpg',
  '/images/capas/awakenmylove.jpg',
  '/images/capas/anti.jpg',
  '/images/capas/damn.jpg'
];

function embaralhar(itens: string[]): string[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function SpinningDisk() {
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
       <img src={ordem[indexCapa]} className={classes.capaTraseira} />
       <img src={vinilSvg} className={classes.discoFrente} />
    </div>
  </div>
);
}

export default SpinningDisk;