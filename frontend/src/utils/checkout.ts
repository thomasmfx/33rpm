import type { Cartao, Endereco } from '../types/cliente';
import type { Cupom } from '../types/cupom';
import type { Disco } from '../types/disco';
import type { ItemCarrinho } from '../types/carrinho';
import type { ItemPedido, PagamentoCartao, PagamentoCupom } from '../types/pedido';

/** RN0034 */
export const VALOR_MINIMO_CARTAO = 10;

const FRETE_POR_REGIAO: Record<string, number> = {
  Sudeste: 20,
  Sul: 25,
  'Centro-Oeste': 30,
  Nordeste: 35,
  Norte: 45,
};

const REGIAO_POR_ESTADO: Record<string, string> = {
  SP: 'Sudeste', RJ: 'Sudeste', MG: 'Sudeste', ES: 'Sudeste',
  PR: 'Sul', SC: 'Sul', RS: 'Sul',
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste',
  BA: 'Nordeste', SE: 'Nordeste', AL: 'Nordeste', PE: 'Nordeste', PB: 'Nordeste',
  RN: 'Nordeste', CE: 'Nordeste', PI: 'Nordeste', MA: 'Nordeste',
  AM: 'Norte', PA: 'Norte', AC: 'Norte', RO: 'Norte', RR: 'Norte',
  AP: 'Norte', TO: 'Norte',
};

export function regiaoDoEstado(estado: string): string {
  return REGIAO_POR_ESTADO[estado] ?? 'Sudeste';
}

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

/** RF0034: frete sai da região do endereço mais o peso somado dos discos. */
export function calcularFrete(
  itens: { disco: Disco; quantidade: number }[],
  endereco: Endereco | null,
): number {
  if (!endereco || itens.length === 0) return 0;

  const pesoTotal = itens.reduce(
    (soma, item) => soma + item.disco.dimensoes.peso * item.quantidade,
    0,
  );
  const base = FRETE_POR_REGIAO[regiaoDoEstado(endereco.estado)];

  return arredondar(base + Math.ceil(pesoTotal / 1000) * 8);
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

/**
 * RN0033 e RN0036: um promocional por compra, e nenhum cupom pode ser
 * dispensável — se dá para tirar um e o total ainda fecha, a seleção é inválida.
 */
export function validarCupons(
  selecionados: Cupom[],
  total: number,
): string | null {
  const promocionais = selecionados.filter(
    (cupom) => cupom.tipo === 'promocional',
  );
  if (promocionais.length > 1) {
    return 'RN0033: apenas um cupom promocional por compra.';
  }

  const soma = somarCupons(selecionados);
  const dispensavel = selecionados.find(
    (cupom) => soma - cupom.valor >= total,
  );
  if (dispensavel) {
    return `RN0036: o cupom ${dispensavel.codigo} é dispensável — os demais já cobrem o total.`;
  }

  return null;
}

/** RN0036: cupons que superam o total viram um cupom de troca com a diferença. */
export function trocoDosCupons(selecionados: Cupom[], total: number): number {
  return arredondar(Math.max(0, somarCupons(selecionados) - total));
}

export function valorRestante(selecionados: Cupom[], total: number): number {
  return arredondar(Math.max(0, total - somarCupons(selecionados)));
}

/**
 * RN0034: cada cartão precisa de ao menos R$ 10,00.
 * RN0035: com cupons na jogada, um único cartão pode ficar abaixo disso para
 * fechar a sobra — o exemplo do DRS é R$ 30 em cupom e R$ 5 no cartão.
 */
export function validarCartoes(
  cartoes: PagamentoCartao[],
  restante: number,
  usouCupom: boolean,
): string | null {
  if (restante === 0) return cartoes.length > 0 ? 'Não há valor a pagar no cartão.' : null;
  if (cartoes.length === 0) return 'Selecione ao menos um cartão para o valor restante.';

  const abaixoDoMinimo = cartoes.filter(
    (cartao) => cartao.valor < VALOR_MINIMO_CARTAO,
  );

  if (abaixoDoMinimo.length > 0) {
    if (!usouCupom) {
      return `RN0034: cada cartão precisa receber ao menos R$ ${VALOR_MINIMO_CARTAO},00.`;
    }
    if (abaixoDoMinimo.length > 1) {
      return 'RN0035: só um cartão pode ficar abaixo do mínimo, para cobrir a sobra dos cupons.';
    }
  }

  if (cartoes.some((cartao) => cartao.valor <= 0)) {
    return 'Todo cartão selecionado precisa receber algum valor.';
  }

  const somaCartoes = arredondar(
    cartoes.reduce((soma, cartao) => soma + cartao.valor, 0),
  );
  if (somaCartoes !== restante) {
    return `Os cartões somam R$ ${somaCartoes.toFixed(2)} e o valor restante é R$ ${restante.toFixed(2)}.`;
  }

  return null;
}

export function montarItensPedido(
  itens: { disco: Disco; quantidade: number }[],
): ItemPedido[] {
  return itens.map(({ disco, quantidade }) => ({
    discoId: disco.id,
    titulo: disco.title,
    artista: disco.artist,
    coverSrc: disco.coverSrc,
    precoUnitario: disco.price,
    quantidade,
  }));
}

export function montarPagamentoCupons(selecionados: Cupom[]): PagamentoCupom[] {
  return selecionados.map((cupom) => ({
    cupomId: cupom.id,
    codigo: cupom.codigo,
    valor: cupom.valor,
  }));
}

export function ultimosDigitos(numero: string): string {
  return numero.replace(/\D/g, '').slice(-4);
}

export function montarPagamentoCartao(cartao: Cartao, valor: number): PagamentoCartao {
  return {
    cartaoId: cartao.id,
    bandeira: cartao.bandeira,
    ultimosDigitos: ultimosDigitos(cartao.numero),
    valor,
  };
}

/** RF0053: a venda desconta do estoque os itens comprados. */
export function darBaixaEmEstoque(discos: Disco[], itens: ItemPedido[]): Disco[] {
  return discos.map((disco) => {
    const item = itens.find((candidato) => candidato.discoId === disco.id);
    return item
      ? { ...disco, estoque: Math.max(0, disco.estoque - item.quantidade) }
      : disco;
  });
}

/** RN0032: o estoque pode ter mudado entre o carrinho e a finalização. */
export function itensIndisponiveis(
  itens: { disco: Disco; quantidade: number }[],
): { disco: Disco; quantidade: number }[] {
  return itens.filter((item) => item.quantidade > item.disco.estoque);
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}
