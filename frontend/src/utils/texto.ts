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
