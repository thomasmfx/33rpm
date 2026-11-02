import painel from '../../pages/Curadoria/Painel.module.scss';
import styles from './CuradoriaDashboard.module.scss';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Skeleton, VisuallyHidden } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { LineChart, type LineChartSeries } from '@mantine/charts';
import * as XLSX from 'xlsx';
import {
  categoriasDoAcervo,
  linhasParaPlanilha,
  type PontoGrafico,
} from '../../utils/analise';
import { consultarVendas } from '../../services/analiseService';
import { ErroApi } from '../../services/api';
import { formatarBRL } from '../../utils/precificacao';
import { lerDataBR, paraIso } from '../../utils/estoque';
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

/** O que a última consulta devolveu, com as categorias que a geraram. */
interface ResultadoVendas {
  pontos: PontoGrafico[];
  categorias: string[];
}

function CuradoriaDashboard() {
  const { discos, carregandoDiscos } = useLoja();
  const hoje = useMemo(() => new Date(), []);
  // as cores mais fortes da paleta ficam com as categorias de maior acervo
  const categorias = useMemo(() => {
    const quantidade = (categoria: string) =>
      discos.filter((disco) => disco.generoPrincipal === categoria).length;
    return categoriasDoAcervo(discos).sort((a, b) => quantidade(b) - quantidade(a));
  }, [discos]);

  const [dataInicio, setDataInicio] = useState<string | null>(() =>
    paraIso(new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)),
  );
  const [dataFim, setDataFim] = useState<string | null>(() => paraIso(hoje));
  // null é "as quatro maiores": os discos chegam da API depois da montagem
  const [escolhidas, setCategoriasSelecionadas] = useState<string[] | null>(null);
  const categoriasSelecionadas = escolhidas ?? categorias.slice(0, 4);
  const [resultado, setResultado] = useState<ResultadoVendas | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [consultando, setConsultando] = useState(false);
  const consultaAtual = useRef(0);
  const consultaInicial = useRef(false);

  const todasSelecionadas =
    categorias.length > 0 && categoriasSelecionadas.length === categorias.length;

  function corDaCategoria(categoria: string): string {
    return PALETA_CORES[categorias.indexOf(categoria) % PALETA_CORES.length];
  }

  // uma consulta mais nova invalida a resposta da anterior
  async function consultar(): Promise<void> {
    const numero = ++consultaAtual.current;
    setConsultando(true);
    try {
      const pontos = await consultarVendas(dataInicio, dataFim, categoriasSelecionadas);
      if (numero !== consultaAtual.current) return;
      setResultado({ pontos, categorias: categoriasSelecionadas });
      setErros([]);
    } catch (erro) {
      if (numero !== consultaAtual.current) return;
      setResultado(null);
      setErros(erro instanceof ErroApi ? erro.mensagens : ['Falha ao consultar as vendas.']);
    } finally {
      if (numero === consultaAtual.current) setConsultando(false);
    }
  }

  // as categorias só existem depois que os discos chegam
  useEffect(() => {
    if (consultaInicial.current || categorias.length === 0) return;
    consultaInicial.current = true;
    void consultar();
  });

  function handleAlternarCategoria(categoria: string): void {
    setCategoriasSelecionadas(
      categoriasSelecionadas.includes(categoria)
        ? categoriasSelecionadas.filter((atual) => atual !== categoria)
        : [...categoriasSelecionadas, categoria],
    );
  }

  function handleExportar(): void {
    if (!resultado) return;

    const linhas = linhasParaPlanilha(resultado.pontos, resultado.categorias);
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const pasta = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(pasta, planilha, 'Vendas por categoria');
    XLSX.writeFile(pasta, 'vendas-por-categoria.xlsx');
  }

  function renderResultado() {
    if (carregandoDiscos || (consultando && !resultado)) {
      return <Skeleton height={400} aria-busy="true" aria-label="Carregando" />;
    }

    if (!resultado) return null;

    const ultimo = resultado.pontos.length - 1;
    const series: LineChartSeries[] = resultado.categorias.map((categoria) => ({
      name: categoria,
      color: corDaCategoria(categoria),
    }));

    return (
      <>
        <LineChart
          h={400}
          className={styles.grafico}
          data={resultado.pontos}
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
          withLegend
          legendProps={{ verticalAlign: 'bottom', height: 48 }}
          valueFormatter={formatarBRL}
          xAxisProps={{ tickFormatter: rotuloEixo }}
          yAxisProps={{
            tickFormatter: (valor: number) => FORMATO_EIXO.format(valor),
            width: 88,
          }}
          data-testid="grafico-vendas"
        />

        <VisuallyHidden>
          <table data-testid="tabela-vendas">
            <caption>Vendas entregues por categoria e mês, em reais</caption>
            <thead>
              <tr>
                <th scope="col">Mês</th>
                {resultado.categorias.map((categoria) => (
                  <th key={categoria} scope="col">
                    {categoria}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultado.pontos.map((ponto) => (
                <tr key={ponto.periodo}>
                  <th scope="row">{ponto.periodo}</th>
                  {resultado.categorias.map((categoria) => (
                    <td
                      key={categoria}
                      data-categoria={categoria}
                      data-periodo={ponto.periodo}
                      data-valor={ponto[categoria]}
                    >
                      {formatarBRL(Number(ponto[categoria]))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </VisuallyHidden>
      </>
    );
  }

  return (
    <div className={painel.painel}>
      <CabecalhoPainel
        titulo="Dashboard"
        resumo="Vendas entregues por categoria"
        acoes={
          <Button
            variant="outline"
            size="sm"
            disabled={!resultado || carregandoDiscos}
            onClick={handleExportar}
            leftSection={<Download size={20} />}
          >
            Exportar planilha (.xlsx)
          </Button>
        }
      />

      <div className={styles.filtros}>
        <DateInput
          label="De"
          size="sm"
          className={styles.data}
          placeholder="dd/mm/aaaa"
          valueFormat="DD/MM/YYYY"
          dateParser={lerDataBR}
          value={dataInicio}
          onChange={setDataInicio}
          data-testid="analise-inicio"
        />
        <DateInput
          label="Até"
          size="sm"
          className={styles.data}
          placeholder="dd/mm/aaaa"
          valueFormat="DD/MM/YYYY"
          dateParser={lerDataBR}
          value={dataFim}
          onChange={setDataFim}
          data-testid="analise-fim"
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
                data-testid="categoria-analise"
                data-categoria={categoria}
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
        <Button
          size="sm"
          loading={consultando}
          disabled={carregandoDiscos}
          onClick={() => void consultar()}
          data-testid="btn-consultar-analise"
        >
          Consultar
        </Button>
      </div>

      {erros.length > 0 && (
        <Alert color="red" data-testid="alerta-analise">
          {erros.map((erro) => (
            <div key={erro}>{erro}</div>
          ))}
        </Alert>
      )}

      {renderResultado()}
    </div>
  );
}

export default CuradoriaDashboard;
