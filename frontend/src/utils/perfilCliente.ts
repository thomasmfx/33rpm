import type { Cartao, Endereco, Telefone, TipoEndereco } from '../types/cliente';
import { mascararNumeroTelefone } from './texto';

export function telefoneCompleto(telefone: Telefone): string {
  return `(${telefone.ddd}) ${mascararNumeroTelefone(telefone.numero)}`;
}

export function formatarTelefone(telefone: Telefone): string {
  return `${telefone.tipo} — ${telefoneCompleto(telefone)}`;
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

/*
 * Prefixos (BIN) das bandeiras do RN0025. Elo e Hipercard vêm antes porque
 * parte dos BINs deles começa com 4 e 5, que casariam com Visa e Mastercard.
 */
const PREFIXOS_BANDEIRA: [string, RegExp][] = [
  ['Elo', /^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/],
  ['Hipercard', /^(606282|3841)/],
  ['American Express', /^3[47]/],
  ['Diners Club', /^3(0[0-5]|[68])/],
  ['Visa', /^4/],
  ['Mastercard', /^(5[1-5]|2[2-7])/],
];

export function detectarBandeira(numero: string): string | null {
  const digitos = numero.replace(/\D/g, '');
  if (digitos.length < 4) return null;
  return PREFIXOS_BANDEIRA.find(([, prefixo]) => prefixo.test(digitos))?.[0] ?? null;
}

export function linhaDoEndereco(endereco: Endereco): string {
  return `${endereco.tipoLogradouro} ${endereco.logradouro}, ${endereco.numero} · ${endereco.bairro}, ${endereco.cidade} · ${endereco.estado}`;
}
