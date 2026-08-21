import styles from './Curadoria.module.scss';
import {
  IconBuildingStore,
  IconChartBar,
  IconUsers,
  IconVinyl,
} from '@tabler/icons-react';
import { Button } from '@mantine/core';
import { useState } from 'react';
import CuradoriaClientes from '../../components/CuradoriaClientes/CuradoriaClientes';

function Curadoria() {
  const [painel, setPainel] = useState<string>('Clientes');

  function handleSetPainel(newValue: string) {
    setPainel(newValue);
  }

  return (
    <div className={styles.container}>
      <div className={styles.sideBar}>
        <nav className={styles.navBar}>
          <Button
            leftSection={<IconUsers stroke={1.9}/>}
            variant={painel === 'Clientes' ? 'light' : 'subtle'}
            justify="left"
            color="#fff"
            fw={700}
            radius={0}
            onClick={() => handleSetPainel('Clientes')}
          >
            Clientes
          </Button>
          <Button
            leftSection={<IconVinyl stroke={1.9}/>}
            variant={painel === 'Inventário' ? 'light' : 'subtle'}
            justify="left"
            color="#fff"
            fw={700}
            radius={0}
            onClick={() => handleSetPainel('Inventário')}
          >
            Inventário
          </Button>
          <Button
            leftSection={<IconBuildingStore stroke={1.9}/>}
            variant={painel === 'Pedidos' ? 'light' : 'subtle'}
            justify="left"
            color="#fff"
            fw={700}
            radius={0}
            onClick={() => handleSetPainel('Pedidos')}
          >
            Pedidos
          </Button>
          <Button
            leftSection={<IconChartBar stroke={1.9}/>}
            variant={painel === 'Dashboard' ? 'light' : 'subtle'}
            justify="left"
            color="#fff"
            fw={700}
            radius={0}
            onClick={() => handleSetPainel('Dashboard')}
          >
            Dashboard
          </Button>
        </nav>
      </div>
      <main className={styles.main}>
        {painel === 'Clientes' && (
          <CuradoriaClientes />
        )}
      </main>
    </div>
  );
}

export default Curadoria;
