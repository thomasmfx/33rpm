// Gera a carga do acervo a partir dos mocks do front, para o backend cadastrar os
// discos pelas próprias regras (RF0011, RF0051) em vez de inserir direto no banco.
//
//   cd frontend && node --experimental-strip-types scripts/gerar-acervo.mjs
//
// Escreve backend/src/main/resources/carga/acervo.json e imprime no terminal o
// bloco de artistas, gravadoras e categorias que entra em db/seed.sql (RNF0013).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { discosMock } from '../src/utils/discosMock.ts';
import { entradasEstoqueMock } from '../src/utils/estoqueMock.ts';
import {
  EDICOES,
  FORMATOS_DISCO,
  FORNECEDORES,
  GENEROS,
  GRUPOS_PRECIFICACAO,
} from '../src/types/inventario.ts';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const destino = resolve(raiz, 'backend/src/main/resources/carga/acervo.json');

const formatoPorId = new Map(FORMATOS_DISCO.map((formato) => [formato.id, formato.nome]));
const edicaoPorId = new Map(EDICOES.map((edicao) => [edicao.id, edicao.nome]));
const grupoPorId = new Map(GRUPOS_PRECIFICACAO.map((grupo) => [grupo.id, grupo]));

const arredondar = (valor) => Math.round(valor * 100) / 100;
const avisos = [];

// 57279 nunca teve entrada no mock: o custo sai do preço pela inversa da RF0052
function entradaReconstruida(disco, grupo) {
  return {
    quantidade: disco.estoque,
    valorCusto: arredondar(disco.price / (1 + grupo.margemLucro / 100)),
    fornecedor: { nome: FORNECEDORES[0] },
    dataEntrada: '2026-01-15',
  };
}

const itens = discosMock.map((disco) => {
  const grupo = grupoPorId.get(disco.grupoPrecificacaoId);
  const entradas = entradasEstoqueMock
    .filter((entrada) => entrada.discoId === disco.id)
    .sort((a, b) => a.dataEntrada.localeCompare(b.dataEntrada))
    .map((entrada) => ({
      quantidade: entrada.quantidade,
      valorCusto: entrada.valorCusto,
      fornecedor: { nome: entrada.fornecedor },
      dataEntrada: entrada.dataEntrada,
    }));
  if (entradas.length === 0) entradas.push(entradaReconstruida(disco, grupo));

  const maiorCusto = Math.max(...entradas.map((entrada) => entrada.valorCusto));
  const sugerido = arredondar(maiorCusto * (1 + grupo.margemLucro / 100));
  if (Math.abs(sugerido - disco.price) > 0.01 && !disco.autorizacaoGerente) {
    avisos.push(`${disco.id} ${disco.title}: preço ${disco.price} fora da margem (${sugerido})`);
  }

  return {
    disco: {
      titulo: disco.title,
      artista: { nome: disco.artist },
      gravadora: { nome: disco.gravadora },
      anoLancamento: `${disco.releaseYear}-01-01`,
      categorias: [
        ...disco.genres.map((desc) => ({ desc, tipo: 'genero' })),
        ...disco.styles.map((desc) => ({ desc, tipo: 'estilo' })),
      ],
      edicoes: disco.edicaoIds.map((id) => ({ nome: edicaoPorId.get(id) })),
      formato: { nome: formatoPorId.get(disco.formatoId) },
      grupoPrecificacao: { nome: grupo.nome },
      codigoCatalogo: disco.codigoCatalogo,
      codigoBarras: disco.codigoBarras,
      numeroFaixas: disco.numeroFaixas,
      duracao: disco.duracao,
      descricao: disco.descricao,
      altura: disco.dimensoes.altura,
      largura: disco.dimensoes.largura,
      profundidade: disco.dimensoes.profundidade,
      peso: disco.dimensoes.peso,
      capaUrl: disco.coverSrc,
      capaMiniaturaUrl: disco.coverThumb ?? null,
    },
    entradas,
    precoVenda: disco.price,
    autorizacaoGerente: disco.autorizacaoGerente,
    inativacao: disco.isAtivo
      ? null
      : {
          categoria: { desc: disco.motivoStatus.categoria, tipo: 'inativacao' },
          justificativa: disco.motivoStatus.justificativa,
        },
  };
});

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, `${JSON.stringify(itens, null, 2)}\n`);

const unicos = (valores) => [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
const literal = (texto) => `'${texto.replaceAll("'", "''")}'`;
const valores = (lista, formatar) => lista.map((item) => `    (${formatar(item)})`).join(',\n');

const artistas = unicos(discosMock.map((disco) => disco.artist));
const gravadoras = unicos(discosMock.map((disco) => disco.gravadora));
const generos = unicos([...GENEROS, ...discosMock.flatMap((disco) => disco.genres)]);
const estilos = unicos(discosMock.flatMap((disco) => disco.styles));

console.log(`-- gerado por frontend/scripts/gerar-acervo.mjs a partir do acervo do mock
INSERT INTO artista (nome) VALUES
${valores(artistas, literal)};

INSERT INTO gravadora (nome) VALUES
${valores(gravadoras, literal)};

INSERT INTO categoria (desc_categoria, tipo) VALUES
${valores(generos, (genero) => `${literal(genero)}, 'genero'`)},
${valores(estilos, (estilo) => `${literal(estilo)}, 'estilo'`)};`);

const totalEntradas = itens.reduce((soma, item) => soma + item.entradas.length, 0);
console.error(
  `\n${itens.length} discos, ${totalEntradas} entradas, ${artistas.length} artistas, ` +
    `${gravadoras.length} gravadoras, ${generos.length} gêneros, ${estilos.length} estilos → ${destino}`,
);
avisos.forEach((aviso) => console.error(`AVISO ${aviso}`));
