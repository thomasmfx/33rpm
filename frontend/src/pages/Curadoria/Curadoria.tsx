import styles from './Curadoria.module.scss';
import {
  IconBuildingStore,
  IconChartBar,
  IconUsers,
  IconVinyl,
} from '@tabler/icons-react';
import { Button, Stack } from '@mantine/core';
import { useState } from 'react';

function Curadoria() {
  const [panel, setPanel] = useState('clientes');

  return (
    <div className={styles.container}>
      <div className={styles.sideBar}>
        <nav className={styles.navBar}>
          <Button
            leftSection={<IconUsers stroke={1.9}/>}
            variant="subtle"
            justify="left"
            color="#fff"
            fw={700}
            radius={0}
          >
            Clientes
          </Button>
          <Button
            leftSection={<IconVinyl stroke={1.9}/>}
            variant="subtle"
            justify="left"
            color="#fff"
            fw={700}
            radius={0}
          >
            Discos
          </Button>
          <Button
            leftSection={<IconBuildingStore stroke={1.9}/>}
            variant="subtle"
            justify="left"
            color="#fff"
            fw={700}
            radius={0}
          >
            Pedidos
          </Button>
          <Button
            leftSection={<IconChartBar stroke={1.9}/>}
            variant="subtle"
            justify="left"
            color="#fff"
            fw={700}
            radius={0}
          >
            Dashboard
          </Button>
        </nav>
      </div>
      <main className="main"></main>
    </div>
  );
}

export default Curadoria;
