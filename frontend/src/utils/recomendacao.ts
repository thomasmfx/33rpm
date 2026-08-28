import type { Disco } from '../types/disco';
import type { ItemPedido, Pedido } from '../types/pedido';
import { discosMock } from './discosMock';
import { pedidosDoCliente } from './pedido';
import { contemTexto, normalizar } from './texto';

export interface Recomendacao {
  disco: Disco;
  motivo: string;
}

export interface Intencao {
  categorias: string[];
  faixaPreco: [number, number] | null;
  artista: string | null;
}

/** RNF0044: moods mapeados para estilos do acervo, a "alma" do projeto. */
/** Casado por radical: 'trein' pega treino, treinar e treinando. */
const MOODS: { radicais: string[]; categorias: string[] }[] = [
  { radicais: ['chuva', 'chuvos', 'melancol', 'triste', 'saudade'], categorias: ['Neo Soul', 'Soul', 'Jazzy Hip-Hop'] },
  { radicais: ['trein', 'malha', 'academia', 'corr', 'energia'], categorias: ['Trap', 'Thrash', 'Speed Metal'] },
  { radicais: ['viag', 'estrada', 'viaj', 'roadtrip'], categorias: ['Psychedelic Rock', 'Indie Rock'] },
  { radicais: ['festa', 'balada', 'danc', 'danç'], categorias: ['Reggaeton', 'Disco', 'Pop Rap'] },
  { radicais: ['foco', 'estud', 'trabalh', 'concentr'], categorias: ['Psychedelic', 'Prog Rock'] },
  { radicais: ['relax', 'calm', 'dormi', 'domingo'], categorias: ['Neo Soul', 'Soul', 'Psychedelic'] },
];

// Vocabulário do acervo: interpretar() não recebe os discos, então parte do
// catálogo base para reconhecer gêneros, estilos e artistas na mensagem.
const CATEGORIAS_ACERVO = Array.from(
  new Set(discosMock.flatMap((disco) => [...disco.genres, ...disco.styles])),
);
const ARTISTAS_ACERVO = Array.from(new Set(discosMock.map((disco) => disco.artist)));

const PENALIDADE_JA_COMPRADO = -100;
const PESO_CATEGORIA = 3;
const PESO_HISTORICO = 1;

function extrairFaixaPreco(mensagem: string): [number, number] | null {
  const texto = normalizar(mensagem);

  const entre = texto.match(/entre\s+(\d+)\s+e\s+(\d+)/);
  if (entre) return [Number(entre[1]), Number(entre[2])];

  const ate = texto.match(/(?:ate|abaixo de)\s+(\d+)/);
  if (ate) return [0, Number(ate[1])];

  const menosDe = texto.match(/menos de\s+(\d+)/);
  if (menosDe) return [0, Number(menosDe[1])];

  return null;
}

export function interpretar(mensagem: string): Intencao {
  const categoriasDiretas = CATEGORIAS_ACERVO.filter((categoria) =>
    contemTexto(mensagem, categoria),
  );
  const categoriasDeMood = MOODS.filter((mood) =>
    mood.radicais.some((radical) => normalizar(mensagem).includes(radical)),
  ).flatMap((mood) => mood.categorias);

  const categorias = Array.from(new Set([...categoriasDiretas, ...categoriasDeMood]));
  const artista = ARTISTAS_ACERVO.find((nome) => contemTexto(mensagem, nome)) ?? null;

  return { categorias, faixaPreco: extrairFaixaPreco(mensagem), artista };
}

function categoriasCompartilhadas(disco: Disco, categorias: string[]): string[] {
  const categoriasDoDisco = [...disco.genres, ...disco.styles].map(normalizar);
  return categorias.filter((categoria) => categoriasDoDisco.includes(normalizar(categoria)));
}

function compraComGeneroEmComum(
  disco: Disco,
  itensComprados: ItemPedido[],
  discos: Disco[],
): ItemPedido | undefined {
  const categoriasDoDisco = [...disco.genres, ...disco.styles].map(normalizar);
  return itensComprados.find((item) => {
    const discoComprado = discos.find((candidato) => candidato.id === item.discoId);
    if (!discoComprado) return false;
    return [...discoComprado.genres, ...discoComprado.styles].some((categoria) =>
      categoriasDoDisco.includes(normalizar(categoria)),
    );
  });
}

function motivoRecomendacao(
  categoriasCasadas: string[],
  compraEmComum: ItemPedido | undefined,
  intencao: Intencao,
): string {
  if (categoriasCasadas.length > 0) return `Casa com o ${categoriasCasadas[0]} que você pediu`;
  if (compraEmComum) return `Você comprou ${compraEmComum.artista} antes`;
  if (intencao.artista) return `É um álbum de ${intencao.artista}, como você pediu`;
  if (intencao.faixaPreco) return 'Está dentro da faixa de preço que você pediu';
  return 'Um dos mais vendidos do nosso acervo';
}

export function recomendar(
  discos: Disco[],
  pedidos: Pedido[],
  clienteId: string | null,
  intencao: Intencao,
  limite: number,
): Recomendacao[] {
  const itensComprados = clienteId
    ? pedidosDoCliente(pedidos, clienteId).flatMap((pedido) => pedido.itens)
    : [];
  const idsComprados = new Set(itensComprados.map((item) => item.discoId));

  let candidatos = discos.filter((disco) => disco.isAtivo && disco.estoque > 0);

  if (intencao.artista) {
    const artistaBuscado = normalizar(intencao.artista);
    candidatos = candidatos.filter((disco) => normalizar(disco.artist) === artistaBuscado);
  }

  if (intencao.faixaPreco) {
    const [min, max] = intencao.faixaPreco;
    candidatos = candidatos.filter((disco) => disco.price >= min && disco.price <= max);
  }

  const pontuados = candidatos.map((disco) => {
    const categoriasCasadas = categoriasCompartilhadas(disco, intencao.categorias);
    const compraEmComum = compraComGeneroEmComum(disco, itensComprados, discos);
    const jaComprou = idsComprados.has(disco.id);
    const score =
      categoriasCasadas.length * PESO_CATEGORIA +
      (compraEmComum ? PESO_HISTORICO : 0) +
      (jaComprou ? PENALIDADE_JA_COMPRADO : 0);

    return { disco, score, categoriasCasadas, compraEmComum, jaComprou };
  });

  pontuados.sort((a, b) => b.score - a.score || b.disco.numForSale - a.disco.numForSale);

  return pontuados
    .slice(0, limite)
    .map(({ disco, categoriasCasadas, compraEmComum, jaComprou }) => ({
      disco,
      motivo: jaComprou
        ? 'Você já levou este — vale reprensar a coleção'
        : motivoRecomendacao(categoriasCasadas, compraEmComum, intencao),
    }));
}
