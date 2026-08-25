import type { Cartao, Endereco, Telefone, TipoEndereco } from '../types/cliente';

export function telefoneCompleto(telefone: Telefone): string {
  return `(${telefone.ddd}) ${telefone.numero}`;
}

export function formatarTelefone(telefone: Telefone): string {
  return `${telefone.tipo} — (${telefone.ddd}) ${telefone.numero}`;
}

export function atendeTipo(endereco: Endereco, tipo: TipoEndereco): boolean {
  return endereco.tipo === tipo || endereco.tipo === 'ambos';
}

/** RN0021 e RN0022: o cliente precisa de ao menos um de cada tipo. */
export function temEnderecoDe(enderecos: Endereco[], tipo: TipoEndereco): boolean {
  return enderecos.some((endereco) => atendeTipo(endereco, tipo));
}

export function tiposFaltando(enderecos: Endereco[]): TipoEndereco[] {
  const faltando: TipoEndereco[] = [];
  if (!temEnderecoDe(enderecos, 'entrega')) faltando.push('entrega');
  if (!temEnderecoDe(enderecos, 'cobranca')) faltando.push('cobranca');
  return faltando;
}

/** Remover não pode deixar o cliente sem entrega ou sem cobrança. */
export function motivoBloqueioRemocao(
  enderecos: Endereco[],
  enderecoId: string,
): string | null {
  const restantes = enderecos.filter((endereco) => endereco.id !== enderecoId);

  if (!temEnderecoDe(restantes, 'entrega')) {
    return 'É o único endereço de entrega do cliente (RN0022).';
  }
  if (!temEnderecoDe(restantes, 'cobranca')) {
    return 'É o único endereço de cobrança do cliente (RN0021).';
  }
  return null;
}

/** RF0027: marcar um preferencial desmarca os outros. */
export function definirPreferencial(cartoes: Cartao[], cartaoId: string): Cartao[] {
  return cartoes.map((cartao) => ({
    ...cartao,
    isPreferencial: cartao.id === cartaoId,
  }));
}

/** Remover o preferencial promove o primeiro que sobrar, para nunca ficar sem. */
export function removerCartao(cartoes: Cartao[], cartaoId: string): Cartao[] {
  const restantes = cartoes.filter((cartao) => cartao.id !== cartaoId);

  return restantes.some((cartao) => cartao.isPreferencial) || restantes.length === 0
    ? restantes
    : definirPreferencial(restantes, restantes[0].id);
}

export function adicionarCartao(cartoes: Cartao[], novo: Cartao): Cartao[] {
  const base = novo.isPreferencial || cartoes.length === 0
    ? cartoes.map((cartao) => ({ ...cartao, isPreferencial: false }))
    : cartoes;

  return [...base, { ...novo, isPreferencial: novo.isPreferencial || cartoes.length === 0 }];
}

/** Editar um cartão não pode deixar a lista sem preferencial nem com dois. */
export function atualizarCartao(cartoes: Cartao[], atualizado: Cartao): Cartao[] {
  const substituidos = cartoes.map((cartao) =>
    cartao.id === atualizado.id ? atualizado : cartao,
  );

  if (atualizado.isPreferencial) {
    return definirPreferencial(substituidos, atualizado.id);
  }

  return substituidos.some((cartao) => cartao.isPreferencial)
    ? substituidos
    : definirPreferencial(substituidos, substituidos[0].id);
}

export function mascararCartao(numero: string): string {
  const digitos = numero.replace(/\D/g, '');
  return digitos.length >= 4 ? `•••• ${digitos.slice(-4)}` : '••••';
}

export function resumirEndereco(endereco: Endereco): string {
  return `${endereco.logradouro}, ${endereco.numero} — ${endereco.bairro}, ${endereco.cidade}/${endereco.estado}`;
}

export const ROTULO_TIPO_ENDERECO: Record<TipoEndereco, string> = {
  entrega: 'Entrega',
  cobranca: 'Cobrança',
  ambos: 'Entrega e cobrança',
};
