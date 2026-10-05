import type { Disco } from '../types/disco';
import type { FiltrosDiscos } from '../types/inventario';
import { EDICOES, FORMATOS_DISCO, GRUPOS_PRECIFICACAO } from '../types/inventario';
import type { FormDiscoValues } from '../components/FormDisco/FormDisco';
import { discoDoMock } from '../utils/catalogo';
import { apenasDigitos } from '../utils/texto';
import { requisitar } from './api';

interface Nomeado {
  id?: number;
  nome: string;
}

type TipoCategoria = 'genero' | 'estilo';

/** Formato do disco como o backend o serializa: domínios são objetos, não texto. */
export interface DiscoApi {
  id: number;
  codigo: string;
  titulo: string;
  artista: Nomeado;
  gravadora: Nomeado;
  anoLancamento: string;
  categorias: { id?: number; desc: string; tipo: TipoCategoria }[];
  edicoes: Nomeado[];
  formato: Nomeado;
  grupoPrecificacao: Nomeado;
  codigoCatalogo: string;
  codigoBarras: string;
  numeroFaixas: number;
  duracao: string;
  descricao: string;
  altura: number;
  largura: number;
  profundidade: number;
  peso: number;
  capaUrl: string;
  capaMiniaturaUrl?: string | null;
  precoVenda: number;
  precoSugerido?: number | null;
  autorizacaoGerente?: string | null;
  estoque: number;
  isAtivo: boolean;
  motivoStatus?: {
    categoria: { desc: string };
    justificativa: string;
    automatico: boolean;
    data: string;
  } | null;
  ultimaVendaEm?: string | null;
}

// o conjunto vem do servidor sem ordem garantida; a tela precisa de uma estável
function categoriasDoTipo(bruto: DiscoApi, tipo: TipoCategoria): string[] {
  return bruto.categorias
    .filter((categoria) => categoria.tipo === tipo)
    .map((categoria) => categoria.desc)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Formato, edição e grupo casam com as constantes do front pelo nome, como na carga. */
export function paraDisco(bruto: DiscoApi): Disco {
  const mock = discoDoMock(bruto.codigoCatalogo);
  const edicoes = bruto.edicoes.map((edicao) => edicao.nome);

  return {
    id: bruto.id,
    codigo: bruto.codigo,
    title: bruto.titulo,
    artist: bruto.artista.nome,
    releaseYear: Number(bruto.anoLancamento.slice(0, 4)),
    genres: categoriasDoTipo(bruto, 'genero'),
    styles: categoriasDoTipo(bruto, 'estilo'),
    price: bruto.precoVenda,
    coverSrc: bruto.capaUrl,
    coverThumb: bruto.capaMiniaturaUrl ?? undefined,
    numForSale: mock?.numForSale ?? 0,
    discogsUri: mock?.discogsUri ?? '',
    gravadora: bruto.gravadora.nome,
    formatoId: FORMATOS_DISCO.find((formato) => formato.nome === bruto.formato.nome)?.id ?? '',
    edicaoIds: EDICOES.filter((edicao) => edicoes.includes(edicao.nome)).map((edicao) => edicao.id),
    codigoCatalogo: bruto.codigoCatalogo,
    codigoBarras: bruto.codigoBarras,
    numeroFaixas: bruto.numeroFaixas,
    duracao: bruto.duracao,
    descricao: bruto.descricao,
    dimensoes: {
      altura: bruto.altura,
      largura: bruto.largura,
      profundidade: bruto.profundidade,
      peso: bruto.peso,
    },
    grupoPrecificacaoId:
      GRUPOS_PRECIFICACAO.find((grupo) => grupo.nome === bruto.grupoPrecificacao.nome)?.id ?? '',
    estoque: bruto.estoque,
    isAtivo: bruto.isAtivo,
    motivoStatus: bruto.motivoStatus
      ? {
          categoria: bruto.motivoStatus.categoria.desc,
          justificativa: bruto.motivoStatus.justificativa,
          data: bruto.motivoStatus.data,
          automatico: bruto.motivoStatus.automatico,
        }
      : null,
    ultimaVendaEm: bruto.ultimaVendaEm ?? null,
    autorizacaoGerente: bruto.autorizacaoGerente ?? null,
    precoSugerido: bruto.precoSugerido ?? null,
  };
}

function paraPayload(valores: FormDiscoValues, capaMiniaturaUrl: string | null) {
  const formato = FORMATOS_DISCO.find((candidato) => candidato.id === valores.formatoId);
  const grupo = GRUPOS_PRECIFICACAO.find(
    (candidato) => candidato.id === valores.grupoPrecificacaoId,
  );

  return {
    titulo: valores.title,
    artista: { nome: valores.artist },
    gravadora: { nome: valores.gravadora },
    anoLancamento: `${valores.releaseYear}-01-01`,
    categorias: [
      ...valores.genres.map((desc) => ({ desc, tipo: 'genero' })),
      ...valores.styles.map((desc) => ({ desc, tipo: 'estilo' })),
    ],
    edicoes: EDICOES.filter((edicao) => valores.edicaoIds.includes(edicao.id)).map((edicao) => ({
      nome: edicao.nome,
    })),
    formato: formato ? { nome: formato.nome } : null,
    grupoPrecificacao: grupo ? { nome: grupo.nome } : null,
    codigoCatalogo: valores.codigoCatalogo,
    codigoBarras: apenasDigitos(valores.codigoBarras),
    numeroFaixas: valores.numeroFaixas,
    duracao: valores.duracao,
    descricao: valores.descricao,
    altura: valores.dimensoes.altura,
    largura: valores.dimensoes.largura,
    profundidade: valores.dimensoes.profundidade,
    peso: valores.dimensoes.peso,
    capaUrl: valores.coverSrc,
    capaMiniaturaUrl,
    precoVenda: valores.price,
    autorizacaoGerente: valores.autorizacaoGerente?.trim() || null,
  };
}

function comoQuery(filtros: FiltrosDiscos): string {
  const parametros = new URLSearchParams();
  const textos = {
    titulo: filtros.titulo,
    artista: filtros.artista,
    gravadora: filtros.gravadora,
    categoria: filtros.categoria,
    codigo: filtros.codigo,
    anoMin: filtros.anoMin,
    anoMax: filtros.anoMax,
    precoMin: filtros.precoMin,
    precoMax: filtros.precoMax,
  };
  for (const [chave, valor] of Object.entries(textos)) {
    if (valor.trim()) parametros.set(chave, valor.trim());
  }

  const grupo = GRUPOS_PRECIFICACAO.find((candidato) => candidato.id === filtros.grupoPrecificacaoId);
  if (grupo) parametros.set('grupo', grupo.nome);
  const formato = FORMATOS_DISCO.find((candidato) => candidato.id === filtros.formatoId);
  if (formato) parametros.set('formato', formato.nome);

  parametros.set('status', filtros.status);
  parametros.set('estoque', filtros.estoque);
  return parametros.toString();
}

/** RF0015: sem filtros, o acervo inteiro, ativos e inativos. */
export async function listarDiscos(filtros?: FiltrosDiscos): Promise<Disco[]> {
  const brutos = await requisitar<DiscoApi[]>(filtros ? `/discos?${comoQuery(filtros)}` : '/discos');
  return brutos.map(paraDisco);
}

/** RF0011: o disco nasce ativo, sem estoque e sem preço (RN0013). */
export async function cadastrarDisco(valores: FormDiscoValues): Promise<Disco> {
  const bruto = await requisitar<DiscoApi>('/discos', {
    method: 'POST',
    body: JSON.stringify(paraPayload(valores, null)),
  });
  return paraDisco(bruto);
}

/** RF0014 + RN0014 */
export async function alterarDisco(
  id: number,
  valores: FormDiscoValues,
  capaMiniaturaUrl: string | null,
): Promise<Disco> {
  const bruto = await requisitar<DiscoApi>(`/discos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(paraPayload(valores, capaMiniaturaUrl)),
  });
  return paraDisco(bruto);
}

/** RF0012 + RN0015 na inativação, RF0016 + RN0017 na ativação. */
export async function alterarStatusDisco(
  id: number,
  ativar: boolean,
  categoria: string,
  justificativa: string,
): Promise<void> {
  await requisitar<unknown>(`/discos/${id}/${ativar ? 'ativacao' : 'inativacao'}`, {
    method: 'PUT',
    body: JSON.stringify({ motivoStatus: { categoria: { desc: categoria }, justificativa } }),
  });
}

/** RF0013 + RN0016: devolve os discos que a rotina inativou agora. */
export async function rodarInativacaoAutomatica(): Promise<Disco[]> {
  const brutos = await requisitar<DiscoApi[]>('/discos/inativacao-automatica', { method: 'POST' });
  return brutos.map(paraDisco);
}
