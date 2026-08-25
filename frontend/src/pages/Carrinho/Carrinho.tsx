import styles from './Carrinho.module.scss';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
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
import { IconAlertTriangle, IconTrash } from '@tabler/icons-react';
import { useLoja } from '../../contexts/loja';
import { IconShoppingCartOff } from '@tabler/icons-react';
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio';
import { AVISO_ANTES_MINUTOS, PRAZO_BLOQUEIO_MINUTOS } from '../../utils/carrinho';
import type { AjusteCarrinho } from '../../utils/carrinho';
import { formatarBRL } from '../../utils/precificacao';
import { nomeFormato } from '../../utils/catalogo';

function Carrinho() {
  const {
    carrinho,
    discos,
    alterarQuantidade,
    removerDoCarrinho,
    limparCarrinho,
    minutosParaExpirar,
    itensExpirados,
    descartarItensExpirados,
    sincronizarCarrinho,
    adicionarAoCarrinho,
  } = useLoja();
  const navegar = useNavigate();

  const [ajustes, setAjustes] = useState<AjusteCarrinho[]>([]);

  const itens = carrinho.flatMap((item) => {
    const disco = discos.find((candidato) => candidato.id === item.discoId);
    return disco ? [{ ...item, disco }] : [];
  });

  const total = itens.reduce(
    (soma, item) => soma + item.disco.price * item.quantidade,
    0,
  );

  function handleReadicionarExpirados(): void {
    itensExpirados.forEach((item) => adicionarAoCarrinho(item.discoId, item.quantidade));
    descartarItensExpirados();
  }

  function handleFinalizarCompra(): void {
    const novosAjustes = sincronizarCarrinho();
    if (novosAjustes.length > 0) {
      setAjustes(novosAjustes);
      return;
    }
    navegar('/checkout');
  }

  const alertaExpirados = itensExpirados.length > 0 && (
    <Alert color="red" title="Itens removidos por expiração" icon={<IconAlertTriangle size={18} />}>
      <Stack gap={4}>
        <Text size="sm">
          O prazo de reserva caiu e estes discos saíram do seu carrinho:
        </Text>
        {itensExpirados.map((item) => {
          const disco = discos.find((candidato) => candidato.id === item.discoId);
          return (
            <Text size="sm" key={item.discoId}>
              {disco?.title ?? 'Disco indisponível'} — quantidade: {item.quantidade}
            </Text>
          );
        })}
        <Group mt="xs">
          <Button size="xs" color="dark" onClick={handleReadicionarExpirados}>
            Adicionar novamente
          </Button>
          <Button size="xs" variant="default" onClick={descartarItensExpirados}>
            Dispensar
          </Button>
        </Group>
      </Stack>
    </Alert>
  );

  if (itens.length === 0) {
    return (
      <main className={styles.main}>
        {alertaExpirados}
        <EstadoVazio
          icone={<IconShoppingCartOff size={104} stroke={1.1} />}
          titulo="Seu carrinho está vazio"
          descricao="Nenhum disco por aqui ainda. Vá ao acervo e comece a garimpar."
          rotuloAcao="Explorar o acervo"
          paraAcao="/acervo"
        />
      </main>
    );
  }

  const isPrestesAExpirar =
    minutosParaExpirar !== null && minutosParaExpirar <= AVISO_ANTES_MINUTOS;
  const textoRestante =
    minutosParaExpirar === 1
      ? 'resta 1 minuto'
      : `restam ${minutosParaExpirar} minutos`;

  return (
    <main className={styles.main}>
      {alertaExpirados}

      {minutosParaExpirar !== null && (
        <Alert color={isPrestesAExpirar ? 'orange' : 'blue'}>
          {isPrestesAExpirar
            ? `Sua reserva está perto de cair: ${textoRestante}.`
            : `Os itens ficam reservados por ${PRAZO_BLOQUEIO_MINUTOS} minutos a partir da última alteração. ${textoRestante}.`}
        </Alert>
      )}

      {ajustes.length > 0 && (
        <Alert color="orange" title="Carrinho ajustado ao estoque" icon={<IconAlertTriangle size={18} />}>
          <Stack gap={4}>
            {ajustes.map((ajuste) => (
              <Text size="sm" key={ajuste.discoId}>
                {ajuste.quantidadeNova > 0
                  ? `${ajuste.titulo}: ${ajuste.quantidadeAnterior} → ${ajuste.quantidadeNova} unidade(s)`
                  : `${ajuste.titulo}: removido, sem estoque`}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

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
        <Button color="dark" size="md" onClick={handleFinalizarCompra}>
          Finalizar compra
        </Button>
      </Group>
    </main>
  );
}

export default Carrinho;
