import type { Disco } from '../types/disco';
import type { FiltrosDiscos } from '../types/inventario';
import { contemDigitos, contemTexto, normalizar } from './texto';

export const FILTROS_DISCOS_VAZIOS: FiltrosDiscos = {
  titulo: '',
  formatoId: '',
  artista: '',
  gravadora: '',
  categoria: '',
  codigo: '',
  anoMin: '',
  anoMax: '',
  precoMin: '',
  precoMax: '',
  grupoPrecificacaoId: '',
  status: 'todos',
  estoque: 'todos',
};

/** RN0012: o filtro de categoria varre gêneros e estilos, que são vários. */
function temCategoria(disco: Disco, termo: string): boolean {
  if (!termo.trim()) return true;
  const alvo = normalizar(termo);
  return [...disco.genres, ...disco.styles].some((categoria) =>
    normalizar(categoria).includes(alvo),
  );
}

function dentroDoIntervalo(
  valor: number,
  minimo: string,
  maximo: string,
): boolean {
  const min = minimo.trim() === '' ? null : Number(minimo);
  const max = maximo.trim() === '' ? null : Number(maximo);

  if (min !== null && !Number.isNaN(min) && valor < min) return false;
  if (max !== null && !Number.isNaN(max) && valor > max) return false;
  return true;
}

/** RF0015: filtros combinados ou isolados sobre qualquer campo de identificação. */
export function filtrarDiscos(
  discos: Disco[],
  filtros: FiltrosDiscos,
): Disco[] {
  return discos.filter(
    (disco) =>
      contemTexto(disco.title, filtros.titulo) &&
      contemTexto(disco.artist, filtros.artista) &&
      contemTexto(disco.gravadora, filtros.gravadora) &&
      (filtros.formatoId === '' || disco.formatoId === filtros.formatoId) &&
      temCategoria(disco, filtros.categoria) &&
      (contemTexto(disco.codigoCatalogo, filtros.codigo) ||
        contemDigitos(disco.codigoBarras, filtros.codigo)) &&
      dentroDoIntervalo(disco.releaseYear, filtros.anoMin, filtros.anoMax) &&
      dentroDoIntervalo(disco.price, filtros.precoMin, filtros.precoMax) &&
      (filtros.grupoPrecificacaoId === '' ||
        disco.grupoPrecificacaoId === filtros.grupoPrecificacaoId) &&
      (filtros.status === 'todos' ||
        disco.isAtivo === (filtros.status === 'ativos')) &&
      (filtros.estoque === 'todos' ||
        (filtros.estoque === 'disponivel'
          ? disco.estoque > 0
          : disco.estoque === 0)),
  );
}

// Conta apenas os critérios do popover — o título fica na barra de busca
export function contarFiltrosDiscosAtivos(filtros: FiltrosDiscos): number {
  const criterios = [
    filtros.artista.trim() !== '',
    filtros.gravadora.trim() !== '',
    filtros.formatoId !== '',
    filtros.categoria.trim() !== '',
    filtros.codigo.trim() !== '',
    filtros.anoMin.trim() !== '' || filtros.anoMax.trim() !== '',
    filtros.precoMin.trim() !== '' || filtros.precoMax.trim() !== '',
    filtros.grupoPrecificacaoId !== '',
    filtros.status !== 'todos',
    filtros.estoque !== 'todos',
  ];

  return criterios.filter(Boolean).length;
}

/** Busca da loja: o mesmo termo procura no título, no artista e na gravadora. */
export function buscarNoAcervo(discos: Disco[], termo: string): Disco[] {
  if (!termo.trim()) return discos;
  return discos.filter(
    (disco) =>
      contemTexto(disco.title, termo) ||
      contemTexto(disco.artist, termo) ||
      contemTexto(disco.gravadora, termo),
  );
}

/** Gêneros marcados no acervo se somam: basta o disco ter um deles. Lista vazia não filtra. */
export function filtrarPorCategorias(discos: Disco[], categorias: string[]): Disco[] {
  return categorias.length === 0
    ? discos
    : discos.filter((disco) => categorias.some((categoria) => temCategoria(disco, categoria)));
}

/** O acervo deixa marcar mais de um formato; lista vazia não filtra. */
export function filtrarPorFormatos(discos: Disco[], formatoIds: string[]): Disco[] {
  return formatoIds.length === 0
    ? discos
    : discos.filter((disco) => formatoIds.includes(disco.formatoId));
}

/** Busca da curadoria: título, artista ou código de catálogo. */
export function buscarNoInventario(discos: Disco[], termo: string): Disco[] {
  if (!termo.trim()) return discos;
  return discos.filter((disco) =>
    [disco.title, disco.artist, disco.codigoCatalogo].some((campo) => contemTexto(campo, termo)),
  );
}
