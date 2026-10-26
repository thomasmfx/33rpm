/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

// ids dos cupons recriados pelo /dev/reset, na ordem da carga
const CUPOM = { troca300: 1, troca45: 2, promo20: 3, promo50: 4 };

const CARTAO_AVULSO = {
  numero: '5555444433332222',
  nomeImpresso: 'ANA P RIBEIRO',
  codigoSeguranca: '456',
  bandeira: { desc: 'Mastercard' },
};

/** Pedido direto na API, para provar que a regra mora no servidor e não só na tela. */
function postarPedido(titulo: string, corpo: Record<string, unknown>) {
  return cy.discoPorTitulo(titulo).then((disco) =>
    cy.request({
      method: 'POST',
      url: `${API()}/pedidos`,
      failOnStatusCode: false,
      body: { clienteId: 1, itens: [{ discoId: disco.id, quantidade: 1 }], enderecoId: 1, ...corpo },
    }),
  );
}

function esperarRecusa(titulo: string, corpo: Record<string, unknown>, mensagem: string): void {
  postarPedido(titulo, corpo).then((resposta) => {
    expect(resposta.status).to.eq(400);
    expect(resposta.body.mensagens).to.include(mensagem);
  });
  // nada é gravado quando uma regra falha
  cy.request(`${API()}/pedidos?clienteId=1`).its('body').should('have.length', 0);
}

/** Um disco para a Ana em São Paulo: o preço mais R$ 28,00 de frete. */
function irAoPagamento(titulo: string, total: number): void {
  cy.adicionarAoCarrinho(titulo, 1);
  cy.irParaPagamento('Casa');
  cy.conferirValor('resumo-total', total);
}

describe('Pagamento com cartões e cupons (RF0036, RF0037, RN0033 a RN0036)', () => {
  it('RN0034 - paga com dois cartões, cada um com ao menos R$ 10,00', () => {
    cy.cadastrarSegundoCartao();
    cy.entrarComoCliente('/');
    irAoPagamento('Diamond Life', 277);

    cy.marcarCartao('1002');
    cy.marcarCartao('5100');
    // com dois cartões o segundo cobre o que falta: R$ 272,00 + R$ 5,00
    cy.valorNoCartao('1002', '272');
    cy.get('[data-testid="pendencias-pagamento"]').should(
      'contain',
      'RN0034: cada cartão precisa receber ao menos R$ 10,00.',
    );
    cy.get('[data-testid="btn-pagar"]').should('be.disabled');

    cy.valorNoCartao('1002', '267');
    cy.get('[data-testid="pendencias-pagamento"]').should('not.exist');

    cy.finalizarPedido().then((id) => {
      cy.request(`${API()}/pedidos/${id}`)
        .its('body.pagamentos')
        .then((pagamentos: { valor: number }[]) => {
          const valores = pagamentos.map((pagamento) => pagamento.valor).sort((a, b) => a - b);
          expect(valores).to.deep.eq([10, 267]);
        });
    });
  });

  it('RN0034 - o servidor recusa cartão abaixo de R$ 10,00 quando não há cupom', () => {
    // R$ 259,00 + R$ 28,00 = R$ 287,00
    esperarRecusa(
      'Ride The Lightning',
      { pagamentos: [{ cartaoId: 1, valor: 282 }, { cartaoNovo: CARTAO_AVULSO, valor: 5 }] },
      'RN0034: cada cartão precisa receber ao menos R$ 10,00.',
    );
  });

  it('RF0037 e RN0035 - com cupom, a sobra abaixo de R$ 10,00 vai em um único cartão', () => {
    cy.cadastrarSegundoCartao();
    cy.entrarComoCliente('/');
    irAoPagamento('Back To Black', 307);

    cy.selecionarCupom('TROCA-AP-300');
    cy.marcarCartao('1002');
    cy.marcarCartao('5100');
    cy.get('[data-testid="pendencias-pagamento"]').should('contain', 'RN0035');
    cy.get('[data-testid="btn-pagar"]').should('be.disabled');

    cy.get('[data-testid="cartao-opcao"][data-final="5100"] [data-testid="cartao-checkbox"]').uncheck({
      force: true,
    });
    cy.get('[data-testid="pendencias-pagamento"]').should('not.exist');
    cy.get('[data-testid="btn-pagar"]').should('contain', '7,00');

    cy.finalizarPedido().then((id) => {
      cy.request(`${API()}/pedidos/${id}`)
        .its('body')
        .then((pedido) => {
          expect(pedido.total).to.eq(307);
          expect(pedido.cupons.map((cupom: { codigo: string }) => cupom.codigo)).to.deep.eq(['TROCA-AP-300']);
          expect(pedido.pagamentos).to.have.length(1);
          expect(pedido.pagamentos[0]).to.include({ finalNumero: '1002', valor: 7 });
        });
    });

    cy.request(`${API()}/cupons?clienteId=1`)
      .its('body')
      .then((cupons: { codigo: string; isUtilizado: boolean }[]) => {
        expect(cupons.find((cupom) => cupom.codigo === 'TROCA-AP-300')?.isUtilizado).to.eq(true);
      });
  });

  it('RN0035 - o servidor recusa dividir a sobra abaixo de R$ 10,00 em dois cartões', () => {
    // R$ 279,00 + R$ 28,00 = R$ 307,00, menos o cupom de R$ 300,00
    esperarRecusa(
      'AM',
      {
        cupons: [{ id: CUPOM.troca300 }],
        pagamentos: [{ cartaoId: 1, valor: 4 }, { cartaoNovo: CARTAO_AVULSO, valor: 3 }],
      },
      'RN0035: com cupons, a sobra de R$ 7,00 fica em um único cartão.',
    );
  });

  it('RN0036 - cupons acima do total geram, na aprovação, um cupom de troca com a diferença', () => {
    cy.entrarComoCliente('/');
    irAoPagamento('The Dark Side Of The Moon', 327);

    // R$ 300,00 + R$ 50,00 = R$ 350,00 para R$ 327,00; nenhum dos dois sobra sozinho
    cy.selecionarCupom('TROCA-AP-300');
    cy.selecionarCupom('PROMO-AP-50');
    cy.conferirValor('aviso-troco', 23);
    cy.get('[data-testid="pendencias-pagamento"]').should('not.exist');
    cy.get('[data-testid="cartao-opcao"]').should('not.exist');

    cy.finalizarPedido().then((id) => {
      const codigo = `TROCA-P${String(id).padStart(6, '0')}`;
      cy.conferirValor('aviso-diferenca', 23);
      cy.request(`${API()}/pedidos/${id}`)
        .its('body')
        .then((pedido) => {
          expect(pedido.pagamentos).to.have.length(0);
          expect(pedido.troco).to.eq(23);
          expect(pedido.cupomGerado, 'antes da aprovação').to.eq(undefined);
        });

      cy.validarPagamentos();
      cy.request(`${API()}/pedidos/${id}`)
        .its('body.cupomGerado')
        .should('include', { codigo, valor: 23, isUtilizado: false });

      cy.visit('/cupons');
      cy.get(`[data-testid="cupom-cartao"][data-codigo="${codigo}"]`)
        .should('have.attr', 'data-tipo', 'troca')
        .and('have.attr', 'data-utilizado', 'false');
      cy.get('[data-testid="cupom-cartao"][data-codigo="TROCA-AP-300"]').should(
        'have.attr',
        'data-utilizado',
        'true',
      );
      cy.get('[data-testid="cupom-cartao"][data-codigo="PROMO-AP-50"]').should(
        'have.attr',
        'data-utilizado',
        'true',
      );
    });
  });

  it('RN0036 - recusa cupom dispensável, na tela e no servidor', () => {
    cy.entrarComoCliente('/');
    irAoPagamento('Let God Sort Em Out', 327);

    // sem o de R$ 20,00 os outros dois ainda somam R$ 345,00
    cy.selecionarCupom('TROCA-AP-300');
    cy.selecionarCupom('TROCA-AP-045');
    cy.selecionarCupom('PROMO-AP-20');
    const mensagem = 'RN0036: o cupom PROMO-AP-20 é dispensável — os demais já cobrem o total.';
    cy.get('[data-testid="pendencias-pagamento"]').should('contain', mensagem);
    cy.get('[data-testid="btn-pagar"]').should('be.disabled');

    esperarRecusa(
      'Let God Sort Em Out',
      { cupons: [{ id: CUPOM.troca300 }, { id: CUPOM.troca45 }, { id: CUPOM.promo20 }] },
      mensagem,
    );
  });

  it('RN0033 - apenas um cupom promocional por compra, na tela e no servidor', () => {
    cy.entrarComoCliente('/');
    irAoPagamento('Maggot Brain', 347);

    cy.selecionarCupom('PROMO-AP-20');
    cy.selecionarCupom('PROMO-AP-50');
    const mensagem = 'RN0033: apenas um cupom promocional por compra.';
    cy.get('[data-testid="pendencias-pagamento"]').should('contain', mensagem);
    cy.get('[data-testid="btn-pagar"]').should('be.disabled');

    esperarRecusa(
      'Maggot Brain',
      {
        cupons: [{ id: CUPOM.promo20 }, { id: CUPOM.promo50 }],
        pagamentos: [{ cartaoId: 1, valor: 277 }],
      },
      mensagem,
    );
  });
});
