import styles from './Disco.module.scss';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Skeleton, Tooltip } from '@mantine/core';
import { formatarBRL } from '../../utils/precificacao';
import { faixasDoDisco, nomeFormato, obterEdicao } from '../../utils/catalogo';
import { estoqueAcabando } from '../../utils/estoque';
import { useLoja } from '../../contexts/loja';
import VinylCard from '../../components/VinylCard/VinylCard';
import Quantidade from '../../components/Quantidade/Quantidade';
import { EsqueletoPagina } from '../../components/Esqueleto/Esqueleto';
import { ArrowRight, Checkmark, ShoppingCart } from '@carbon/icons-react';

const LIMITE_RELACIONADOS = 5;

function textoEstoque(estoque: number): string {
  if (estoque === 0) return 'Esgotado no momento';
  if (estoqueAcabando(estoque)) return `Últimas ${estoque} ${estoque === 1 ? 'cópia' : 'cópias'}`;
  return `${estoque} cópias em estoque`;
}

/**
 * A rota reaproveita o componente entre discos; a key pelo id zera quantidade,
 * aviso de "adicionado" e esqueleto da capa a cada troca de disco.
 */
function Disco() {
  const { id } = useParams();
  const { carregandoDiscos, carregandoSessao } = useLoja();

  // o botão de compra grava no carrinho de quem está na sessão, então espera os dois
  if (carregandoDiscos || carregandoSessao) {
    return (
      <main className={styles.main}>
        <EsqueletoPagina comAside blocos={[480]} />
      </main>
    );
  }

  return <PaginaDisco key={id} id={id} />;
}

function PaginaDisco({ id }: Readonly<{ id: string | undefined }>) {
  const { discos, adicionarAoCarrinho, sessao } = useLoja();
  const navegar = useNavigate();
  const [quantidade, setQuantidade] = useState<number>(1);
  const [adicionadas, setAdicionadas] = useState<number | null>(null);
  const [recusa, setRecusa] = useState<string[]>([]);
  const [isAdicionando, setIsAdicionando] = useState(false);
  const [isCapaCarregada, setIsCapaCarregada] = useState(false);

  // disco inativo sai da loja (RF0012), então some junto com o inexistente
  const disco = discos.find(
    (candidato) => candidato.id === Number(id) && candidato.isAtivo,
  );

  const relacionados = useMemo(() => {
    if (!disco) return [];

    // estilo pesa o dobro do gênero: 'Trap' diz muito mais sobre semelhança do
    // que 'Hip Hop', que sozinho já cobre a maior parte do acervo
    const semelhanca = (outro: (typeof discos)[number]) =>
      outro.styles.filter((estilo) => disco.styles.includes(estilo)).length * 2 +
      outro.genres.filter((genero) => disco.genres.includes(genero)).length;

    return discos
      .filter(
        (outro) =>
          outro.id !== disco.id && outro.isAtivo && semelhanca(outro) > 0,
      )
      .sort(
        (a, b) => semelhanca(b) - semelhanca(a) || b.numForSale - a.numForSale,
      )
      .slice(0, LIMITE_RELACIONADOS);
  }, [disco, discos]);

  if (!disco) {
    return (
      <main className={styles.main}>
        <div className={styles.naoEncontrado}>
          <h1>Disco não encontrado</h1>
          <p>Este disco saiu do acervo ou o endereço está incorreto.</p>
          <Link to="/acervo" className={styles.linkForte}>
            Voltar ao acervo <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    );
  }

  const esgotado = disco.estoque === 0;
  const faixas = faixasDoDisco(disco.codigoCatalogo);
  const genero = disco.genres[0];

  const fichaTecnica = [
    ['Gravadora', disco.gravadora],
    ['Formato', nomeFormato(disco.formatoId)],
    ['Lançamento', String(disco.releaseYear)],
    ['Faixas', String(disco.numeroFaixas)],
    ['Duração', disco.duracao],
    ['Catálogo', disco.codigoCatalogo],
    ['Código de barras', disco.codigoBarras],
    ['Peso', `${disco.dimensoes.peso} g`],
  ];

  // RN0031 e RN0044: quem decide é o servidor, com o que já está no carrinho somado.
  // O bloqueio é de um cliente, então sem sessão o cliente entra antes de incluir
  async function handleAdicionar(discoId: number): Promise<void> {
    if (!sessao) {
      navegar('/login', { state: { depois: `/disco/${discoId}` } });
      return;
    }
    setIsAdicionando(true);
    const mensagens = await adicionarAoCarrinho(discoId, quantidade);
    setIsAdicionando(false);
    setRecusa(mensagens);
    setAdicionadas(mensagens.length === 0 ? quantidade : null);
  }

  return (
    <main className={styles.main}>
      <nav className={styles.trilha} aria-label="Você está em">
        <Link to="/acervo">Acervo</Link>
        <span>/</span>
        {genero && (
          <>
            <Link to={`/acervo?categoria=${encodeURIComponent(genero)}`}>{genero}</Link>
            <span>/</span>
          </>
        )}
        <span className={styles.trilhaAtual}>{disco.title}</span>
      </nav>

      <div className={styles.conteudo}>
        <div className={styles.capaArea}>
          <img src="/images/vinil.svg" alt="" className={styles.vinil} />
          <Skeleton visible={!isCapaCarregada} radius={0} className={styles.capa}>
            <img
              src={disco.coverSrc}
              alt={disco.title}
              onLoad={() => setIsCapaCarregada(true)}
              onError={() => setIsCapaCarregada(true)}
            />
          </Skeleton>
        </div>

        <div className={styles.info}>
          <div className={styles.nomes}>
            <span className={styles.artista}>{disco.artist}</span>
            <h1>{disco.title}</h1>
          </div>

          <div className={styles.pilulas}>
            {/* o mesmo nome pode ser gênero e estilo, como o Hip Hop do Camp */}
            {[...new Set([...disco.genres, ...disco.styles])].map((categoria) => (
              <Link
                key={categoria}
                to={`/acervo?categoria=${encodeURIComponent(categoria)}`}
                className={styles.pilula}
              >
                {categoria}
              </Link>
            ))}
          </div>

          <div className={styles.etiquetas}>
            <span className={styles.etiqueta}>{nomeFormato(disco.formatoId)}</span>
            {disco.edicaoIds.map((edicaoId) => (
              <Tooltip key={edicaoId} label={obterEdicao(edicaoId)?.descricao} multiline w={280}>
                <span className={styles.etiqueta}>{obterEdicao(edicaoId)?.nome}</span>
              </Tooltip>
            ))}
            <span className={styles.etiqueta}>{disco.releaseYear}</span>
          </div>

          <div className={styles.compra} data-testid="disco-compra">
            <div className={styles.linhaPreco}>
              <span
                className={styles.preco}
                data-testid="disco-preco"
                data-valor={String(disco.price)}
              >
                {formatarBRL(disco.price)}
              </span>
              <span
                className={styles.estoque}
                data-testid="disco-estoque"
                data-alerta={estoqueAcabando(disco.estoque) || undefined}
                data-esgotado={esgotado || undefined}
              >
                {textoEstoque(disco.estoque)}
              </span>
            </div>

            <div className={styles.linhaCompra}>
              <Quantidade
                valor={quantidade}
                maximo={Math.max(1, disco.estoque)}
                disabled={esgotado}
                onChange={(valor) => {
                  setQuantidade(valor);
                  setAdicionadas(null);
                  setRecusa([]);
                }}
              />
              <Button
                flex={1}
                disabled={esgotado}
                loading={isAdicionando}
                leftSection={<ShoppingCart size={20} />}
                data-testid="btn-adicionar-carrinho"
                onClick={() => void handleAdicionar(disco.id)}
              >
                Adicionar ao carrinho
              </Button>
            </div>

            {recusa.length > 0 && (
              <Alert color="red" data-testid="alerta-carrinho">
                {recusa.map((mensagem) => (
                  <div key={mensagem}>{mensagem}</div>
                ))}
              </Alert>
            )}

            {adicionadas !== null && (
              <div className={styles.adicionado} role="status" data-testid="aviso-adicionado">
                <span>
                  <Checkmark size={16} />
                  {adicionadas} {adicionadas === 1 ? 'cópia adicionada' : 'cópias adicionadas'} ao
                  carrinho
                </span>
                <Link to="/carrinho">
                  Ver carrinho <ArrowRight size={16} />
                </Link>
              </div>
            )}

            <p className={styles.nota}>
              Frete para todo o Brasil, calculado pelo CEP no checkout.
            </p>
          </div>

          <p className={styles.descricao}>{disco.descricao}</p>
        </div>
      </div>

      <div className={styles.detalhes}>
        <section className={styles.bloco}>
          <div className={styles.blocoTopo}>
            <h2>Faixas</h2>
            <span className={styles.resumo}>
              {disco.numeroFaixas} faixas · {disco.duracao}
            </span>
          </div>
          {faixas.length === 0 ? (
            <p className={styles.semFaixas}>— Tracklist em breve</p>
          ) : (
            <ol className={styles.faixas}>
              {faixas.map((faixa) => (
                <li key={`${faixa.posicao}-${faixa.titulo}`} className={styles.faixa}>
                  <span className={styles.posicao}>{faixa.posicao}</span>
                  <span>{faixa.titulo}</span>
                  <span className={styles.duracao}>{faixa.duracao}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={styles.bloco}>
          <div className={styles.blocoTopo}>
            <h2>Ficha técnica</h2>
          </div>
          <dl className={styles.ficha}>
            {fichaTecnica.map(([rotulo, valor]) => (
              <div key={rotulo} className={styles.fichaLinha}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {relacionados.length > 0 && (
        <section className={styles.relacionados}>
          <h2>Quem ouve isso também leva</h2>
          <div className={styles.gradeRelacionados}>
            {relacionados.map((relacionado) => (
              <VinylCard key={relacionado.id} disco={relacionado} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default Disco;
