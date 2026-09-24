/** RNF0031: a mesma regra do servidor, quebrada em itens para o checklist. */
export const REGRAS_SENHA: { rotulo: string; atende: (senha: string) => boolean }[] = [
  { rotulo: '8 ou mais caracteres', atende: (senha) => senha.length >= 8 },
  { rotulo: 'Uma letra maiúscula', atende: (senha) => /[A-Z]/.test(senha) },
  { rotulo: 'Uma letra minúscula', atende: (senha) => /[a-z]/.test(senha) },
  { rotulo: 'Um caractere especial', atende: (senha) => /\W/.test(senha) },
];

export function senhaForte(senha: string): boolean {
  return REGRAS_SENHA.every((regra) => regra.atende(senha));
}
