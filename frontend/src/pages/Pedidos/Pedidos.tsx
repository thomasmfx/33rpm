import styles from './Pedidos.module.scss';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert, Button, Checkbox, Textarea } from '@mantine/core';
import { useLoja } from '../../contexts/loja';
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio';
import StatusPonto from '../../components/StatusPonto/StatusPonto';
import LinhaDoTempo from '../../components/LinhaDoTempo/LinhaDoTempo';
import Quantidade from '../../components/Quantidade/Quantidade';
import { EsqueletoPagina } from '../../components/Esqueleto/Esqueleto';
import type { Pedido } from '../../types/pedido';
import {
  CORES_STATUS,
  itensDaTroca,
  passoDoPedido,
  pedidosDoCliente,
  podeCancelar,
  podeConfirmarRecebimento,
  podeInformarDespacho,
  podeSolicitarTroca,
  ROTULOS_STATUS,
  valorDosItens,
} from '../../utils/pedido';
import { formatarBRL } from '../../utils/precificacao';
import { linhaDoEndereco } from '../../utils/perfilCliente';

const MOTIVO_MIN_CARACTERES = 10;

interface ItemSelecionadoTroca {
  discoId: number;
  quantidade: number;
}

function avisoDoStatus(pedido: Pedido): string | null {
  switch (pedido.status) {
    case 'TROCA SOLICITADA':
      return 'Troca em análise. Assim que a curadoria autorizar, você recebe as instruções para enviar o disco.';
    case 'TROCA ACEITA':
      return 'Troca autorizada. Envie o disco de volta e avise por aqui quando despachar.';
    case 'ITEM ENVIADO':
      return 'O disco está a caminho da loja. O crédito sai quando a curadoria confirmar o recebimento.';
    case 'CANCELADO':
      return 'Pedido cancelado. Os discos voltaram ao estoque e o valor é estornado no cartão.';
    case 'ENTREGUE':
      return 'Algo errado com o disco? Você pode pedir a troca dos itens deste pedido.';
    default:
      return null;
  }
}

export default function Pedidos() {
  const { clienteAtivo, carregandoClientes, pedidos, cupons, cancelarPedido, atualizarPedido } =
    useLoja();
  const { state } = useLocation();
  const [pedidoAbertoId, setPedidoAbertoId] = useState<string | null>(
    () => (state as { abrir?: string } | null)?.abrir ?? null,
  );
  const [isConfirmandoCancelamento, setIsConfirmandoCancelamento] = useState(false);
  const [isTrocaAberta, setIsTrocaAberta] = useState(false);
  const [itensTroca, setItensTroca] = useState<ItemSelecionadoTroca[]>([]);
  const [motivoTroca, setMotivoTroca] = useState<string>('');

  if (carregandoClientes) {
    return (
      <main className={styles.main}>
        <EsqueletoPagina blocos={[88, 88, 88]} />
      </main>
    );
  }

  if (!clienteAtivo) {
    return <Navigate to="/login" state={{ depois: '/pedidos' }} replace />;
  }

  const lista = pedidosDoCliente(pedidos, clienteAtivo.id);

  if (lista.length === 0) {
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
    setIsConfirmandoCancelamento(false);
    fecharTroca();
  }

  function fecharTroca(): void {
    setIsTrocaAberta(false);
    setItensTroca([]);
    setMotivoTroca('');
  }

  function handleAlternarItemTroca(discoId: number, marcado: boolean): void {
    setItensTroca((atuais) =>
      marcado
        ? [...atuais, { discoId, quantidade: 1 }]
        : atuais.filter((item) => item.discoId !== discoId),
    );
  }

  function handleAlterarQuantidadeTroca(discoId: number, quantidade: number): void {
    setItensTroca((atuais) =>
      atuais.map((item) => (item.discoId === discoId ? { ...item, quantidade } : item)),
    );
  }

  // RF0041: a troca é pedida sobre itens específicos, com um motivo
  function handleConfirmarTroca(pedido: Pedido): void {
    if (itensTroca.length === 0 || motivoTroca.trim().length < MOTIVO_MIN_CARACTERES) return;

    atualizarPedido(pedido.id, {
      status: 'TROCA SOLICITADA',
      troca: {
        itens: itensTroca,
        motivo: motivoTroca,
        solicitadaEm: new Date().toISOString(),
        cupomGeradoId: null,
        retornouAoEstoque: false,
      },
    });
    fecharTroca();
  }

  const trocaHabilitada =
    itensTroca.length > 0 && motivoTroca.trim().length >= MOTIVO_MIN_CARACTERES;

  function renderDetalhe(pedido: Pedido) {
    const passo = passoDoPedido(pedido.status);
    const aviso = avisoDoStatus(pedido);
    const cupomTroca = pedido.cupomTrocaGeradoId
      ? cupons.find((cupom) => cupom.id === pedido.cupomTrocaGeradoId)
      : null;
    const cupomDaTroca = pedido.troca?.cupomGeradoId
      ? cupons.find((cupom) => cupom.id === pedido.troca?.cupomGeradoId)
      : null;

    return (
      <div className={styles.detalhe}>
        {passo !== null && <LinhaDoTempo passo={passo} />}

        {aviso && <Alert color="gray">{aviso}</Alert>}

        {pedido.status === 'PAGAMENTO RECUSADO' && pedido.validacaoPagamento && (
          <Alert color="red" title="Pagamento recusado">
            {pedido.validacaoPagamento.verificacoes
              .filter((verificacao) => !verificacao.ok)
              .map((verificacao) => (
                <div key={verificacao.rotulo}>
                  {verificacao.rotulo}: {verificacao.detalhe}
                </div>
              ))}
            <div>Os itens voltaram ao estoque. Refaça a compra com outra forma de pagamento.</div>
          </Alert>
        )}

        {cupomTroca && (
          <Alert color="green" title="Sobrou crédito">
            A diferença dos cupons virou o cupom {cupomTroca.codigo}, no valor de{' '}
            {formatarBRL(cupomTroca.valor)} (RN0036).
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

        {pedido.troca && (
          <div className={styles.troca}>
            <span className={styles.rotuloSelo}>
              Troca · pedida em {new Date(pedido.troca.solicitadaEm).toLocaleDateString('pt-BR')}
            </span>
            {itensDaTroca(pedido).map((item) => (
              <span key={item.discoId}>
                {item.titulo} · {item.quantidade}×
              </span>
            ))}
            <q>{pedido.troca.motivo}</q>
            <strong>Valor: {formatarBRL(valorDosItens(pedido, pedido.troca.itens))}</strong>
            {cupomDaTroca && (
              <Alert color="green" title="Crédito disponível">
                O crédito da troca já está no cupom {cupomDaTroca.codigo}, no valor de{' '}
                {formatarBRL(cupomDaTroca.valor)} (RF0045).
              </Alert>
            )}
          </div>
        )}

        {isConfirmandoCancelamento && (
          <div className={styles.confirmacao}>
            <p>
              Os discos voltam ao estoque e o valor é estornado no cartão. Cancelar o pedido #
              {pedido.id}?
            </p>
            <div className={styles.acoes}>
              <Button
                variant="outline"
                color="red"
                size="sm"
                onClick={() => setIsConfirmandoCancelamento(false)}
              >
                Manter pedido
              </Button>
              <Button
                color="red"
                size="sm"
                onClick={() => {
                  cancelarPedido(pedido.id);
                  setIsConfirmandoCancelamento(false);
                }}
              >
                Cancelar pedido
              </Button>
            </div>
          </div>
        )}

        {isTrocaAberta && (
          <div className={styles.painelTroca}>
            <h3>Quais discos você quer trocar?</h3>
            {pedido.itens.map((item) => {
              const selecionado = itensTroca.find((atual) => atual.discoId === item.discoId);
              return (
                <div key={item.discoId} className={styles.itemTroca}>
                  <Checkbox
                    label={`${item.titulo} · ${item.artista}`}
                    checked={Boolean(selecionado)}
                    onChange={(evento) =>
                      handleAlternarItemTroca(item.discoId, evento.currentTarget.checked)
                    }
                  />
                  {selecionado && item.quantidade > 1 && (
                    <Quantidade
                      tamanho="sm"
                      valor={selecionado.quantidade}
                      maximo={item.quantidade}
                      rotulo={`Quantidade de ${item.titulo} para troca`}
                      onChange={(valor) => handleAlterarQuantidadeTroca(item.discoId, valor)}
                    />
                  )}
                </div>
              );
            })}
            <div className={styles.motivo}>
              <Textarea
                label="Motivo"
                placeholder="Ex.: o disco chegou empenado no lado B"
                minRows={3}
                autosize
                value={motivoTroca}
                onChange={(evento) => setMotivoTroca(evento.currentTarget.value)}
              />
              <span
                className={styles.contador}
                data-ok={motivoTroca.trim().length >= MOTIVO_MIN_CARACTERES || undefined}
              >
                {motivoTroca.trim().length} / {MOTIVO_MIN_CARACTERES} mín.
              </span>
            </div>
            <div className={styles.acoes}>
              <Button variant="default" size="sm" onClick={fecharTroca}>
                Voltar
              </Button>
              <Button size="sm" disabled={!trocaHabilitada} onClick={() => handleConfirmarTroca(pedido)}>
                Solicitar troca
              </Button>
            </div>
          </div>
        )}

        {!isConfirmandoCancelamento && !isTrocaAberta && (
          <div className={styles.acoes}>
            {podeCancelar(pedido.status) && (
              <Button variant="outline" color="red" onClick={() => setIsConfirmandoCancelamento(true)}>
                Cancelar pedido
              </Button>
            )}
            {podeConfirmarRecebimento(pedido.status) && (
              <Button onClick={() => atualizarPedido(pedido.id, { status: 'ENTREGUE' })}>
                Confirmar recebimento
              </Button>
            )}
            {podeSolicitarTroca(pedido.status) && (
              <Button variant="outline" onClick={() => setIsTrocaAberta(true)}>
                Solicitar troca
              </Button>
            )}
            {podeInformarDespacho(pedido.status) && (
              <Button onClick={() => atualizarPedido(pedido.id, { status: 'ITEM ENVIADO' })}>
                Informar despacho do item
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.cabecalho}>
        <h1>Meus pedidos</h1>
        <span className={styles.contagem}>
          {lista.length} {lista.length === 1 ? 'pedido' : 'pedidos'}
        </span>
      </div>

      <ul className={styles.lista}>
        {lista.map((pedido) => {
          const aberto = pedido.id === pedidoAbertoId;
          return (
            <li key={pedido.id} className={styles.pedido} data-aberto={aberto || undefined}>
              <button
                type="button"
                className={styles.linha}
                aria-expanded={aberto}
                onClick={() => alternarPedido(pedido.id)}
              >
                <span className={styles.numero}>
                  <span>#{pedido.id}</span>
                  <span className={styles.data}>{new Date(pedido.data).toLocaleDateString('pt-BR')}</span>
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
                <StatusPonto cor={CORES_STATUS[pedido.status]}>
                  {ROTULOS_STATUS[pedido.status]}
                </StatusPonto>
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
