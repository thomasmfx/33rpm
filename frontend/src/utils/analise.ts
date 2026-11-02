import type { Disco } from '../types/disco';

export interface PontoGrafico {
  periodo: string;
  [categoria: string]: string | number;
}

/** 'yyyy-mm' do servidor vira 'mm/yyyy', o mês/ano do eixo (RNF0043). */
export function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split('-');
  return `${mes}/${ano}`;
}

/** RN0071: as vendas contam no gênero principal do disco, então só ele vira categoria. */
export function categoriasDoAcervo(discos: Disco[]): string[] {
  return [...new Set(discos.map((disco) => disco.generoPrincipal))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}

/** RF0058: as linhas que vão para a planilha — período, categoria e valor. */
export function linhasParaPlanilha(
  serie: PontoGrafico[],
  categorias: string[],
): Record<string, string | number>[] {
  return serie.flatMap((ponto) =>
    categorias.map((categoria) => ({
      Período: ponto.periodo,
      Categoria: categoria,
      'Valor de venda (R$)': Number(ponto[categoria] ?? 0),
    })),
  );
}
