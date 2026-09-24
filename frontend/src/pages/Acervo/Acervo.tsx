import styles from './Acervo.module.scss';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Checkbox, NumberInput, SegmentedControl } from '@mantine/core';
import type { FiltrosDiscos } from '../../types/inventario';
import {
  buscarNoAcervo,
  filtrarDiscos,
  filtrarPorCategorias,
  filtrarPorFormatos,
  FILTROS_DISCOS_VAZIOS,
} from '../../utils/filtrarDiscos';
import {
  agruparCatalogo,
  discosNaVitrine,
  nomeFormato,
  ordenarDiscos,
  rotuloDecada,
} from '../../utils/catalogo';
import type { OrdemAcervo } from '../../utils/catalogo';
import { useLoja } from '../../contexts/loja';
import VinylCard from '../../components/VinylCard/VinylCard';
import Forma from '../../components/Forma/Forma';
import { Close } from '@carbon/icons-react';

const ORDENS: { value: OrdemAcervo; label: string }[] = [
  { value: 'relevancia', label: 'Relevância' },
  { value: 'menor-preco', label: 'Menor preço' },
  { value: 'mais-recentes', label: 'Mais recentes' },
];

interface Chip {
  rotulo: string;
  remover: string[];
}

function Acervo() {
  const { discos } = useLoja();
  // todo filtro mora na URL: a busca do header e os atalhos da Home chegam por ela
  const [parametros, setParametros] = useSearchParams();

  const busca = parametros.get('busca') ?? '';
  // um parâmetro por gênero, e não lista com vírgula: há gênero com vírgula no nome
  const categorias = useMemo(() => parametros.getAll('categoria'), [parametros]);
  const formatoParam = parametros.get('formato') ?? '';
  const formatos = useMemo(() => formatoParam.split(',').filter(Boolean), [formatoParam]);
  const anoMin = parametros.get('anoMin') ?? '';
  const anoMax = parametros.get('anoMax') ?? '';
  const precoMin = parametros.get('precoMin') ?? '';
  const precoMax = parametros.get('precoMax') ?? '';
  const ordem = (parametros.get('ordem') as OrdemAcervo | null) ?? 'relevancia';

  const vitrine = useMemo(() => discosNaVitrine(discos), [discos]);
  const generos = useMemo(() => agruparCatalogo(discos, 'genero'), [discos]);
  const formatosDisponiveis = useMemo(() => agruparCatalogo(discos, 'formato'), [discos]);
  // o atalho "Por década" da Home chega como um intervalo fechado de dez anos
  const decadaSelecionada =
    anoMin && anoMax && Number(anoMin) % 10 === 0 && Number(anoMax) === Number(anoMin) + 9
      ? Number(anoMin)
      : undefined;

  const resultado = useMemo(() => {
    const filtros: FiltrosDiscos = {
      ...FILTROS_DISCOS_VAZIOS,
      status: 'ativos',
      anoMin,
      anoMax,
      precoMin,
      precoMax,
    };
    const filtrados = filtrarPorCategorias(
      filtrarPorFormatos(buscarNoAcervo(filtrarDiscos(vitrine, filtros), busca), formatos),
      categorias,
    );
    return ordenarDiscos(filtrados, ordem);
  }, [vitrine, busca, categorias, formatos, anoMin, anoMax, precoMin, precoMax, ordem]);

  function alterar(mudancas: Record<string, string | null>): void {
    const proximos = new URLSearchParams(parametros);
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) proximos.set(chave, valor);
      else proximos.delete(chave);
    }
    setParametros(proximos, { replace: true });
  }

  function alternarFormato(formatoId: string): void {
    const proximos = formatos.includes(formatoId)
      ? formatos.filter((id) => id !== formatoId)
      : [...formatos, formatoId];
    alterar({ formato: proximos.join(',') || null });
  }

  function alternarCategoria(nome: string): void {
    const selecionadas = categorias.includes(nome)
      ? categorias.filter((categoria) => categoria !== nome)
      : [...categorias, nome];
    const proximos = new URLSearchParams(parametros);
    proximos.delete('categoria');
    selecionadas.forEach((categoria) => proximos.append('categoria', categoria));
    setParametros(proximos, { replace: true });
  }

  function limparFiltros(): void {
    setParametros(ordem === 'relevancia' ? {} : { ordem }, { replace: true });
  }

  const chips: Chip[] = [
    ...(busca ? [{ rotulo: `“${busca}”`, remover: ['busca'] }] : []),
    ...categorias.map((nome) => ({ rotulo: nome, remover: [`categoria:${nome}`] })),
    ...formatos.map((id) => ({ rotulo: nomeFormato(id), remover: [`formato:${id}`] })),
    ...(anoMin || anoMax
      ? [
          {
            rotulo:
              decadaSelecionada !== undefined
                ? rotuloDecada(decadaSelecionada)
                : `${anoMin || '…'}–${anoMax || '…'}`,
            remover: ['anoMin', 'anoMax'],
          },
        ]
      : []),
    ...(precoMin || precoMax
      ? [{ rotulo: `R$ ${precoMin || '0'} – ${precoMax || '…'}`, remover: ['precoMin', 'precoMax'] }]
      : []),
  ];

  function removerChip(chip: Chip): void {
    const [primeiro] = chip.remover;
    if (primeiro.startsWith('formato:')) {
      alternarFormato(primeiro.slice('formato:'.length));
      return;
    }
    if (primeiro.startsWith('categoria:')) {
      alternarCategoria(primeiro.slice('categoria:'.length));
      return;
    }
    alterar(Object.fromEntries(chip.remover.map((chave) => [chave, null])));
  }

  return (
    <main className={styles.main}>
      <div className={styles.cabecalho}>
        <h1>Acervo</h1>
        <span className={styles.contagem}>
          {resultado.length} {resultado.length === 1 ? 'disco' : 'discos'}
        </span>
      </div>

      <div className={styles.layout}>
        <aside className={styles.aside}>
          <div className={styles.grupoFiltro}>
            <span className={styles.tituloFiltro}>Gênero</span>
            {generos.map((grupo) => (
              <Checkbox
                key={grupo.nome}
                label={`${grupo.nome} (${grupo.discos.length})`}
                checked={categorias.includes(grupo.nome)}
                onChange={() => alternarCategoria(grupo.nome)}
              />
            ))}
          </div>

          <div className={styles.grupoFiltro}>
            <span className={styles.tituloFiltro}>Formato</span>
            {formatosDisponiveis.map((grupo) => {
              const formatoId = grupo.filtro.formato;
              return (
                <Checkbox
                  key={formatoId}
                  label={`${grupo.nome} (${grupo.discos.length})`}
                  checked={formatos.includes(formatoId)}
                  onChange={() => alternarFormato(formatoId)}
                />
              );
            })}
          </div>

          <div className={styles.grupoFiltro}>
            <span className={styles.tituloFiltro}>Ano de lançamento</span>
            <div className={styles.faixaPreco}>
              <NumberInput
                size="sm"
                placeholder="1960"
                hideControls
                allowDecimal={false}
                thousandSeparator={false}
                min={1900}
                max={2100}
                aria-label="Ano inicial"
                value={anoMin}
                onChange={(valor) => alterar({ anoMin: String(valor) })}
              />
              <span>–</span>
              <NumberInput
                size="sm"
                placeholder="2026"
                hideControls
                allowDecimal={false}
                thousandSeparator={false}
                min={1900}
                max={2100}
                aria-label="Ano final"
                value={anoMax}
                onChange={(valor) => alterar({ anoMax: String(valor) })}
              />
            </div>
          </div>

          <div className={styles.grupoFiltro}>
            <span className={styles.tituloFiltro}>Preço</span>
            <div className={styles.faixaPreco}>
              <NumberInput
                size="sm"
                placeholder="R$ 0"
                prefix="R$ "
                hideControls
                min={0}
                aria-label="Preço mínimo"
                value={precoMin}
                onChange={(valor) => alterar({ precoMin: String(valor) })}
              />
              <span>–</span>
              <NumberInput
                size="sm"
                placeholder="R$ 500"
                prefix="R$ "
                hideControls
                min={0}
                aria-label="Preço máximo"
                value={precoMax}
                onChange={(valor) => alterar({ precoMax: String(valor) })}
              />
            </div>
          </div>
        </aside>

        <div className={styles.conteudo}>
          <div className={styles.barra}>
            <div className={styles.chips}>
              {chips.map((chip) => (
                <button
                  key={chip.rotulo}
                  type="button"
                  className={styles.chip}
                  onClick={() => removerChip(chip)}
                  aria-label={`Remover filtro ${chip.rotulo}`}
                >
                  {chip.rotulo} <Close size={16} aria-hidden />
                </button>
              ))}
            </div>
            <SegmentedControl
              size="xs"
              value={ordem}
              data={ORDENS}
              onChange={(valor) => alterar({ ordem: valor === 'relevancia' ? null : valor })}
            />
          </div>

          {resultado.length === 0 ? (
            <div className={styles.vazio}>
              <div className={styles.formaVazio}>
                <Forma tipo="gota" paleta="laranja" />
              </div>
              <strong>Nenhum disco com esses filtros.</strong>
              <button type="button" className={styles.limpar} onClick={limparFiltros}>
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className={styles.grade}>
              {resultado.map((disco) => (
                <VinylCard key={disco.id} disco={disco} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default Acervo;
