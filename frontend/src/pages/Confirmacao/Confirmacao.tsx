import styles from './Confirmacao.module.scss';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button } from '@mantine/core';
import { useLoja } from '../../contexts/loja';
import type { Cliente } from '../../types/cliente';
import type { PedidoCliente } from '../../types/pedido';
import { buscarPedido } from '../../services/pedidosService';
import { ErroApi } from '../../services/api';
import Forma from '../../components/Forma/Forma';
import LinhaDoTempo from '../../components/LinhaDoTempo/LinhaDoTempo';
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio';
import StatusPonto from '../../components/StatusPonto/StatusPonto';
import { EsqueletoPagina } from '../../components/Esqueleto/Esqueleto';
import { corDoStatus, passoDoStatus, rotuloDoStatus } from '../../utils/pedido';
import { formatarBRL } from '../../utils/precificacao';
import { linhaDoEndereco } from '../../utils/perfilCliente';

function Confirmacao() {
  const { id = '' } = useParams();
  const { clienteAtivo, carregandoClientes } = useLoja();

  if (carregandoClientes) {
    return (
      <main className={styles.main}>
        <EsqueletoPagina blocos={[64, 160]} />
      </main>
    );
  }

  if (!clienteAtivo) {
    return <Navigate to="/login" state={{ depois: `/pedidos/${id}/confirmacao` }} replace />;
  }

  return <PedidoConfirmado key={id} id={id} cliente={clienteAtivo} />;
}

/** RF0038: o pedido como o servidor gravou, com o status que ele recebeu. */
function PedidoConfirmado({ id, cliente }: Readonly<{ id: string; cliente: Cliente }>) {
  const navegar = useNavigate();
  const [busca, setBusca] = useState<{ pedido: PedidoCliente | null; erros: string[] } | null>(
    null,
  );

  useEffect(() => {
    let cancelado = false;
    buscarPedido(id)
      .then((pedido) => {
        if (!cancelado) setBusca({ pedido, erros: [] });
      })
      .catch((erro: unknown) => {
        if (cancelado) return;
        setBusca({
          pedido: null,
          erros: erro instanceof ErroApi ? erro.mensagens : ['Falha ao carregar o pedido.'],
        });
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  if (!busca) {
    return (
      <main className={styles.main}>
        <EsqueletoPagina blocos={[64, 160]} />
      </main>
    );
  }

  if (busca.erros.length > 0) {
    return (
      <main className={styles.main}>
        <Alert color="red" title="Não deu para carregar o pedido">
          {busca.erros.join(' ')}
        </Alert>
      </main>
    );
  }

  const { pedido } = busca;
  if (!pedido || pedido.clienteId !== cliente.id) {
    return (
      <main className={styles.main}>
        <EstadoVazio
          titulo="Pedido não encontrado"
          descricao="Este pedido não existe ou pertence a outra conta."
          rotuloAcao="Ver meus pedidos"
          paraAcao="/pedidos"
        />
      </main>
    );
  }

  const primeiroNome = cliente.nome.split(' ')[0];

  return (
    <main className={styles.main} data-testid="confirmacao-pedido" data-pedido-id={pedido.id}>
      <div className={styles.topo}>
        <div className={styles.texto}>
          <span className={styles.meta}>
            Pedido #{pedido.id} · {new Date(pedido.data).toLocaleDateString('pt-BR')}
          </span>
          <h1>Pedido recebido, {primeiroNome}.</h1>
          <p>
            O pagamento passa agora pela conferência da curadoria. Você acompanha cada etapa em
            Meus pedidos.
          </p>
          <span data-testid="pedido-status" data-status={pedido.status}>
            <StatusPonto cor={corDoStatus(pedido.status)}>
              {rotuloDoStatus(pedido.status)}
            </StatusPonto>
          </span>
        </div>
        <div className={styles.forma}>
          <Forma tipo="explosao" paleta="laranja" giro={40} />
        </div>
      </div>

      {pedido.cupomGerado && (
        <Alert
          color="green"
          title="Sobrou crédito"
          data-testid="cupom-gerado"
          data-codigo={pedido.cupomGerado.codigo}
          data-valor={String(pedido.cupomGerado.valor)}
        >
          A diferença dos cupons virou o cupom {pedido.cupomGerado.codigo}, no valor de{' '}
          {formatarBRL(pedido.cupomGerado.valor)} (RN0036). Ele já está em Meus cupons.
        </Alert>
      )}

      <LinhaDoTempo passo={passoDoStatus(pedido.status) ?? 0} detalhes={['Agora']} />

      <div className={styles.grade}>
        <div className={styles.coluna}>
          <span className={styles.rotulo}>Entrega</span>
          <strong>{pedido.enderecoEntrega.nome}</strong>
          <span className={styles.leve}>{linhaDoEndereco(pedido.enderecoEntrega)}</span>
        </div>

        <div className={styles.coluna}>
          <span className={styles.rotulo}>Pagamento</span>
          {pedido.cupons.map((cupom) => (
            <div key={cupom.cupomId} className={styles.linha}>
              <span>Cupom {cupom.codigo}</span>
              <span>− {formatarBRL(cupom.valor)}</span>
            </div>
          ))}
          {pedido.cartoes.map((cartao) => (
            <div key={cartao.cartaoId} className={styles.linha}>
              <span>
                {cartao.bandeira} •••• {cartao.ultimosDigitos}
              </span>
              <span>{formatarBRL(cartao.valor)}</span>
            </div>
          ))}
          <div className={styles.linha}>
            <span>Frete</span>
            <span>{formatarBRL(pedido.frete)}</span>
          </div>
          <div className={styles.total}>
            <span>Total</span>
            <strong data-testid="confirmacao-total" data-valor={String(pedido.total)}>
              {formatarBRL(pedido.total)}
            </strong>
          </div>
        </div>

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
            </div>
          ))}
        </div>
      </div>

      <div className={styles.acoes}>
        <Button onClick={() => navegar('/pedidos', { state: { abrir: pedido.id } })}>
          Acompanhar pedido
        </Button>
        <Button variant="outline" component={Link} to="/acervo">
          Continuar explorando
        </Button>
      </div>
    </main>
  );
}

export default Confirmacao;
