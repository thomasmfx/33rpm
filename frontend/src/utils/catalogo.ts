import type { Disco, Faixa } from '../types/disco';
import type { FormatoDisco, TipoEdicao } from '../types/inventario';
import { EDICOES, FORMATOS_DISCO, GENEROS, GRAVADORAS } from '../types/inventario';

import { faixasPorDisco } from './faixasMock';

export function faixasDoDisco(discoId: number): Faixa[] {
  return faixasPorDisco[discoId] ?? [];
}

export function obterFormato(id: string): FormatoDisco | undefined {
  return FORMATOS_DISCO.find((formato) => formato.id === id);
}

export function nomeFormato(id: string): string {
  return obterFormato(id)?.nome ?? '—';
}

export function obterEdicao(id: string): TipoEdicao | undefined {
  return EDICOES.find((edicao) => edicao.id === id);
}

export function nomeEdicao(id: string): string {
  return obterEdicao(id)?.nome ?? '—';
}

export function nomesEdicoes(ids: string[]): string {
  return ids.length ? ids.map(nomeEdicao).join(' + ') : '—';
}

export interface SugestoesCadastro {
  gravadoras: string[];
  generos: string[];
  estilos: string[];
}

export function sugestoesDeCadastro(discos: Disco[]): SugestoesCadastro {
  return {
    gravadoras: unir(GRAVADORAS, discos.map((disco) => disco.gravadora)),
    generos: unir(GENEROS, discos.flatMap((disco) => disco.genres)),
    estilos: unir([], discos.flatMap((disco) => disco.styles)),
  };
}

function unir(sementes: string[], doAcervo: string[]): string[] {
  const vistos = new Map<string, string>();

  for (const valor of [...sementes, ...doAcervo]) {
    const limpo = valor.trim();
    // a chave em minúsculo faz 'Epic' e 'epic' colidirem, ficando com o primeiro
    if (limpo && !vistos.has(limpo.toLowerCase())) {
      vistos.set(limpo.toLowerCase(), limpo);
    }
  }

  return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// --- Vitrine da loja ---

export const LIMITE_VITRINE = 15;

// disco inativo saiu da loja (RF0012): a página dele responde "não encontrado",
// então deixá-lo na vitrine seria oferecer um link morto
export function discosNaVitrine(discos: Disco[]): Disco[] {
  return discos.filter((disco) => disco.isAtivo);
}

export function discosEmAlta(discos: Disco[]): Disco[] {
  return discosNaVitrine(discos).slice(0, LIMITE_VITRINE);
}

export function discosMaisVendidos(discos: Disco[]): Disco[] {
  return [...discosNaVitrine(discos)]
    .sort((a, b) => b.numForSale - a.numForSale)
    .slice(0, LIMITE_VITRINE);
}

export function discosNovidades(discos: Disco[]): Disco[] {
  return [...discosNaVitrine(discos)]
    .sort((a, b) => b.releaseYear - a.releaseYear)
    .slice(0, LIMITE_VITRINE);
}

export function decadaDe(ano: number): number {
  return Math.floor(ano / 10) * 10;
}

/** "Anos 80" até o fim do século; daí em diante "Anos 2010", sem ambiguidade. */
export function rotuloDecada(decada: number): string {
  return decada < 2000 ? `Anos ${String(decada).slice(2)}` : `Anos ${decada}`;
}

export interface DecadaDoAcervo {
  decada: number;
  discos: Disco[];
}

/** Décadas com disco na vitrine, da mais antiga para a mais recente. */
export function decadasDoAcervo(discos: Disco[]): DecadaDoAcervo[] {
  const porDecada = new Map<number, Disco[]>();
  for (const disco of discosNaVitrine(discos)) {
    const decada = decadaDe(disco.releaseYear);
    porDecada.set(decada, [...(porDecada.get(decada) ?? []), disco]);
  }
  return [...porDecada.entries()]
    .sort(([a], [b]) => a - b)
    .map(([decada, daDecada]) => ({ decada, discos: daDecada }));
}

export type EixoCatalogo = 'genero' | 'estilo' | 'decada' | 'edicao' | 'formato';

export interface GrupoCatalogo {
  nome: string;
  discos: Disco[];
  /** Parâmetros do /acervo que reproduzem o grupo; vazio quando o acervo não filtra por ele. */
  filtro: Record<string, string>;
}

const posicaoDoFormato = (grupo: GrupoCatalogo) =>
  FORMATOS_DISCO.findIndex((formato) => formato.id === grupo.filtro.formato);

const PELO_TAMANHO = (a: GrupoCatalogo, b: GrupoCatalogo) => b.discos.length - a.discos.length;

// década vai da mais recente para a mais antiga e formato segue o cadastro
// (LP, 2xLP, 3xLP…); gênero, estilo e edição vão do maior grupo para o menor
const ORDEM_DO_EIXO: Record<EixoCatalogo, (a: GrupoCatalogo, b: GrupoCatalogo) => number> = {
  decada: (a, b) => Number(b.filtro.anoMin) - Number(a.filtro.anoMin),
  formato: (a, b) => posicaoDoFormato(a) - posicaoDoFormato(b),
  genero: PELO_TAMANHO,
  estilo: PELO_TAMANHO,
  edicao: PELO_TAMANHO,
};

/** RN0012: um disco com dois gêneros entra nos dois grupos. */
export function agruparCatalogo(discos: Disco[], eixo: EixoCatalogo): GrupoCatalogo[] {
  const grupos = new Map<string, GrupoCatalogo>();

  function incluir(nome: string, filtro: Record<string, string>, disco: Disco): void {
    const grupo = grupos.get(nome) ?? { nome, discos: [], filtro };
    grupo.discos.push(disco);
    grupos.set(nome, grupo);
  }

  for (const disco of discosNaVitrine(discos)) {
    if (eixo === 'genero') {
      disco.genres.forEach((genero) => incluir(genero, { categoria: genero }, disco));
    }
    if (eixo === 'estilo') {
      disco.styles.forEach((estilo) => incluir(estilo, { categoria: estilo }, disco));
    }
    if (eixo === 'decada') {
      const decada = decadaDe(disco.releaseYear);
      incluir(rotuloDecada(decada), { anoMin: String(decada), anoMax: String(decada + 9) }, disco);
    }
    if (eixo === 'edicao') {
      disco.edicaoIds.forEach((id) => incluir(nomeEdicao(id), {}, disco));
    }
    if (eixo === 'formato') {
      incluir(nomeFormato(disco.formatoId), { formato: disco.formatoId }, disco);
    }
  }

  return [...grupos.values()].sort(ORDEM_DO_EIXO[eixo]);
}

export type OrdemAcervo = 'relevancia' | 'menor-preco' | 'mais-recentes';

export function ordenarDiscos(discos: Disco[], ordem: OrdemAcervo): Disco[] {
  if (ordem === 'menor-preco') return [...discos].sort((a, b) => a.price - b.price);
  if (ordem === 'mais-recentes') {
    return [...discos].sort((a, b) => b.releaseYear - a.releaseYear);
  }
  return discos;
}
