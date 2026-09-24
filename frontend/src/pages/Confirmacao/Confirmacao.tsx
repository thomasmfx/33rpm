import styles from './Confirmacao.module.scss';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button } from '@mantine/core';
import { useLoja } from '../../contexts/loja';
import Forma from '../../components/Forma/Forma';
import LinhaDoTempo from '../../components/LinhaDoTempo/LinhaDoTempo';
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio';
import { EsqueletoPagina } from '../../components/Esqueleto/Esqueleto';
import { passoDoPedido } from '../../utils/pedido';
import { formatarBRL } from '../../utils/precificacao';
import { linhaDoEndereco } from '../../utils/perfilCliente';

function Confirmacao() {
  const { id } = useParams();
  const { state } = useLocation();
  const navegar = useNavigate();
  const { clienteAtivo, carregandoClientes, pedidos } = useLoja();

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

  const pedido = pedidos.find(
    (candidato) => candidato.id === id && candidato.clienteId === clienteAtivo.id,
  );

  if (!pedido) {
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

  const primeiroNome = clienteAtivo.nome.split(' ')[0];
  const perfilNaoSalvo = Boolean((state as { perfilNaoSalvo?: boolean } | null)?.perfilNaoSalvo);

  return (
    <main className={styles.main}>
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
        </div>
        <div className={styles.forma}>
          <Forma tipo="explosao" paleta="laranja" giro={40} />
        </div>
      </div>

      {perfilNaoSalvo && (
        <Alert color="orange">
          O pedido foi registrado, mas o endereço ou o cartão novo não foi salvo no seu perfil.
          Cadastre de novo em Minha conta.
        </Alert>
      )}

      <LinhaDoTempo passo={passoDoPedido(pedido.status) ?? 0} detalhes={['Agora']} />

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
            <strong>{formatarBRL(pedido.total)}</strong>
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
