import type { Cupom } from '../types/cupom';
import type { Disco } from '../types/disco';
import type { ItemCarrinho } from '../types/carrinho';

export function itensDoCarrinho(
  carrinho: ItemCarrinho[],
  discos: Disco[],
): { disco: Disco; quantidade: number }[] {
  return carrinho.flatMap((item) => {
    const disco = discos.find((candidato) => candidato.id === item.discoId);
    return disco ? [{ disco, quantidade: item.quantidade }] : [];
  });
}

export function calcularSubtotal(
  itens: { disco: Disco; quantidade: number }[],
): number {
  return arredondar(
    itens.reduce((soma, item) => soma + item.disco.price * item.quantidade, 0),
  );
}

export function cuponsDisponiveis(cupons: Cupom[], clienteId: string): Cupom[] {
  return cupons.filter(
    (cupom) =>
      !cupom.isUtilizado &&
      (cupom.clienteId === null || cupom.clienteId === clienteId),
  );
}

export function somarCupons(cupons: Cupom[]): number {
  return arredondar(cupons.reduce((soma, cupom) => soma + cupom.valor, 0));
}

export function ultimosDigitos(numero: string): string {
  return numero.replace(/\D/g, '').slice(-4);
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Divide o restante entre os cartões; os centavos que sobram ficam no primeiro. */
export function dividirIgualmente(restante: number, cartaoIds: string[]): Record<string, number> {
  if (cartaoIds.length === 0) return {};

  const restanteCentavos = Math.round(restante * 100);
  const baseCentavos = Math.floor(restanteCentavos / cartaoIds.length);
  const sobraCentavos = restanteCentavos - baseCentavos * cartaoIds.length;

  return Object.fromEntries(
    cartaoIds.map((id, indice) => [id, (baseCentavos + (indice === 0 ? sobraCentavos : 0)) / 100]),
  );
}

/**
 * Com dois cartões, editar um recalcula o outro para fechar o restante. Com
 * três ou mais não há um "outro" óbvio, então só o editado muda. O valor pode
 * vir como texto do campo (vazio enquanto se digita) e aí conta como zero.
 */
export function redistribuir(
  valores: Record<string, number | string>,
  restante: number,
  cartaoIds: string[],
  editadoId: string,
  valor: number | string,
): Record<string, number | string> {
  const novos = { ...valores, [editadoId]: valor };
  if (cartaoIds.length === 2) {
    const outroId = cartaoIds.find((id) => id !== editadoId);
    if (outroId) novos[outroId] = arredondar(Math.max(0, restante - (Number(valor) || 0)));
  }
  return novos;
}
