import styles from './Home.module.scss';
import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLoja } from '../../contexts/loja';
import VinylCard from '../../components/VinylCard/VinylCard';
import Capa from '../../components/Capa/Capa';
import CabecalhoSecao from '../../components/CabecalhoSecao/CabecalhoSecao';
import Forma, { Ondas } from '../../components/Forma/Forma';
import Vinil from '../../components/Vinil/Vinil';
import { ArrowDown, ArrowLeft, ArrowRight, Checkmark, Shuffle } from '@carbon/icons-react';
import {
  agruparCatalogo,
  decadasDoAcervo,
  discosEmAlta,
  discosMaisVendidos,
  discosNaVitrine,
  discosNovidades,
  nomeFormato,
} from '../../utils/catalogo';
import type { EixoCatalogo } from '../../utils/catalogo';
import { formatarPrecoCurto } from '../../utils/precificacao';

// estilo abre a lista: gênero repete demais os discos que a vitrine já mostrou
const EIXOS: { eixo: EixoCatalogo; rotulo: string }[] = [
  { eixo: 'estilo', rotulo: 'Estilo' },
  { eixo: 'genero', rotulo: 'Gênero' },
  { eixo: 'decada', rotulo: 'Década' },
  { eixo: 'edicao', rotulo: 'Edição' },
  { eixo: 'formato', rotulo: 'Formato' },
];

// posições [left, top, rotação] da pilha de capas: fechada e aberta em leque
const LEQUE_FECHADO = [['8%', '24%', '-8deg'], ['21%', '12%', '-1deg'], ['34%', '30%', '7deg']];
const LEQUE_ABERTO = [['0%', '30%', '-14deg'], ['21%', '4%', '-2deg'], ['42%', '36%', '11deg']];
const PILHA = [['0%', '22%', '-9deg'], ['19%', '6%', '-1deg'], ['38%', '26%', '8deg']];

// mesma conta do $grupos-visiveis do módulo: a lista reserva a altura de 7 linhas
const GRUPOS_VISIVEIS = 7;

function contagem(total: number): string {
  return `${total} ${total === 1 ? 'disco' : 'discos'}`;
}

function rotuloAdicionar(noCarrinho: boolean, estoque: number): ReactNode {
  if (noCarrinho) {
    return (
      <>
        <Checkmark size={16} /> No carrinho
      </>
    );
  }
  return estoque === 0 ? 'Esgotado' : 'Adicionar';
}

function paraAcervo(filtro: Record<string, string>): string {
  const busca = new URLSearchParams(filtro).toString();
  return busca ? `/acervo?${busca}` : '/acervo';
}

function Home() {
  const { discos, carrinho, adicionarAoCarrinho } = useLoja();
  const navegar = useNavigate();
  const categoriasRef = useRef<HTMLElement>(null);
  const novidadesRef = useRef<HTMLDivElement>(null);
  const [isLequeAberto, setIsLequeAberto] = useState(false);
  const [eixo, setEixo] = useState<EixoCatalogo>('estilo');
  const [grupoEmFoco, setGrupoEmFoco] = useState<string | null>(null);
  // sorteado a cada visita: o garimpo não pode abrir sempre no mesmo disco
  const [indiceGarimpo, setIndiceGarimpo] = useState(() => Math.floor(Math.random() * 1000));

  const vitrine = useMemo(() => discosNaVitrine(discos), [discos]);
  const emAlta = useMemo(() => discosEmAlta(discos), [discos]);
  const maisVendidos = useMemo(() => discosMaisVendidos(discos).slice(0, 5), [discos]);
  const novidades = useMemo(() => discosNovidades(discos), [discos]);
  const grupos = useMemo(() => agruparCatalogo(discos, eixo).slice(0, GRUPOS_VISIVEIS), [discos, eixo]);

  const artistas = useMemo(
    () => [...new Set(vitrine.map((disco) => disco.artist.toUpperCase()))],
    [vitrine],
  );

  // só as cinco décadas mais recentes: as mais antigas ficam no filtro do acervo
  const decadas = useMemo(() => decadasDoAcervo(discos).slice(-5), [discos]);

  if (vitrine.length === 0) return null;

  const [destaque, ...restoEmAlta] = emAlta;
  const capasHero = emAlta.slice(1, 4);
  const garimpo = vitrine[indiceGarimpo % vitrine.length];
  const grupoSelecionado =
    grupos.find((grupo) => grupo.nome === grupoEmFoco) ?? grupos[0];
  const leque = isLequeAberto ? LEQUE_ABERTO : LEQUE_FECHADO;

  function sortearGarimpo(): void {
    const atual = indiceGarimpo % vitrine.length;
    let proximo = atual;
    while (vitrine.length > 1 && proximo === atual) {
      proximo = Math.floor(Math.random() * vitrine.length);
    }
    setIndiceGarimpo(proximo);
  }

  function rolarNovidades(sentido: 1 | -1): void {
    const trilho = novidadesRef.current;
    trilho?.scrollBy({ left: sentido * trilho.clientWidth, behavior: 'smooth' });
  }

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.fundo}>
          <Ondas cor="#141413" linhas={16} opacidade={0.1} amplitude={46} />
        </div>
        <div className={styles.formaRoda}>
          <Forma tipo="roda" paleta="nevoa" giro={80} />
        </div>
        <div className={styles.formaFlor}>
          <Forma tipo="flor" paleta="laranja" giro={50} />
        </div>
        <div className={styles.formaEstrela}>
          <Forma tipo="estrela8" paleta="carvao" />
        </div>

        <div className={styles.heroGrade}>
          <div className={styles.heroTexto}>
            <span className={styles.rotulo}>33⅓ rotações por minuto</span>
            <h1 className={styles.heroTitulo}>
              <span>O acervo da sua</span>
              <span className={styles.leve}>estética</span>
              <span className={styles.contorno}>sonora</span>
            </h1>
            <p className={styles.heroLinha}>
              A música em sua forma atemporal. Cultive as sonoridades que você já ama e
              abra espaço para o inesperado.
            </p>
            <div className={styles.chamada}>
            <div className={styles.heroAcoes}>
              <button type="button" className={styles.botaoPrimario} onClick={() => navegar('/acervo')}>
                Explorar o acervo
              </button>
              <button
                type="button"
                className={styles.botaoContorno}
                onClick={() =>
                  categoriasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                Ver categorias <ArrowDown size={16} />
              </button>
            </div>
            <div className={styles.garimpo}>
              <Link to={`/disco/${garimpo.id}`} className={styles.garimpoCapa}>
                <img src={garimpo.coverThumb ?? garimpo.coverSrc} alt={garimpo.title} />
              </Link>
              <Link to={`/disco/${garimpo.id}`} className={styles.garimpoTexto}>
                <span className={styles.garimpoRotulo}>Garimpo aleatório</span>
                <strong className={styles.garimpoTitulo}>{garimpo.title}</strong>
                <span className={styles.garimpoArtista}>{garimpo.artist}</span>
              </Link>
              <button
                type="button"
                className={styles.sortear}
                aria-label="Sortear outro disco"
                title="Sortear outro disco"
                onClick={sortearGarimpo}
              >
                <Shuffle size={20} />
              </button>
            </div>
            </div>
          </div>

          <div
            className={styles.leque}
            onMouseEnter={() => setIsLequeAberto(true)}
            onMouseLeave={() => setIsLequeAberto(false)}
          >
            <Vinil girando segundosPorVolta={12} className={styles.vinilGirando} />
            {capasHero.map((disco, indice) => (
              <Link
                key={disco.id}
                to={`/disco/${disco.id}`}
                className={styles.capaLeque}
                style={{
                  left: leque[indice][0],
                  top: leque[indice][1],
                  transform: `rotate(${leque[indice][2]})`,
                  zIndex: indice + 1,
                }}
              >
                <Capa src={disco.coverSrc} alt={disco.title} />
              </Link>
            ))}
          </div>
        </div>

      </section>

      <div className={styles.letreiro} aria-hidden>
        <div className={styles.letreiroTrilho}>
          {[0, 1].map((copia) => (
            <div key={copia} className={styles.letreiroLinha}>
              {['No acervo', ...artistas].map((texto) => (
                <span key={texto} className={styles.letreiroItem}>
                  {texto}
                  <span className={styles.letreiroPonto} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className={`${styles.secao} ${styles.secaoInicial}`}>
        <CabecalhoSecao
          numero="01"
          titulo="Em alta"
          acao={
            <Link to="/acervo" className={styles.linkSecao}>
              Ver o acervo <ArrowRight size={16} />
            </Link>
          }
        />
        <div className={styles.gradeEmAlta}>
          <div className={styles.destaque}>
            <VinylCard disco={destaque} destaque hover="escala" />
          </div>
          {restoEmAlta.slice(0, 4).map((disco) => (
            <VinylCard key={disco.id} disco={disco} hover="escala" />
          ))}
        </div>
      </section>

      <section ref={categoriasRef} className={styles.categorias}>
        <div className={styles.fundo}>
          <Ondas cor="#141413" linhas={10} opacidade={0.08} amplitude={60} />
        </div>
        <div className={styles.formaLaco}>
          <Forma tipo="laco" paleta="laranja" />
        </div>
        <div className={styles.formaPontos}>
          <Forma tipo="pontos" paleta="carvao" />
        </div>

        <div className={styles.categoriasConteudo}>
          <CabecalhoSecao
            numero="02"
            titulo="Categorias"
            acao={
              <div className={styles.eixos} role="tablist">
                {EIXOS.map((opcao) => (
                  <button
                    key={opcao.eixo}
                    type="button"
                    role="tab"
                    aria-selected={opcao.eixo === eixo}
                    className={styles.eixo}
                    onClick={() => {
                      setEixo(opcao.eixo);
                      setGrupoEmFoco(null);
                    }}
                  >
                    {opcao.rotulo}
                  </button>
                ))}
              </div>
            }
          />

          <div className={styles.categoriasGrade}>
            <div className={styles.listaGrupos}>
              {grupos.map((grupo, indice) => (
                <Link
                  key={grupo.nome}
                  to={paraAcervo(grupo.filtro)}
                  className={styles.grupo}
                  data-ativo={grupo.nome === grupoSelecionado?.nome || undefined}
                  onMouseEnter={() => setGrupoEmFoco(grupo.nome)}
                  onFocus={() => setGrupoEmFoco(grupo.nome)}
                >
                  <span className={styles.grupoNumero}>{String(indice + 1).padStart(2, '0')}</span>
                  <span className={styles.grupoNome}>{grupo.nome}</span>
                  <span className={styles.grupoContagem}>{contagem(grupo.discos.length)}</span>
                  <span className={styles.grupoSeta}>
                    <ArrowRight size={24} />
                  </span>
                </Link>
              ))}
            </div>

            {grupoSelecionado && (
              <div className={styles.pilhaPainel}>
                <div className={styles.pilha}>
                  {grupoSelecionado.discos.slice(0, 3).map((disco, indice) => (
                    <img
                      key={disco.id}
                      src={disco.coverSrc}
                      alt=""
                      className={styles.capaPilha}
                      style={{
                        left: PILHA[indice][0],
                        top: PILHA[indice][1],
                        transform: `rotate(${PILHA[indice][2]})`,
                        zIndex: indice + 1,
                      }}
                    />
                  ))}
                </div>
                <div className={styles.pilhaLegenda}>
                  <strong>{grupoSelecionado.nome}</strong>
                  <span>
                    {contagem(grupoSelecionado.discos.length)} · a partir de{' '}
                    {formatarPrecoCurto(Math.min(...grupoSelecionado.discos.map((disco) => disco.price)))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.maisVendidos}>
        <div className={styles.maisVendidosIntro}>
          <CabecalhoSecao numero="03" titulo="Mais vendidos" />
          <p>Os discos que mais saíram do acervo nos últimos 30 dias.</p>
        </div>
        <div className={styles.ranking}>
          {maisVendidos.map((disco, indice) => {
            const noCarrinho = carrinho.some((item) => item.discoId === disco.id);
            return (
              <div key={disco.id} className={styles.posicao}>
                <span className={styles.posicaoNumero}>{String(indice + 1).padStart(2, '0')}</span>
                <Link to={`/disco/${disco.id}`} className={styles.posicaoCapa}>
                  <Capa src={disco.coverThumb ?? disco.coverSrc} alt={disco.title} />
                </Link>
                <Link to={`/disco/${disco.id}`} className={styles.posicaoTexto}>
                  <span>{disco.artist}</span>
                  <strong>{disco.title}</strong>
                  <span className={styles.posicaoMeta}>
                    {nomeFormato(disco.formatoId)} · {disco.releaseYear}
                  </span>
                </Link>
                <span className={styles.posicaoPreco}>{formatarPrecoCurto(disco.price)}</span>
                <button
                  type="button"
                  className={styles.adicionar}
                  data-no-carrinho={noCarrinho || undefined}
                  disabled={disco.estoque === 0}
                  onClick={() => {
                    if (!noCarrinho) adicionarAoCarrinho(disco.id, 1);
                  }}
                >
                  {rotuloAdicionar(noCarrinho, disco.estoque)}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.secao}>
        <CabecalhoSecao numero="04" titulo="Por década" />
        <div className={styles.decadas}>
          {decadas.map(({ decada, discos: discosDaDecada }) => (
            <Link
              key={decada}
              to={paraAcervo({ anoMin: String(decada), anoMax: String(decada + 9) })}
              className={styles.decada}
            >
              <img src={discosDaDecada[0].coverSrc} alt="" />
              <span className={styles.decadaLegenda}>
                <span className={styles.decadaNome}>
                  {String(decada).slice(2)}
                  <span>s</span>
                </span>
                <span className={styles.decadaContagem}>{contagem(discosDaDecada.length)}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.secao}>
        <CabecalhoSecao
          numero="05"
          titulo="Novidades"
          acao={
            <div className={styles.setas}>
              <button type="button" aria-label="Anterior" onClick={() => rolarNovidades(-1)}>
                <ArrowLeft size={20} />
              </button>
              <button type="button" aria-label="Próximo" onClick={() => rolarNovidades(1)}>
                <ArrowRight size={20} />
              </button>
            </div>
          }
        />
        <div ref={novidadesRef} className={styles.trilho}>
          {novidades.map((disco) => (
            <div key={disco.id} className={styles.trilhoItem}>
              <VinylCard disco={disco} />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.assistente}>
        <div className={styles.fundo}>
          <Ondas cor="#D9501F" linhas={12} opacidade={0.28} amplitude={52} />
        </div>
        <div className={styles.formaAssistente}>
          <Forma tipo="roda" paleta="laranja" giro={90} />
        </div>
        <div className={styles.aro} />
        <div className={styles.assistenteGrade}>
          <div className={styles.assistenteTitulo}>
            <span className={styles.rotuloClaro}>Assistente de recomendação</span>
            <h2>Não sabe por onde começar?</h2>
          </div>
          <div className={styles.assistenteTexto}>
            <p>
              Descreva um clima, um momento do dia ou um disco que você gosta. O assistente
              separa sugestões do acervo.
            </p>
            <button
              type="button"
              className={styles.botaoInvertido}
              onClick={() => navegar('/acervo?assistente')}
            >
              Conversar com o assistente
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
