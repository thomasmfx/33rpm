import '@mantine/charts/styles.css';
import styles from './CuradoriaDashboard.module.scss';
import { useMemo, useState } from 'react';
import { Alert, Button, Grid, MultiSelect, Paper, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { LineChart, type LineChartSeries } from '@mantine/charts';
import { IconAlertTriangle, IconFileSpreadsheet } from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import {
  categoriasDoAcervo,
  dataLocal,
  linhasParaPlanilha,
  seriePorCategoria,
  validarPeriodo,
  type PontoGrafico,
} from '../../utils/analise';
import { formatarBRL } from '../../utils/precificacao';
import { paraIso } from '../../utils/estoque';
import { useLoja } from '../../contexts/loja';

const PALETA_CORES = [
  'indigo.6',
  'teal.6',
  'orange.6',
  'grape.6',
  'red.6',
  'cyan.6',
  'lime.6',
  'pink.6',
];

function resumoPeriodo(serie: PontoGrafico[], categorias: string[]) {
  const totalPorCategoria = new Map(categorias.map((categoria) => [categoria, 0]));
  let total = 0;

  for (const ponto of serie) {
    for (const categoria of categorias) {
      const valor = Number(ponto[categoria] ?? 0);
      total += valor;
      totalPorCategoria.set(categoria, (totalPorCategoria.get(categoria) ?? 0) + valor);
    }
  }

  let categoriaTopo: string | null = null;
  let maiorValor = -1;
  for (const [categoria, valor] of totalPorCategoria) {
    if (valor > maiorValor) {
      maiorValor = valor;
      categoriaTopo = categoria;
    }
  }

  return {
    total,
    mediaMensal: serie.length > 0 ? total / serie.length : 0,
    categoriaTopo,
  };
}

function CuradoriaDashboard() {
  const { pedidos, discos } = useLoja();
  const hoje = useMemo(() => new Date(), []);
  const categorias = useMemo(() => categoriasDoAcervo(discos), [discos]);

  const [dataInicio, setDataInicio] = useState<string | null>(() => {
    const inicio = new Date(hoje);
    inicio.setMonth(inicio.getMonth() - 11);
    return paraIso(inicio);
  });
  const [dataFim, setDataFim] = useState<string | null>(() => paraIso(hoje));
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>(() =>
    categorias.slice(0, 4),
  );

  const todasSelecionadas =
    categorias.length > 0 && categoriasSelecionadas.length === categorias.length;

  const inicio = dataInicio ? dataLocal(dataInicio) : null;
  const fim = dataFim ? dataLocal(dataFim) : null;
  const erroPeriodo = validarPeriodo(inicio, fim);

  const serie =
    erroPeriodo || !inicio || !fim
      ? null
      : seriePorCategoria(pedidos, discos, categoriasSelecionadas, inicio, fim);

  const series: LineChartSeries[] = categoriasSelecionadas.map((categoria, indice) => ({
    name: categoria,
    color: PALETA_CORES[indice % PALETA_CORES.length],
  }));

  const resumo = serie ? resumoPeriodo(serie, categoriasSelecionadas) : null;

  function handleExportar(): void {
    if (!serie) return;

    const linhas = linhasParaPlanilha(serie, categoriasSelecionadas);
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const pasta = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(pasta, planilha, 'Vendas por categoria');
    XLSX.writeFile(pasta, 'vendas-por-categoria.xlsx');
  }

  return (
    <div className={styles.painelDashboard}>
      <div className={styles.controles}>
        <DatePickerInput
          label="Data de início"
          placeholder="Selecione uma data"
          valueFormat="DD/MM/YYYY"
          value={dataInicio}
          onChange={setDataInicio}
        />
        <DatePickerInput
          label="Data de fim"
          placeholder="Selecione uma data"
          valueFormat="DD/MM/YYYY"
          value={dataFim}
          onChange={setDataFim}
        />
        <MultiSelect
          label="Categorias"
          placeholder="Selecione as categorias"
          data={categorias}
          value={categoriasSelecionadas}
          onChange={setCategoriasSelecionadas}
          flex="1"
          rightSectionWidth={92}
          rightSectionPointerEvents="all"
          rightSection={
            <Button
              variant="subtle"
              color="dark"
              size="compact-xs"
              onClick={() =>
                setCategoriasSelecionadas(
                  todasSelecionadas ? [] : [...categorias],
                )
              }
            >
              {todasSelecionadas ? 'Limpar' : 'Todas'}
            </Button>
          }
        />
        <Button
          leftSection={<IconFileSpreadsheet size={18} />}
          variant="default"
          disabled={!serie}
          onClick={handleExportar}
        >
          Exportar planilha
        </Button>
      </div>

      {erroPeriodo && (
        <Alert color="orange" icon={<IconAlertTriangle size={18} />}>
          {erroPeriodo}
        </Alert>
      )}

      {serie && resumo && (
        <>
          <Grid>
            <Grid.Col span={4}>
              <Paper withBorder p="md">
                <Text size="sm" c="dimmed">Total vendido no período</Text>
                <Text size="xl" fw={600}>{formatarBRL(resumo.total)}</Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={4}>
              <Paper withBorder p="md">
                <Text size="sm" c="dimmed">Média mensal</Text>
                <Text size="xl" fw={600}>{formatarBRL(resumo.mediaMensal)}</Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={4}>
              <Paper withBorder p="md">
                <Text size="sm" c="dimmed">Categoria que mais vendeu</Text>
                <Text size="xl" fw={600}>{resumo.categoriaTopo ?? '—'}</Text>
              </Paper>
            </Grid.Col>
          </Grid>

          <LineChart
            h={420}
            data={serie}
            dataKey="periodo"
            series={series}
            withLegend
            legendProps={{ verticalAlign: 'bottom' }}
            valueFormatter={(valor) => formatarBRL(valor)}
          />
        </>
      )}
    </div>
  );
}

export default CuradoriaDashboard;
