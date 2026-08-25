import type { Cupom } from '../types/cupom';
import type { Pedido, ValidacaoPagamento, VerificacaoPagamento } from '../types/pedido';
import { formatarBRL } from './precificacao';

/**
 * Sem integração com operadora, a resposta é simulada por uma regra fixa:
 * cartão cujo número termina neste dígito volta recusado. Determinístico de
 * propósito, para a apresentação conseguir mostrar aprovação e recusa quando
 * quiser, em vez de depender de sorte.
 */
export const FINAL_CARTAO_RECUSADO = '0';

/** RN0037: valida validade e veracidade dos cupons e o aceite da operadora. */
export function validarFormaDePagamento(
  pedido: Pedido,
  cupons: Cupom[],
  agora: Date,
): ValidacaoPagamento {
  const verificacoes: VerificacaoPagamento[] = [];

  for (const usado of pedido.cupons) {
    const cupom = cupons.find((candidato) => candidato.id === usado.cupomId);

    if (!cupom) {
      verificacoes.push({
        rotulo: `Cupom ${usado.codigo}`,
        ok: false,
        detalhe: 'Não consta na base de cupons emitidos.',
      });
      continue;
    }

    const doCliente =
      cupom.clienteId === null || cupom.clienteId === pedido.clienteId;

    if (!doCliente) {
      verificacoes.push({
        rotulo: `Cupom ${usado.codigo}`,
        ok: false,
        detalhe: 'Pertence a outro cliente.',
      });
      continue;
    }

    if (cupom.valor !== usado.valor) {
      verificacoes.push({
        rotulo: `Cupom ${usado.codigo}`,
        ok: false,
        detalhe: `Valor divergente: emitido por ${formatarBRL(cupom.valor)}.`,
      });
      continue;
    }

    verificacoes.push({
      rotulo: `Cupom ${usado.codigo}`,
      ok: true,
      detalhe: `Válido, ${formatarBRL(cupom.valor)}.`,
    });
  }

  for (const cartao of pedido.cartoes) {
    const recusado = cartao.ultimosDigitos.endsWith(FINAL_CARTAO_RECUSADO);

    verificacoes.push({
      rotulo: `${cartao.bandeira} •••• ${cartao.ultimosDigitos}`,
      ok: !recusado,
      detalhe: recusado
        ? `Operadora recusou a cobrança de ${formatarBRL(cartao.valor)}.`
        : `Operadora aprovou ${formatarBRL(cartao.valor)}.`,
    });
  }

  const pago =
    Math.round(
      (pedido.cupons.reduce((soma, c) => soma + c.valor, 0) +
        pedido.cartoes.reduce((soma, c) => soma + c.valor, 0)) *
        100,
    ) / 100;
  const fecha = Math.abs(pago - pedido.total) < 0.01;

  verificacoes.push({
    rotulo: 'Soma das formas de pagamento',
    ok: fecha,
    detalhe: fecha
      ? `${formatarBRL(pago)} para um total de ${formatarBRL(pedido.total)}.`
      : `${formatarBRL(pago)} não cobre o total de ${formatarBRL(pedido.total)}.`,
  });

  return {
    aprovado: verificacoes.every((v) => v.ok),
    data: agora.toISOString(),
    verificacoes,
  };
}
