// Remove acentos e caixa para que "juliana" encontre "Juliána"
export function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Compara telefone, CPF e códigos sem máscara: "1198765" encontra "(11) 98765-4321"
export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function contemTexto(campo: string, termo: string): boolean {
  return !termo.trim() || normalizar(campo).includes(normalizar(termo));
}

export function contemDigitos(campo: string, termo: string): boolean {
  const digitos = apenasDigitos(termo);
  return !digitos || apenasDigitos(campo).includes(digitos);
}

/*
 * Máscaras dos campos. Recebem o texto cru (com ou sem pontuação digitada) e
 * devolvem formatado, então colar "32165498700" ou digitar "321.654.987-00" dá
 * no mesmo.
 */
export function mascararCpf(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function mascararCep(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Número sem DDD: 9765-4321 ou 97654-3210. */
export function mascararNumeroTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 9);
  if (d.length <= 4) return d;
  const corte = d.length === 9 ? 5 : 4;
  return `${d.slice(0, corte)}-${d.slice(corte)}`;
}

/** Telefone com DDD: (11) 97654-3210. */
export function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  return `(${d.slice(0, 2)}) ${mascararNumeroTelefone(d.slice(2))}`;
}

export function mascararNumeroCartao(valor: string): string {
  return apenasDigitos(valor)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function mascararData(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
