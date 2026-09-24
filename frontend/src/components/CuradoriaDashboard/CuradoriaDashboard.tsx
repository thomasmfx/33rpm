import painel from '../../pages/Curadoria/Painel.module.scss';
import styles from './CuradoriaDashboard.module.scss';
import { useMemo, useState } from 'react';
import { Alert, Button, Skeleton } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { LineChart, type LineChartSeries } from '@mantine/charts';
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
import CabecalhoPainel from '../CabecalhoPainel/CabecalhoPainel';
import { Download } from '@carbon/icons-react';

const PALETA_CORES = [
  '#141413',
  '#D9501F',
  '#8F8C84',
  '#2F7A4E',
  '#C9C6BE',
  '#2743D6',
  '#6B3FD4',
  '#B8421A',
  '#0B7A75',
];

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const FORMATO_EIXO = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** '08/2026' de rotuloMes vira 'AGO 26' no eixo, que é onde falta espaço. */
function rotuloEixo(periodo: string): string {
  const [mes, ano] = periodo.split('/');
  return `${MESES[Number(mes) - 1]} ${ano.slice(2)}`;
}

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
  const { pedidos, discos, carregandoClientes } = useLoja();
  const hoje = useMemo(() => new Date(), []);
  // as cores mais fortes da paleta ficam com as categorias de maior acervo
  const categorias = useMemo(() => {
    const quantidade = (categoria: string) =>
      discos.filter((disco) => disco.genres.includes(categoria)).length;
    return categoriasDoAcervo(discos).sort((a, b) => quantidade(b) - quantidade(a));
  }, [discos]);

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

  function corDaCategoria(categoria: string): string {
    return PALETA_CORES[categorias.indexOf(categoria) % PALETA_CORES.length];
  }

  const series: LineChartSeries[] = categoriasSelecionadas.map((categoria) => ({
    name: categoria,
    color: corDaCategoria(categoria),
  }));

  const resumo = serie ? resumoPeriodo(serie, categoriasSelecionadas) : null;
  const indicadores = resumo
    ? [
        { rotulo: 'Total vendido no período', valor: formatarBRL(resumo.total) },
        { rotulo: 'Média mensal', valor: formatarBRL(resumo.mediaMensal) },
        { rotulo: 'Categoria que mais vendeu', valor: resumo.categoriaTopo ?? '—' },
      ]
    : [];

  function handleAlternarCategoria(categoria: string): void {
    setCategoriasSelecionadas((atuais) =>
      atuais.includes(categoria)
        ? atuais.filter((atual) => atual !== categoria)
        : [...atuais, categoria],
    );
  }

  function handleExportar(): void {
    if (!serie) return;

    const linhas = linhasParaPlanilha(serie, categoriasSelecionadas);
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const pasta = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(pasta, planilha, 'Vendas por categoria');
    XLSX.writeFile(pasta, 'vendas-por-categoria.xlsx');
  }

  function renderResultado() {
    // os pedidos de demonstração nascem dos clientes: sem eles, tudo seria zero
    if (carregandoClientes) {
      return (
        <>
          <div className={styles.indicadores} aria-busy="true" aria-label="Carregando">
            {[0, 1, 2].map((indice) => (
              <div key={indice} className={styles.indicador}>
                <Skeleton height={11} width={160} />
                <Skeleton height={32} width="70%" />
              </div>
            ))}
          </div>
          <Skeleton height={400} />
        </>
      );
    }

    if (!serie) return null;

    const ultimo = serie.length - 1;

    return (
      <>
        <div className={styles.indicadores}>
          {indicadores.map((indicador) => (
            <div key={indicador.rotulo} className={styles.indicador}>
              <span className={styles.rotuloIndicador}>{indicador.rotulo}</span>
              <span className={styles.valorIndicador}>{indicador.valor}</span>
            </div>
          ))}
        </div>

        <LineChart
          h={400}
          className={styles.grafico}
          data={serie}
          dataKey="periodo"
          series={series}
          curveType="linear"
          strokeWidth={2}
          strokeDasharray="0"
          tickLine="none"
          gridColor="#E3E1DA"
          referenceLines={[{ y: 0, color: '#141413' }]}
          activeDotProps={{ r: 4, strokeWidth: 0 }}
          // só o último mês ganha ponto, marcando onde a série termina
          lineProps={(linha) => ({
            dot: ({ cx, cy, index }: { cx?: number; cy?: number; index: number }) =>
              index === ultimo ? <circle cx={cx} cy={cy} r={4} fill={linha.color} /> : null,
          })}
          valueFormatter={formatarBRL}
          xAxisProps={{ tickFormatter: rotuloEixo }}
          yAxisProps={{
            tickFormatter: (valor: number) => FORMATO_EIXO.format(valor),
            width: 88,
          }}
        />
      </>
    );
  }

  return (
    <div className={painel.painel}>
      <CabecalhoPainel
        titulo="Dashboard"
        resumo="Vendas por categoria"
        acoes={
          <Button
            variant="outline"
            size="sm"
            disabled={!serie || carregandoClientes}
            onClick={handleExportar}
            leftSection={<Download size={20} />}
          >
            Exportar planilha (.xlsx)
          </Button>
        }
      />

      <div className={styles.filtros}>
        <DatePickerInput
          label="De"
          size="sm"
          className={styles.data}
          placeholder="dd/mm/aaaa"
          valueFormat="DD/MM/YYYY"
          value={dataInicio}
          onChange={setDataInicio}
        />
        <DatePickerInput
          label="Até"
          size="sm"
          className={styles.data}
          placeholder="dd/mm/aaaa"
          valueFormat="DD/MM/YYYY"
          value={dataFim}
          onChange={setDataFim}
        />
        <div className={styles.grupoCategorias}>
          <div className={styles.cabecalhoCategorias}>
            <span>Categorias</span>
            <Button
              variant="link"
              onClick={() =>
                setCategoriasSelecionadas(todasSelecionadas ? [] : [...categorias])
              }
            >
              {todasSelecionadas ? 'Limpar' : 'Todas'}
            </Button>
          </div>
          <div className={styles.categorias}>
            {categorias.map((categoria) => (
              <button
                key={categoria}
                type="button"
                className={styles.categoria}
                aria-pressed={categoriasSelecionadas.includes(categoria)}
                onClick={() => handleAlternarCategoria(categoria)}
              >
                <span
                  className={styles.amostra}
                  style={{ background: corDaCategoria(categoria) }}
                  aria-hidden
                />
                {categoria}
              </button>
            ))}
          </div>
        </div>
      </div>

      {erroPeriodo && <Alert color="red">{erroPeriodo}</Alert>}

      {renderResultado()}
    </div>
  );
}

export default CuradoriaDashboard;
