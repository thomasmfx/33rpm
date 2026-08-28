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
