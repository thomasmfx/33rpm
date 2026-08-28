import styles from './Curadoria.module.scss';
import {
  IconBuildingStore,
  IconChartBar,
  IconUsers,
  IconVinyl,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Button } from '@mantine/core';
import { Link, Outlet, useLocation } from 'react-router-dom';

const PAINEIS: { rota: string; rotulo: string; icone: ReactNode }[] = [
  { rota: 'clientes', rotulo: 'Clientes', icone: <IconUsers stroke={1.9} /> },
  { rota: 'inventario', rotulo: 'Inventário', icone: <IconVinyl stroke={1.9} /> },
  { rota: 'pedidos', rotulo: 'Pedidos', icone: <IconBuildingStore stroke={1.9} /> },
  { rota: 'dashboard', rotulo: 'Dashboard', icone: <IconChartBar stroke={1.9} /> },
];

function Curadoria() {
  const { pathname } = useLocation();

  return (
    <div className={styles.container}>
      <div className={styles.sideBar}>
        <nav className={styles.navBar}>
          {PAINEIS.map((painel) => (
            <Button
              key={painel.rota}
              component={Link}
              to={painel.rota}
              leftSection={painel.icone}
              variant={
                pathname.startsWith(`/curadoria/${painel.rota}`)
                  ? 'light'
                  : 'subtle'
              }
              justify="left"
              color="#fff"
              fw={700}
              radius={0}
            >
              {painel.rotulo}
            </Button>
          ))}
        </nav>
      </div>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export default Curadoria;
