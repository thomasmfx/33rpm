import styles from './Carrinho.module.scss';
import { Link } from 'react-router-dom';
import {
  Anchor,
  Button,
  Divider,
  Group,
  Image,
  NumberInput,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useLoja } from '../../contexts/loja';
import { formatarBRL } from '../../utils/precificacao';
import { nomeFormato } from '../../utils/catalogo';

function Carrinho() {
  const { carrinho, discos, alterarQuantidade, removerDoCarrinho, limparCarrinho } =
    useLoja();

  const itens = carrinho.flatMap((item) => {
    const disco = discos.find((candidato) => candidato.id === item.discoId);
    return disco ? [{ ...item, disco }] : [];
  });

  const total = itens.reduce(
    (soma, item) => soma + item.disco.price * item.quantidade,
    0,
  );

  if (itens.length === 0) {
    return (
      <main className={styles.main}>
        <Title order={1} size="40">Seu carrinho</Title>
        <Text fw={300}>Nenhum disco por aqui ainda.</Text>
        <Anchor component={Link} to="/acervo" fw={700}>
          Explorar o acervo
        </Anchor>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Group justify="space-between" align="center">
        <Title order={1} size="40">Seu carrinho</Title>
        <Button variant="subtle" color="black" onClick={limparCarrinho}>
          Esvaziar
        </Button>
      </Group>

      <Stack gap="lg">
        {itens.map(({ disco, quantidade }) => (
          <div key={disco.id}>
            <div className={styles.item}>
              <Link to={`/disco/${disco.id}`} className={styles.capa}>
                <Image src={disco.coverSrc} alt={disco.title} w={90} h={90} fit="cover" />
              </Link>

              <Stack gap={2}>
                <Anchor component={Link} to={`/disco/${disco.id}`} c="black" fw={600}>
                  {disco.title}
                </Anchor>
                <Text size="sm" fw={300}>{disco.artist}</Text>
                <Text size="xs" c="dimmed">{nomeFormato(disco.formatoId)}</Text>
              </Stack>

              <NumberInput
                w={90}
                min={1}
                max={disco.estoque}
                step={1}
                allowDecimal={false}
                allowNegative={false}
                clampBehavior="strict"
                value={quantidade}
                onChange={(valor) => alterarQuantidade(disco.id, Number(valor) || 1)}
              />

              <Text fw={600} w={110} ta="right">
                {formatarBRL(disco.price * quantidade)}
              </Text>

              <Button
                variant="subtle"
                color="gray"
                px="xs"
                aria-label={`Remover ${disco.title}`}
                onClick={() => removerDoCarrinho(disco.id)}
              >
                <IconTrash size={18} />
              </Button>
            </div>
            <Divider mt="lg" />
          </div>
        ))}
      </Stack>

      <Group justify="space-between" align="center">
        <Text size="lg" fw={300}>Total</Text>
        <Title order={2} size="32">{formatarBRL(total)}</Title>
      </Group>

      <Group justify="flex-end">
        <Button color="dark" size="md" disabled>
          Finalizar compra
        </Button>
      </Group>
    </main>
  );
}

export default Carrinho;
