import { useState, useEffect } from 'react';
import classes from './SpinningDisk.module.scss';
import vinilSvg from '../../../public/images/vinil.svg';

const capas = [
  '/images/capas/astroworld.jpg',
  '/images/capas/currents.jpg',
  '/images/capas/thriller.jpg',
  '/images/capas/tpab.jpg',
  '/images/capas/thedarksideofthemoon.jpg',
  '/images/capas/tpab.jpg',
  '/images/capas/ridethelightning.jpg',
  '/images/capas/am.jpg',
  '/images/capas/mezmerize.jpg',
  '/images/capas/awakenmylove.jpg',
  '/images/capas/damn.jpg',
];

function SpinningDisk() {
  const [indexCapa, setIndexCapa] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndexCapa((prev) => (prev + 1) % capas.length);
    }, 10000);
    return () => clearInterval(intervalo);
  }, []);

return (
  <div className={classes.meioDiscoContainer}>
    <div className={classes.wrapperAnimacao}>
       <img src={capas[indexCapa]} className={classes.capaTraseira} />
       <img src={vinilSvg} className={classes.discoFrente} />
    </div>
  </div>
);
}

export default SpinningDisk;