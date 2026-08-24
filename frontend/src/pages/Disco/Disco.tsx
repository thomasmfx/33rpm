import styles from './Disco.module.scss';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Anchor,
  Badge,
  Button,
  Divider,
  Group,
  Image,
  NumberInput,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconArrowLeft, IconCheck, IconShoppingCartPlus } from '@tabler/icons-react';
import { formatarBRL } from '../../utils/precificacao';
import { nomeFormato, obterEdicao } from '../../utils/catalogo';
import VinylCarousel from '../../components/VinylCarousel/VinylCarousel';
import { useLoja } from '../../contexts/loja';

function Disco() {
  const { id } = useParams();
  const { discos, adicionarAoCarrinho } = useLoja();
  const [quantidade, setQuantidade] = useState<number>(1);
  const [isAdicionado, setIsAdicionado] = useState(false);

  // disco inativo sai da loja (RF0012), então some junto com o inexistente
  const disco = discos.find(
    (candidato) => candidato.id === Number(id) && candidato.isAtivo,
  );

  const relacionados = useMemo(() => {
    if (!disco) return [];
    return discos.filter(
      (outro) =>
        outro.id !== disco.id &&
        outro.isAtivo &&
        outro.genres.some((genero) => disco.genres.includes(genero)),
    );
  }, [disco, discos]);

  if (!disco) {
    return (
      <main className={styles.main}>
        <Stack gap="md" align="flex-start" mt="6em">
          <Title order={1} size="32">Disco não encontrado</Title>
          <Text fw={300}>
            Este disco saiu do acervo ou o endereço está incorreto.
          </Text>
          <Anchor component={Link} to="/" fw={700}>
            Voltar para a home
          </Anchor>
        </Stack>
      </main>
    );
  }

  const esgotado = disco.estoque === 0;

  const fichaTecnica = [
    ['Gravadora', disco.gravadora],
    ['Formato', nomeFormato(disco.formatoId)],
    ['Ano de lançamento', String(disco.releaseYear)],
    ['Faixas', String(disco.numeroFaixas)],
    ['Duração', disco.duracao],
    ['Código de catálogo', disco.codigoCatalogo],
    ['Código de barras', disco.codigoBarras],
    ['Peso', `${disco.dimensoes.peso} g`],
  ];

  return (
    <main className={styles.main}>
      <Anchor component={Link} to="/" c="dimmed" mb="2em" display="inline-block">
        <Group gap={6}>
          <IconArrowLeft size={16} />
          <Text size="sm">Voltar ao acervo</Text>
        </Group>
      </Anchor>

      <div className={styles.conteudo}>
        <div className={styles.capa}>
          <Image src={disco.coverSrc} alt={disco.title} w="100%" fit="cover" />
        </div>

        <Stack gap="lg">
          <Stack gap={4}>
            <Text size="lg" fw={400}>{disco.artist}</Text>
            <Title order={1} size="40" lh={1.1}>{disco.title}</Title>
          </Stack>

          <Group gap={6}>
            {[...disco.genres, ...disco.styles].map((categoria) => (
              <Badge key={categoria} variant="light" color="dark" size="sm">
                {categoria}
              </Badge>
            ))}
          </Group>

          <Group gap={8}>
            <Badge variant="outline" color="dark" size="lg">
              {nomeFormato(disco.formatoId)}
            </Badge>
            {disco.edicaoIds.map((edicaoId) => (
              <Tooltip
                key={edicaoId}
                label={obterEdicao(edicaoId)?.descricao}
                multiline
                w={280}
              >
                <Badge variant="outline" color="dark" size="lg">
                  {obterEdicao(edicaoId)?.nome}
                </Badge>
              </Tooltip>
            ))}
          </Group>

          <Divider />

          <Stack gap="xs">
            <Title order={2} size="32">{formatarBRL(disco.price)}</Title>
            <Text size="sm" fw={300} c={esgotado ? 'red' : 'dimmed'}>
              {esgotado
                ? 'Esgotado no momento'
                : `${disco.estoque} ${disco.estoque === 1 ? 'cópia disponível' : 'cópias disponíveis'}`}
            </Text>
          </Stack>

          <Group align="flex-end" gap="sm">
            <NumberInput
              label="Quantidade"
              w={110}
              min={1}
              max={disco.estoque}
              step={1}
              allowDecimal={false}
              allowNegative={false}
              clampBehavior="strict"
              disabled={esgotado}
              value={quantidade}
              onChange={(valor) => {
                setQuantidade(Number(valor) || 1);
                setIsAdicionado(false);
              }}
            />
            <Button
              color="dark"
              size="md"
              flex={1}
              disabled={esgotado}
              leftSection={<IconShoppingCartPlus size={20} />}
              onClick={() => {
                adicionarAoCarrinho(disco.id, quantidade);
                setIsAdicionado(true);
              }}
            >
              Adicionar ao carrinho
            </Button>
          </Group>

          {isAdicionado && (
            <Group gap={6} c="green">
              <IconCheck size={16} />
              <Text size="sm">
                {quantidade} {quantidade === 1 ? 'cópia adicionada' : 'cópias adicionadas'} ao carrinho
              </Text>
            </Group>
          )}

          <Divider />

          <Stack gap="xs">
            <Title order={3} size="18">Sobre este disco</Title>
            <Text fw={300} size="sm">{disco.descricao}</Text>
          </Stack>

          <Stack gap="xs">
            <Title order={3} size="18">Ficha técnica</Title>
            <Table withTableBorder>
              <Table.Tbody>
                {fichaTecnica.map(([rotulo, valor]) => (
                  <Table.Tr key={rotulo}>
                    <Table.Td w="45%">
                      <Text size="sm" c="dimmed">{rotulo}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={300}>{valor}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Stack>
      </div>

      {relacionados.length > 0 && (
        <section className={styles.relacionados}>
          <Title order={2}>Quem ouve isso também leva</Title>
          <VinylCarousel discos={relacionados} />
        </section>
      )}
    </main>
  );
}

export default Disco;
