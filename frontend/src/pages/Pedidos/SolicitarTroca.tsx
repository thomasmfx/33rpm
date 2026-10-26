import styles from './Pedidos.module.scss';
import { useState } from 'react';
import { Alert, Button, Checkbox, Radio, Textarea } from '@mantine/core';
import type { PedidoCliente } from '../../types/pedido';
import Quantidade from '../../components/Quantidade/Quantidade';
import { ErroApi } from '../../services/api';
import { solicitarTroca } from '../../services/trocasService';
import { rotuloDoStatus } from '../../utils/pedido';

/** Antes da entrega, a troca aparece bloqueada para o cliente saber quando poderá pedir. */
const STATUS_ANTES_DA_ENTREGA = ['EM PROCESSAMENTO', 'APROVADA', 'EM TRANSPORTE'];

interface SolicitarTrocaProps {
  pedido: PedidoCliente;
  onSolicitada: () => void;
}

/** Quanto de cada item ainda pode ir para troca, descontadas as trocas anteriores. */
function restantes(pedido: PedidoCliente): Record<string, number> {
  return Object.fromEntries(
    pedido.itens.map((item) => {
      const trocados = pedido.trocas
        .flatMap((troca) => troca.itens)
        .filter((trocado) => trocado.itemPedidoId === item.id)
        .reduce((soma, trocado) => soma + trocado.quantidade, 0);
      return [item.id, item.quantidade - trocados];
    }),
  );
}

/** RF0041, RN0041 e RN0043: troca de itens escolhidos ou da compra inteira, só depois da entrega. */
export default function SolicitarTroca({ pedido, onSolicitada }: Readonly<SolicitarTrocaProps>) {
  const [isAberto, setIsAberto] = useState(false);
  const [modo, setModo] = useState<'itens' | 'inteira'>('itens');
  const [escolhidos, setEscolhidos] = useState<Record<string, number>>({});
  const [motivo, setMotivo] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const [isEnviando, setIsEnviando] = useState(false);

  if (STATUS_ANTES_DA_ENTREGA.includes(pedido.status)) {
    return (
      <div className={styles.trocaBloqueada}>
        <Button variant="outline" size="sm" disabled data-testid="btn-solicitar-troca">
          Solicitar troca
        </Button>
        <span className={styles.nota} data-testid="aviso-troca-bloqueada">
          A troca só pode ser pedida depois da entrega (RN0043). Este pedido está{' '}
          {rotuloDoStatus(pedido.status).toLowerCase()}.
        </span>
      </div>
    );
  }

  const disponiveis = restantes(pedido);
  if (pedido.status !== 'ENTREGUE' || Object.values(disponiveis).every((qtd) => qtd === 0)) {
    return null;
  }

  // RN0041: a compra inteira só vale se nada dela foi para troca ainda
  const podeCompraInteira = pedido.trocas.length === 0;

  function alternarItem(itemId: string): void {
    setEscolhidos((atuais) => {
      const { [itemId]: escolhido, ...outros } = atuais;
      return escolhido === undefined ? { ...atuais, [itemId]: 1 } : outros;
    });
  }

  async function handleEnviar(): Promise<void> {
    setIsEnviando(true);
    setErros([]);
    try {
      await solicitarTroca({
        pedidoId: pedido.id,
        clienteId: pedido.clienteId,
        motivo,
        compraInteira: modo === 'inteira',
        itens: Object.entries(escolhidos).map(([itemPedidoId, quantidade]) => ({
          itemPedidoId,
          quantidade,
        })),
      });
      setIsAberto(false);
      setEscolhidos({});
      setMotivo('');
      onSolicitada();
    } catch (erro) {
      setErros(erro instanceof ErroApi ? erro.mensagens : ['Falha ao solicitar a troca.']);
    } finally {
      setIsEnviando(false);
    }
  }

  if (!isAberto) {
    return (
      <div className={styles.trocaBloqueada}>
        <Button
          variant="outline"
          size="sm"
          data-testid="btn-solicitar-troca"
          onClick={() => setIsAberto(true)}
        >
          Solicitar troca
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.formTroca} data-testid="form-troca">
      <span className={styles.rotulo}>Solicitar troca</span>
      <Radio.Group value={modo} onChange={(valor) => setModo(valor as 'itens' | 'inteira')}>
        <div className={styles.modosTroca}>
          <Radio value="itens" label="Escolher os itens" data-testid="troca-modo-itens" />
          <Radio
            value="inteira"
            label="Trocar a compra inteira"
            disabled={!podeCompraInteira}
            data-testid="troca-modo-inteira"
          />
        </div>
      </Radio.Group>

      {modo === 'itens' &&
        pedido.itens
          .filter((item) => disponiveis[item.id] > 0)
          .map((item) => (
            <div key={item.id} className={styles.itemTroca}>
              <Checkbox
                checked={escolhidos[item.id] !== undefined}
                label={`${item.titulo} · ${item.artista}`}
                data-testid="troca-item"
                data-item-id={item.id}
                onChange={() => alternarItem(item.id)}
              />
              {escolhidos[item.id] !== undefined && disponiveis[item.id] > 1 && (
                <Quantidade
                  tamanho="sm"
                  valor={escolhidos[item.id]}
                  maximo={disponiveis[item.id]}
                  rotulo={`Unidades de ${item.titulo} para trocar`}
                  onChange={(valor) =>
                    setEscolhidos((atuais) => ({ ...atuais, [item.id]: valor }))
                  }
                />
              )}
            </div>
          ))}

      {modo === 'inteira' && (
        <span className={styles.nota}>
          Todos os discos desta compra vão para a troca, e o pedido passa a EM TROCA (RN0041).
        </span>
      )}

      <Textarea
        label="Motivo"
        placeholder="Conte o que aconteceu com o disco"
        autosize
        minRows={2}
        value={motivo}
        data-testid="troca-motivo"
        onChange={(evento) => setMotivo(evento.currentTarget.value)}
      />

      {erros.length > 0 && (
        <Alert color="red" data-testid="alerta-troca">
          {erros.map((mensagem) => (
            <div key={mensagem}>{mensagem}</div>
          ))}
        </Alert>
      )}

      <div className={styles.acoesTroca}>
        <Button
          size="sm"
          loading={isEnviando}
          data-testid="btn-enviar-troca"
          onClick={() => void handleEnviar()}
        >
          Enviar pedido de troca
        </Button>
        <Button size="sm" variant="default" onClick={() => setIsAberto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
