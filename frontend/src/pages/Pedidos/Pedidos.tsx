import styles from './Pedidos.module.scss';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert } from '@mantine/core';
import { useLoja } from '../../contexts/loja';
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio';
import StatusPonto from '../../components/StatusPonto/StatusPonto';
import LinhaDoTempo from '../../components/LinhaDoTempo/LinhaDoTempo';
import { EsqueletoPagina } from '../../components/Esqueleto/Esqueleto';
import type { PedidoCliente } from '../../types/pedido';
import { corDoStatus, passoDoStatus, rotuloDoStatus } from '../../utils/pedido';
import { formatarBRL } from '../../utils/precificacao';
import { linhaDoEndereco } from '../../utils/perfilCliente';

export default function Pedidos() {
  const {
    clienteAtivo,
    carregandoClientes,
    meusPedidos,
    carregandoMeusPedidos,
    erroMeusPedidos,
  } = useLoja();
  const { state } = useLocation();
  const [pedidoAbertoId, setPedidoAbertoId] = useState<string | null>(
    () => (state as { abrir?: string } | null)?.abrir ?? null,
  );

  if (carregandoClientes || carregandoMeusPedidos) {
    return (
      <main className={styles.main}>
        <EsqueletoPagina blocos={[88, 88, 88]} />
      </main>
    );
  }

  if (!clienteAtivo) {
    return <Navigate to="/login" state={{ depois: '/pedidos' }} replace />;
  }

  if (erroMeusPedidos) {
    return (
      <main className={styles.main}>
        <Alert color="red" title="Não deu para carregar os pedidos">
          {erroMeusPedidos}
        </Alert>
      </main>
    );
  }

  if (meusPedidos.length === 0) {
    return (
      <main className={styles.main}>
        <EstadoVazio
          titulo="Nenhum pedido ainda"
          descricao="Quando você fechar uma compra, ela aparece aqui com o status e o histórico de entrega."
          rotuloAcao="Explorar o acervo"
          paraAcao="/acervo"
          forma="gota"
          paleta="laranja"
        />
      </main>
    );
  }

  function alternarPedido(pedidoId: string): void {
    setPedidoAbertoId((atual) => (atual === pedidoId ? null : pedidoId));
  }

  function renderDetalhe(pedido: PedidoCliente) {
    const passo = passoDoStatus(pedido.status);

    return (
      <div className={styles.detalhe}>
        {passo !== null && <LinhaDoTempo passo={passo} />}

        {pedido.cupomGerado && (
          <Alert color="green" title="Sobrou crédito">
            A diferença dos cupons virou o cupom {pedido.cupomGerado.codigo}, no valor de{' '}
            {formatarBRL(pedido.cupomGerado.valor)} (RN0036).
          </Alert>
        )}

        <div className={styles.colunas}>
          <div className={styles.coluna}>
            <span className={styles.rotulo}>Discos</span>
            {pedido.itens.map((item) => (
              <div key={item.discoId} className={styles.item}>
                <img src={item.coverSrc} alt="" />
                <span className={styles.itemTexto}>
                  <strong>{item.titulo}</strong>
                  <span>
                    {item.artista} · {item.quantidade}×
                  </span>
                </span>
                <span>{formatarBRL(item.precoUnitario * item.quantidade)}</span>
              </div>
            ))}
          </div>

          <div className={styles.coluna}>
            <span className={styles.rotulo}>Entrega</span>
            <strong>{pedido.enderecoEntrega.nome}</strong>
            <span className={styles.texto}>{linhaDoEndereco(pedido.enderecoEntrega)}</span>
          </div>

          <div className={styles.coluna}>
            <span className={styles.rotulo}>Pagamento</span>
            <div className={styles.valor}>
              <span>Subtotal</span>
              <span>{formatarBRL(pedido.subtotal)}</span>
            </div>
            <div className={styles.valor}>
              <span>Frete</span>
              <span>{formatarBRL(pedido.frete)}</span>
            </div>
            {pedido.cupons.map((cupom) => (
              <div key={cupom.cupomId} className={styles.valor} data-desconto>
                <span>Cupom {cupom.codigo}</span>
                <span>− {formatarBRL(cupom.valor)}</span>
              </div>
            ))}
            {pedido.cartoes.map((cartao) => (
              <div key={cartao.cartaoId} className={styles.valor}>
                <span>
                  {cartao.bandeira} •••• {cartao.ultimosDigitos}
                </span>
                <span>{formatarBRL(cartao.valor)}</span>
              </div>
            ))}
            <div className={styles.total}>
              <span>Total</span>
              <strong>{formatarBRL(pedido.total)}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.cabecalho}>
        <h1>Meus pedidos</h1>
        <span className={styles.contagem}>
          {meusPedidos.length} {meusPedidos.length === 1 ? 'pedido' : 'pedidos'}
        </span>
      </div>

      <ul className={styles.lista}>
        {meusPedidos.map((pedido) => {
          const aberto = pedido.id === pedidoAbertoId;
          return (
            <li
              key={pedido.id}
              className={styles.pedido}
              data-aberto={aberto || undefined}
              data-testid="pedido-linha"
              data-pedido-id={pedido.id}
            >
              <button
                type="button"
                className={styles.linha}
                aria-expanded={aberto}
                onClick={() => alternarPedido(pedido.id)}
              >
                <span className={styles.numero}>
                  <span>#{pedido.id}</span>
                  <span className={styles.data}>
                    {new Date(pedido.data).toLocaleDateString('pt-BR')}
                  </span>
                </span>
                <span className={styles.capas}>
                  <span className={styles.pilha}>
                    {pedido.itens.slice(0, 3).map((item) => (
                      <img key={item.discoId} src={item.coverSrc} alt="" />
                    ))}
                  </span>
                  <span className={styles.titulos}>
                    {pedido.itens.map((item) => item.titulo).join(', ')}
                  </span>
                </span>
                <span className={styles.totalLinha}>{formatarBRL(pedido.total)}</span>
                <span data-testid="pedido-status" data-status={pedido.status}>
                  <StatusPonto cor={corDoStatus(pedido.status)}>
                    {rotuloDoStatus(pedido.status)}
                  </StatusPonto>
                </span>
                <span className={styles.abrir}>{aberto ? 'Fechar' : 'Detalhes'}</span>
              </button>
              {aberto && renderDetalhe(pedido)}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
