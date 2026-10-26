/** RN0044: contagem regressiva em segundos até o bloqueio do carrinho vencer. */
export function segundosRestantes(expiraEm: number | null, agora: number): number | null {
  if (expiraEm === null) return null;
  return Math.max(0, Math.floor((expiraEm - agora) / 1000));
}

export function formatarContagem(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  return `${String(minutos).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
}
