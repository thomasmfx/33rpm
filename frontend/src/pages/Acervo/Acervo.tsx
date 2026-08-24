import styles from './Acervo.module.scss';
import { useMemo, useState } from 'react';
import {
  Button,
  Group,
  NumberInput,
  Select,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { FORMATOS_DISCO } from '../../types/inventario';
import type { FiltrosDiscos } from '../../types/inventario';
import {
  contarFiltrosDiscosAtivos,
  filtrarDiscos,
  FILTROS_DISCOS_VAZIOS,
} from '../../utils/filtrarDiscos';
import { useLoja } from '../../contexts/loja';
import VinylCard from '../../components/VinylCard/VinylCard';

const FILTROS_LOJA: FiltrosDiscos = { ...FILTROS_DISCOS_VAZIOS, status: 'ativos' };

const OPCOES_FORMATO = [
  { value: '', label: 'Todos os formatos' },
  ...FORMATOS_DISCO.map((formato) => ({
    value: formato.id,
    label: formato.nome,
  })),
];

function Acervo() {
  const { discos } = useLoja();
  const [filtros, setFiltros] = useState<FiltrosDiscos>(FILTROS_LOJA);

  const resultado = useMemo(() => filtrarDiscos(discos, filtros), [discos, filtros]);

  function handleAlterarFiltro<Campo extends keyof FiltrosDiscos>(
    campo: Campo,
    valor: FiltrosDiscos[Campo],
  ): void {
    setFiltros((atuais) => ({ ...atuais, [campo]: valor }));
  }

  return (
    <main className={styles.main}>
      <Title order={1} size="40">Acervo</Title>

      <div className={styles.filtros}>
        <TextInput
          label="Buscar"
          placeholder="Título do disco"
          radius="sm"
          flex={1}
          miw={200}
          rightSection={<IconSearch size={18} />}
          value={filtros.titulo}
          onChange={(evento) =>
            handleAlterarFiltro('titulo', evento.currentTarget.value)
          }
        />
        <TextInput
          label="Artista"
          placeholder="Nome do artista"
          radius="sm"
          value={filtros.artista}
          onChange={(evento) =>
            handleAlterarFiltro('artista', evento.currentTarget.value)
          }
        />
        <TextInput
          label="Categoria"
          placeholder="Rock, Hip Hop..."
          radius="sm"
          value={filtros.categoria}
          onChange={(evento) =>
            handleAlterarFiltro('categoria', evento.currentTarget.value)
          }
        />
        <Select
          label="Formato"
          radius="sm"
          w={160}
          data={OPCOES_FORMATO}
          value={filtros.formatoId}
          onChange={(valor) => handleAlterarFiltro('formatoId', valor ?? '')}
        />
        <Group gap="xs">
          <NumberInput
            label="Preço de"
            radius="sm"
            w={110}
            hideControls
            prefix="R$ "
            value={filtros.precoMin}
            onChange={(valor) => handleAlterarFiltro('precoMin', String(valor))}
          />
          <NumberInput
            label="até"
            radius="sm"
            w={110}
            hideControls
            prefix="R$ "
            value={filtros.precoMax}
            onChange={(valor) => handleAlterarFiltro('precoMax', String(valor))}
          />
        </Group>
        {contarFiltrosDiscosAtivos(filtros) > 1 && (
          <Button variant="subtle" color="black" onClick={() => setFiltros(FILTROS_LOJA)}>
            Limpar filtros
          </Button>
        )}
      </div>

      <Text size="sm" c="dimmed">
        {resultado.length} {resultado.length === 1 ? 'disco' : 'discos'}
      </Text>

      {resultado.length === 0 ? (
        <Text fw={300}>Nenhum disco encontrado com esses critérios.</Text>
      ) : (
        <div className={styles.grade}>
          {resultado.map((disco) => (
            <VinylCard
              key={disco.id}
              thumbSrc={disco.coverSrc}
              diskInfo={{
                id: disco.id,
                title: disco.title,
                artist: disco.artist,
                releaseYear: disco.releaseYear,
                genre: disco.styles[0] ?? disco.genres[0],
                price: disco.price,
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}

export default Acervo;
