import type { Disco } from '../types/disco';

export const PARAMETRO_INATIVACAO_AUTOMATICA = { diasSemVenda: 90 };

/** Até aqui a vitrine avisa "Últimas N" e a curadoria marca estoque baixo. */
export const LIMITE_ESTOQUE_BAIXO = 2;

export function estoqueAcabando(estoque: number): boolean {
  return estoque > 0 && estoque <= LIMITE_ESTOQUE_BAIXO;
}

/** RN0015 e RN0017: a justificativa da mudança de status precisa dizer algo. */
export const JUSTIFICATIVA_MINIMA_STATUS = 10;

export function diasDesde(dataIso: string | null, hoje: Date): number | null {
  if (!dataIso) return null;
  const diff = hoje.getTime() - new Date(`${dataIso}T00:00:00`).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function paraIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function formatarDataBR(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Nunca vendido conta como parado, como na RF0013. */
export function estaParado(disco: Disco, hoje: Date): boolean {
  const dias = diasDesde(disco.ultimaVendaEm, hoje);
  return dias === null || dias >= PARAMETRO_INATIVACAO_AUTOMATICA.diasSemVenda;
}
