import type { ItemCarrinho } from '../types/carrinho';
import type { Disco } from '../types/disco';

/**
 * RN0044: parâmetros do bloqueio temporário. O prazo conta a partir do último
 * item incluído, não do primeiro, e o aviso sai 5 minutos antes de expirar.
 */
export const PRAZO_BLOQUEIO_MINUTOS = 15;
export const AVISO_ANTES_MINUTOS = 5;

export interface AjusteCarrinho {
  discoId: number;
  titulo: string;
  quantidadeAnterior: number;
  quantidadeNova: number;
}

/**
 * RN0032: o estoque pode ter mudado depois que o item entrou no carrinho.
 * Reduz o que passou do disponível e remove o que zerou, devolvendo a lista de
 * ajustes para a tela avisar o cliente em vez de mudar tudo em silêncio.
 */
export function ajustarAoEstoque(
  carrinho: ItemCarrinho[],
  discos: Disco[],
): { carrinho: ItemCarrinho[]; ajustes: AjusteCarrinho[] } {
  const ajustes: AjusteCarrinho[] = [];
  const ajustado: ItemCarrinho[] = [];

  for (const item of carrinho) {
    const disco = discos.find((candidato) => candidato.id === item.discoId);
    const disponivel = disco?.isAtivo ? disco.estoque : 0;

    if (disponivel >= item.quantidade) {
      ajustado.push(item);
      continue;
    }

    ajustes.push({
      discoId: item.discoId,
      titulo: disco?.title ?? 'Disco indisponível',
      quantidadeAnterior: item.quantidade,
      quantidadeNova: disponivel,
    });

    if (disponivel > 0) {
      ajustado.push({ ...item, quantidade: disponivel });
    }
  }

  return { carrinho: ajustado, ajustes };
}

export function expiraEm(atualizadoEm: string | null): number | null {
  if (!atualizadoEm) return null;
  return new Date(atualizadoEm).getTime() + PRAZO_BLOQUEIO_MINUTOS * 60_000;
}

export function minutosRestantes(
  atualizadoEm: string | null,
  agora: number,
): number | null {
  const limite = expiraEm(atualizadoEm);
  if (limite === null) return null;

  // o relógio do provider anda de 15 em 15 segundos, então 'agora' fica para
  // trás e o arredondamento para cima estouraria o prazo (16 de 15 minutos)
  const restantes = Math.ceil((limite - agora) / 60_000);
  return Math.min(PRAZO_BLOQUEIO_MINUTOS, Math.max(0, restantes));
}

export function estaExpirado(atualizadoEm: string | null, agora: number): boolean {
  const limite = expiraEm(atualizadoEm);
  return limite !== null && agora >= limite;
}

/** RN0044: o cliente é avisado 5 minutos antes do bloqueio cair. */
export function deveAvisar(atualizadoEm: string | null, agora: number): boolean {
  const restantes = minutosRestantes(atualizadoEm, agora);
  return (
    restantes !== null && restantes > 0 && restantes <= AVISO_ANTES_MINUTOS
  );
}
