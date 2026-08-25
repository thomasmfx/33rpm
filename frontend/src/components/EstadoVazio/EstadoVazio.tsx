import styles from './EstadoVazio.module.scss';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Stack, Text, Title } from '@mantine/core';

interface EstadoVazioProps {
  icone: ReactNode;
  titulo: string;
  descricao: string;
  rotuloAcao?: string;
  paraAcao?: string;
}

export default function EstadoVazio({
  icone,
  titulo,
  descricao,
  rotuloAcao,
  paraAcao,
}: Readonly<EstadoVazioProps>) {
  return (
    <div className={styles.container}>
      <div className={styles.icone} aria-hidden>
        {icone}
      </div>

      <Stack gap={6} align="center" className={styles.texto}>
        <Title order={2} size="28">
          {titulo}
        </Title>
        <Text fw={300} c="dimmed">
          {descricao}
        </Text>
      </Stack>

      {rotuloAcao && paraAcao && (
        <Button component={Link} to={paraAcao} color="dark" size="md" radius="xl">
          {rotuloAcao}
        </Button>
      )}
    </div>
  );
}
