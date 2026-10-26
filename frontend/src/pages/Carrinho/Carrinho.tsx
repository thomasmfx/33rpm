import styles from './Carrinho.module.scss';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button } from '@mantine/core';
import { useLoja } from '../../contexts/loja';
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio';
import AvisoReserva from '../../components/AvisoReserva/AvisoReserva';
import Capa from '../../components/Capa/Capa';
import Quantidade from '../../components/Quantidade/Quantidade';
import { EsqueletoPagina } from '../../components/Esqueleto/Esqueleto';
import { formatarBRL } from '../../utils/precificacao';
import { nomeFormato } from '../../utils/catalogo';
import { estoqueAcabando } from '../../utils/estoque';
import { calcularSubtotal, itensDoCarrinho } from '../../utils/checkout';

function Carrinho() {
  const {
    carrinho,
    discos,
    carregandoDiscos,
    carregandoSessao,
    carregandoCarrinho,
    clienteAtivo,
    itensNoCarrinho,
    alterarQuantidade,
    removerDoCarrinho,
    limparCarrinho,
    itensExpirados,
    prazoReservaMinutos,
    readicionarExpirados,
    descartarItensExpirados,
    revalidarCarrinho,
  } = useLoja();
  const navegar = useNavigate();

  const [ajustes, setAjustes] = useState<string[]>([]);
  const [recusa, setRecusa] = useState<string[]>([]);
  const [isConferindo, setIsConferindo] = useState(false);

  // o carrinho é do cliente da sessão e vem do servidor
  if (carregandoDiscos || carregandoSessao || carregandoCarrinho) {
    return (
      <main className={styles.main}>
        <EsqueletoPagina comAside blocos={[120, 120]} />
      </main>
    );
  }

  if (!clienteAtivo) {
    return <Navigate to="/login" state={{ depois: '/carrinho' }} replace />;
  }

  const itens = itensDoCarrinho(carrinho, discos);
  const subtotal = calcularSubtotal(itens);
  // RNF0042: com itens expirados à espera, comprar fica desabilitado
  const compraBloqueada = itensExpirados.length > 0;

  async function handleReadicionarExpirados(): Promise<void> {
    setRecusa(await readicionarExpirados());
  }

  async function handleDispensarExpirados(): Promise<void> {
    setRecusa(await descartarItensExpirados());
  }

  // RN0031: a quantidade nova só vale depois que o servidor aceita
  async function handleAlterarQuantidade(discoId: number, quantidade: number): Promise<void> {
    setRecusa(await alterarQuantidade(discoId, quantidade));
  }

  async function handleRemover(discoId: number): Promise<void> {
    setRecusa(await removerDoCarrinho(discoId));
  }

  async function handleEsvaziar(): Promise<void> {
    setRecusa(await limparCarrinho());
  }

  // RN0032: o estoque pode ter mudado; o servidor ajusta e a tela avisa antes de seguir
  async function handleFinalizarCompra(): Promise<void> {
    setIsConferindo(true);
    const novosAjustes = await revalidarCarrinho();
    setIsConferindo(false);
    if (novosAjustes.length > 0) {
      setAjustes(novosAjustes);
      return;
    }
    navegar('/checkout');
  }

  // RN0045 e RNF0042: o que caiu por expiração aparece aqui e volta com um clique
  const alertaExpirados = itensExpirados.length > 0 && (
    <Alert color="red" title="Itens removidos por expiração" data-testid="alerta-expirados">
      <div className={styles.alertaCorpo}>
        <span>
          O prazo de reserva de {prazoReservaMinutos} minutos acabou e estes discos saíram do
          seu carrinho. Para comprar, inclua-os de novo ou dispense-os:
        </span>
        <ul>
          {itensExpirados.map((item) => {
            const disco = discos.find((candidato) => candidato.id === item.discoId);
            return (
              <li key={item.discoId} data-testid="item-expirado" data-disco-id={item.discoId}>
                {disco?.title ?? 'Disco indisponível'} · {item.quantidade}×
              </li>
            );
          })}
        </ul>
        <div className={styles.alertaAcoes}>
          <Button
            size="xs"
            data-testid="btn-readicionar-expirados"
            onClick={() => void handleReadicionarExpirados()}
          >
            Adicionar novamente
          </Button>
          <Button
            size="xs"
            variant="default"
            data-testid="btn-dispensar-expirados"
            onClick={() => void handleDispensarExpirados()}
          >
            Dispensar
          </Button>
        </div>
      </div>
    </Alert>
  );

  const alertaRecusa = recusa.length > 0 && (
    <Alert color="red" data-testid="alerta-carrinho">
      {recusa.map((mensagem) => (
        <div key={mensagem}>{mensagem}</div>
      ))}
    </Alert>
  );

  if (itens.length === 0) {
    return (
      <main className={styles.main}>
        {alertaExpirados}
        {alertaRecusa}
        <EstadoVazio
          titulo="Seu carrinho está vazio"
          descricao="Nenhum disco por aqui ainda. Vá ao acervo e comece a garimpar."
          rotuloAcao="Explorar o acervo"
          paraAcao="/acervo"
        />
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.layout}>
        <div className={styles.coluna}>
          <div className={styles.topo}>
            <h1>Carrinho</h1>
            <button
              type="button"
              className={styles.esvaziar}
              data-testid="btn-esvaziar-carrinho"
              onClick={() => void handleEsvaziar()}
            >
              Esvaziar
            </button>
          </div>

          {alertaExpirados}
          {alertaRecusa}

          {ajustes.length > 0 && (
            <Alert color="orange" title="Carrinho ajustado ao estoque" data-testid="alerta-ajustes">
              {ajustes.map((ajuste) => (
                <div key={ajuste}>{ajuste}</div>
              ))}
            </Alert>
          )}

          <ul className={styles.itens}>
            {itens.map(({ disco, quantidade }) => (
              <li
                key={disco.id}
                className={styles.item}
                data-testid="item-carrinho"
                data-disco-id={disco.id}
              >
                <Link to={`/disco/${disco.id}`} className={styles.capa}>
                  <Capa src={disco.coverSrc} alt={disco.title} />
                </Link>

                <div className={styles.texto}>
                  <span className={styles.artista}>{disco.artist}</span>
                  <Link to={`/disco/${disco.id}`} className={styles.titulo}>
                    {disco.title}
                  </Link>
                  <span
                    className={styles.meta}
                    data-alerta={estoqueAcabando(disco.estoque) || undefined}
                  >
                    {nomeFormato(disco.formatoId)} ·{' '}
                    {estoqueAcabando(disco.estoque)
                      ? `Últimas ${disco.estoque}`
                      : `${disco.estoque} em estoque`}
                  </span>
                </div>

                <Quantidade
                  tamanho="sm"
                  valor={quantidade}
                  maximo={disco.estoque}
                  rotulo={`Quantidade de ${disco.title}`}
                  onChange={(valor) => void handleAlterarQuantidade(disco.id, valor)}
                />

                <div className={styles.valor}>
                  <strong
                    data-testid="item-valor"
                    data-valor={String(calcularSubtotal([{ disco, quantidade }]))}
                  >
                    {formatarBRL(disco.price * quantidade)}
                  </strong>
                  <button
                    type="button"
                    className={styles.remover}
                    aria-label={`Remover ${disco.title}`}
                    data-testid="btn-remover-item"
                    onClick={() => void handleRemover(disco.id)}
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className={styles.resumo}>
          <h2>Resumo</h2>
          <div className={styles.linha}>
            <span>
              Subtotal · {itensNoCarrinho} {itensNoCarrinho === 1 ? 'disco' : 'discos'}
            </span>
            <span data-testid="carrinho-subtotal" data-valor={String(subtotal)}>
              {formatarBRL(subtotal)}
            </span>
          </div>
          <div className={styles.linha}>
            <span>Frete</span>
            <span className={styles.apagado}>calculado no checkout</span>
          </div>
          <div className={styles.total}>
            <span>Total</span>
            <strong>{formatarBRL(subtotal)}</strong>
          </div>
          <Button
            size="lg"
            fullWidth
            disabled={compraBloqueada}
            loading={isConferindo}
            data-testid="btn-finalizar-compra"
            onClick={() => void handleFinalizarCompra()}
          >
            Finalizar compra
          </Button>
          {compraBloqueada && (
            <span className={styles.apagado} data-testid="motivo-compra-bloqueada">
              Inclua de novo ou dispense os itens expirados para comprar (RNF0042).
            </span>
          )}
          <Button variant="default" fullWidth component={Link} to="/acervo">
            Continuar explorando
          </Button>
          <AvisoReserva texto="Seus discos ficam reservados até o fim do contador." />
        </aside>
      </div>
    </main>
  );
}

export default Carrinho;
