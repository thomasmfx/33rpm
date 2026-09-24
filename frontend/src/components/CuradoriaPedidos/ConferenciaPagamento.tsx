import styles from './CuradoriaPedidos.module.scss';
import { Button } from '@mantine/core';
import type { Cupom } from '../../types/cupom';
import type { Pedido, ValidacaoPagamento } from '../../types/pedido';
import { validarFormaDePagamento } from '../../utils/pagamento';
import { formatarBRL } from '../../utils/precificacao';
import { Checkmark, Close } from '@carbon/icons-react';

interface ConferenciaPagamentoProps {
  pedido: Pedido;
  cupons: Cupom[];
  onConfirmar: (validacao: ValidacaoPagamento) => void;
}

export default function ConferenciaPagamento({
  pedido,
  cupons,
  onConfirmar,
}: Readonly<ConferenciaPagamentoProps>) {
  // roda no clique, não no render: new Date() no corpo do componente é impuro
  function handleConfirmar(): void {
    onConfirmar(validarFormaDePagamento(pedido, cupons, new Date()));
  }

  const previa = validarFormaDePagamento(pedido, cupons, new Date(pedido.data));

  return (
    <div className={styles.caixa}>
      <div className={styles.caixaCabecalho}>
        <strong>Conferência de pagamento</strong>
        <span className={styles.nota}>
          A RN0037 exige conferir a validade dos cupons e o aceite da operadora
          antes de dar a compra por paga. Sem integração real, a resposta da
          operadora é simulada.
        </span>
      </div>

      {previa.verificacoes.map((verificacao) => (
        <div key={verificacao.rotulo} className={styles.verificacao}>
          <span
            className={styles.marca}
            data-falhou={!verificacao.ok || undefined}
            aria-label={verificacao.ok ? 'Conferido' : 'Falhou'}
          >
            {verificacao.ok ? <Checkmark size={12} /> : <Close size={12} />}
          </span>
          <div className={styles.verificacaoTexto}>
            <strong>{verificacao.rotulo}</strong>
            <span>{verificacao.detalhe}</span>
          </div>
        </div>
      ))}

      <span className={styles.nota}>
        {previa.aprovado
          ? `Tudo conferido. A compra de ${formatarBRL(pedido.total)} passa a PAGAMENTO REALIZADO.`
          : 'Alguma verificação falhou. A compra passa a PAGAMENTO RECUSADO e os itens voltam ao estoque (RN0028).'}
      </span>

      {/* RN0038: quem decide aprovação ou recusa é a conferência, não o clique */}
      <div className={styles.botoesCaixa}>
        <Button size="sm" disabled={!previa.aprovado} onClick={handleConfirmar}>
          Confirmar pagamento
        </Button>
        <Button
          size="sm"
          variant="default"
          className={styles.botaoRecusa}
          disabled={previa.aprovado}
          onClick={handleConfirmar}
        >
          Registrar recusa
        </Button>
      </div>
    </div>
  );
}
