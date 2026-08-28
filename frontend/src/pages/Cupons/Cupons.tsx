import styles from './Cupons.module.scss';
import { Badge, Paper, Text, Title } from '@mantine/core';
import { useLoja } from '../../contexts/loja';
import { IconTicketOff } from '@tabler/icons-react';
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio';
import type { Cupom, TipoCupom } from '../../types/cupom';
import { cuponsDisponiveis, somarCupons } from '../../utils/checkout';
import { formatarBRL } from '../../utils/precificacao';

const NOME_TIPO: Record<TipoCupom, string> = {
  troca: 'Troca',
  promocional: 'Promocional',
};

const COR_TIPO: Record<TipoCupom, string> = {
  troca: 'violet',
  promocional: 'blue',
};

const SECOES: { tipo: TipoCupom; titulo: string; descricao: string }[] = [
  {
    tipo: 'troca',
    titulo: 'Cupons de troca',
    descricao: 'Gerados quando uma troca sua sobra crédito — só valem para você.',
  },
  {
    tipo: 'promocional',
    titulo: 'Cupons promocionais',
    descricao: 'Campanhas da loja — valem para qualquer cliente, um por compra (RN0033).',
  },
];

function cartaoCupom(cupom: Cupom) {
  return (
    <Paper
      key={cupom.id}
      withBorder
      p="md"
      className={cupom.isUtilizado ? styles.cartaoEsmaecido : styles.cartao}
    >
      <div className={styles.topo}>
        <Text className={styles.codigo}>{cupom.codigo}</Text>
        <Badge color={COR_TIPO[cupom.tipo]} variant="light">
          {NOME_TIPO[cupom.tipo]}
        </Badge>
      </div>
      <Text size="xl" fw={700}>{formatarBRL(cupom.valor)}</Text>
      {cupom.isUtilizado && <Badge color="gray" variant="outline">Utilizado</Badge>}
    </Paper>
  );
}

function Cupons() {
  const { clienteAtivo, cupons } = useLoja();

  if (!clienteAtivo) {
    return (
      <main className={styles.main}>
        <EstadoVazio
          icone={<IconTicketOff size={104} stroke={1.1} />}
          titulo="Nenhum perfil selecionado"
          descricao="Escolha um cliente no menu do topo para ver os cupons dele. A sessão aqui é simulada, não há login."
          rotuloAcao="Explorar o acervo"
          paraAcao="/acervo"
        />
      </main>
    );
  }

  const disponiveis = cuponsDisponiveis(cupons, clienteAtivo.id);
  const utilizados = cupons.filter(
    (cupom) =>
      cupom.isUtilizado &&
      (cupom.clienteId === null || cupom.clienteId === clienteAtivo.id),
  );

  if (disponiveis.length === 0 && utilizados.length === 0) {
    return (
      <main className={styles.main}>
        <EstadoVazio
          icone={<IconTicketOff size={104} stroke={1.1} />}
          titulo="Nenhum cupom por enquanto"
          descricao="Cupons de troca aparecem aqui quando uma devolução é aceita, e os promocionais entram nas campanhas da loja."
          rotuloAcao="Explorar o acervo"
          paraAcao="/acervo"
        />
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Title order={1} size="40">Meus cupons</Title>

      <Text size="sm">
        Total disponível:{' '}
        <Text span fw={700}>{formatarBRL(somarCupons(disponiveis))}</Text>
      </Text>

      {SECOES.map((secao) => {
        const disponiveisDaSecao = disponiveis.filter((cupom) => cupom.tipo === secao.tipo);
        const utilizadosDaSecao = utilizados.filter((cupom) => cupom.tipo === secao.tipo);

        if (disponiveisDaSecao.length === 0 && utilizadosDaSecao.length === 0) return null;

        return (
          <div key={secao.tipo} className={styles.secao}>
            <Title order={2} size="24">{secao.titulo}</Title>
            <Text size="xs" c="dimmed">{secao.descricao}</Text>

            {disponiveisDaSecao.length > 0 && (
              <div className={styles.grade}>
                {disponiveisDaSecao.map((cupom) => cartaoCupom(cupom))}
              </div>
            )}

            {utilizadosDaSecao.length > 0 && (
              <div className={styles.usados}>
                <Text size="sm" c="dimmed">Já utilizados</Text>
                <div className={styles.grade}>
                  {utilizadosDaSecao.map((cupom) => cartaoCupom(cupom))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </main>
  );
}

export default Cupons;
