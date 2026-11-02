import { rotuloMes, type PontoGrafico } from '../utils/analise';
import { requisitar } from './api';

interface VendasApi {
  meses: string[];
  series: { categoria: string; valores: number[] }[];
}

/** RF0055: um ponto por mês do período, com o valor vendido de cada categoria. */
export async function consultarVendas(
  inicio: string | null,
  fim: string | null,
  categorias: string[],
): Promise<PontoGrafico[]> {
  const parametros = new URLSearchParams();
  if (inicio) parametros.set('inicio', inicio);
  if (fim) parametros.set('fim', fim);
  categorias.forEach((categoria) => parametros.append('categorias', categoria));

  const bruto = await requisitar<VendasApi>(`/analises/vendas?${parametros}`);
  return bruto.meses.map((mes, indice) => {
    const ponto: PontoGrafico = { periodo: rotuloMes(mes) };
    for (const serie of bruto.series) {
      ponto[serie.categoria] = serie.valores[indice];
    }
    return ponto;
  });
}
