/// <reference types="cypress" />

import type { DadosCartao, DadosEndereco } from '../../support/commands';

const API = () => Cypress.env('apiUrl');

/** Entra no checkout com um disco no carrinho e entrega num endereço novo, em Salvador. */
function entregarEmEnderecoNovo(
  titulo: string,
  total: number,
  endereco: DadosEndereco,
  salvarNoPerfil: boolean,
): void {
  cy.adicionarAoCarrinho(titulo, 1);
  cy.get('[data-testid="link-carrinho"]').click();
  cy.get('[data-testid="btn-finalizar-compra"]').click();

  cy.get('[data-testid="btn-entregar-outro-endereco"]').click();
  cy.preencherEndereco(endereco);
  if (salvarNoPerfil) {
    cy.get('[data-testid="checkbox-salvar-endereco"]').check({ force: true });
  }
  cy.get('[data-testid="btn-salvar-endereco"]').click();
  cy.contains('[data-testid="opcao-endereco"]', endereco.nome).should('be.visible');

  cy.get('[data-testid="btn-continuar-entrega"]').click();
  // RF0034: Nordeste (R$ 35,00) + 1 kg iniciado (R$ 8,00)
  cy.conferirValor('frete-valor', 43);
  cy.get('[data-testid="btn-continuar-pagamento"]').click();
  cy.conferirValor('resumo-total', total);
}

function pagarComCartaoNovo(cartao: DadosCartao, salvarNoPerfil: boolean): void {
  cy.get('[data-testid="btn-adicionar-cartao-checkout"]').click();
  cy.preencherCartao(cartao);
  if (salvarNoPerfil) {
    cy.get('[data-testid="checkbox-salvar-cartao"]').check({ force: true });
  }
  cy.get('[data-testid="btn-salvar-cartao"]').click();
  cy.get('[data-testid="cartao-opcao"][data-final="2222"] [data-testid="cartao-checkbox"]').should(
    'be.checked',
  );
}

describe('Realização da compra (RF0033, RF0034, RF0035, RF0036, RF0038)', () => {
  beforeEach(() => {
    // o ViaCEP é externo; sem resposta o formulário fica com o que o teste digitou
    cy.intercept('GET', 'https://viacep.com.br/ws/**', { body: { erro: true } });
    cy.entrarComoCliente('/');
  });

  it('RF0033, RF0034 e RF0038 - compra com endereço e cartão já cadastrados', () => {
    cy.adicionarAoCarrinho('Culture II', 1);
    cy.adicionarAoCarrinho('Random Access Memories', 1);
    cy.irParaPagamento('Casa');

    // RF0034: Sudeste (R$ 20,00) + 2 kg iniciados (R$ 16,00) sobre 700 g + 480 g
    cy.conferirValor('resumo-subtotal', 908);
    cy.conferirValor('resumo-frete', 36);
    cy.conferirValor('resumo-total', 944);

    cy.marcarCartao('1002');
    cy.finalizarPedido().then((id) => {
      cy.location('pathname').should('eq', `/pedidos/${id}/confirmacao`);
      cy.get('[data-testid="pedido-status"]').should('have.attr', 'data-status', 'EM PROCESSAMENTO');

      cy.request(`${API()}/pedidos/${id}`)
        .its('body')
        .then((pedido) => {
          expect(pedido.status.descricao).to.eq('EM PROCESSAMENTO');
          expect(pedido).to.include({ subtotal: 908, frete: 36, total: 944, enderecoId: 1 });
          expect(pedido.enderecoEntrega).to.include({ nome: 'Casa', uf: 'SP' });
          const itens: { titulo: string; quantidade: number; precoUnitario: number }[] = pedido.itens;
          expect(itens.map((item) => item.titulo)).to.have.members(['Culture II', 'Random Access Memories']);
          expect(itens.find((item) => item.titulo === 'Culture II')).to.include({
            quantidade: 1,
            precoUnitario: 479,
          });
          expect(pedido.pagamentos).to.have.length(1);
          expect(pedido.pagamentos[0]).to.include({ cartaoId: 1, finalNumero: '1002', valor: 944 });
        });
    });

    // a compra esvazia o carrinho
    cy.visit('/carrinho');
    cy.get('[data-testid="item-carrinho"]').should('not.exist');
  });

  it('RF0035 e RF0036 - novo endereço e novo cartão cadastrados na compra e incorporados ao perfil', () => {
    cy.fixture('compra').then(({ enderecoNovo, cartaoNovo }) => {
      // R$ 269,00 + R$ 43,00 de frete
      entregarEmEnderecoNovo('África Brasil', 312, enderecoNovo, true);
      pagarComCartaoNovo(cartaoNovo, true);

      cy.finalizarPedido().then((id) => {
        cy.request(`${API()}/pedidos/${id}`)
          .its('body')
          .then((pedido) => {
            expect(pedido.total).to.eq(312);
            expect(pedido.enderecoEntrega).to.include({
              nome: 'Casa da Bahia',
              cidade: 'Salvador',
              uf: 'BA',
            });
            expect(pedido.enderecoId, 'endereço do perfil').to.be.a('number');
            expect(pedido.pagamentos[0]).to.include({ finalNumero: '2222', valor: 312 });
            expect(pedido.pagamentos[0].cartaoId, 'cartão do perfil').to.be.a('number');
          });
      });

      cy.request(`${API()}/clientes/1`)
        .its('body')
        .then((cliente) => {
          const nomes = cliente.enderecos.map((endereco: { nome: string }) => endereco.nome);
          expect(nomes).to.have.members(['Casa', 'Casa da Bahia']);
          expect(cliente.cartoes).to.have.length(2);
          const novo = cliente.cartoes.find(
            (cartao: { numero: string }) => cartao.numero === '5555444433332222',
          );
          expect(novo.isPreferencial, 'RF0027: o preferencial continua o Visa').to.eq(false);
        });
    });
  });

  it('RF0035 e RF0036 - endereço e cartão novos usados só neste pedido não entram no perfil', () => {
    cy.fixture('compra').then(({ enderecoNovo, cartaoNovo }) => {
      // R$ 379,00 + R$ 43,00 de frete
      entregarEmEnderecoNovo('Nada Como Um Dia Após O Outro Dia', 422, enderecoNovo, false);
      pagarComCartaoNovo(cartaoNovo, false);

      cy.finalizarPedido().then((id) => {
        cy.request(`${API()}/pedidos/${id}`)
          .its('body')
          .then((pedido) => {
            expect(pedido.enderecoEntrega.nome).to.eq('Casa da Bahia');
            expect(pedido.enderecoId).to.eq(undefined);
            expect(pedido.pagamentos[0]).to.include({ finalNumero: '2222', valor: 422 });
            expect(pedido.pagamentos[0].cartaoId).to.eq(undefined);
          });
      });

      cy.request(`${API()}/clientes/1`)
        .its('body')
        .then((cliente) => {
          expect(cliente.enderecos).to.have.length(1);
          expect(cliente.cartoes).to.have.length(1);
        });
    });
  });

  it('RN0023, RN0024 e RN0025 - o servidor recusa endereço e cartão novos incompletos', () => {
    cy.discoPorTitulo('Purple Rain').then((disco) => {
      cy.request({
        method: 'POST',
        url: `${API()}/pedidos`,
        failOnStatusCode: false,
        body: {
          clienteId: 1,
          itens: [{ discoId: disco.id, quantidade: 1 }],
          enderecoNovo: {
            nome: 'Sem bairro',
            tipoResidencia: 'Casa',
            tipoLogradouro: 'Rua',
            logradouro: 'da Paciência',
            numero: '88',
            bairro: '',
            cep: '41940050',
            pais: 'Brasil',
            cidade: { desc: 'Salvador', estado: { desc: 'BA' } },
          },
          pagamentos: [
            {
              cartaoNovo: {
                numero: '123',
                nomeImpresso: 'ANA P RIBEIRO',
                codigoSeguranca: '456',
                bandeira: { desc: 'Visa' },
              },
              valor: 332,
            },
          ],
        },
      }).then((resposta) => {
        expect(resposta.status).to.eq(400);
        expect(resposta.body.mensagens).to.include.members([
          "Informe o bairro no 'Sem bairro' (RN0023).",
          'Número de cartão inválido (RN0024).',
        ]);
      });

      // RN0025: com o cartão bem formado, a bandeira ainda precisa estar registrada
      cy.request({
        method: 'POST',
        url: `${API()}/pedidos`,
        failOnStatusCode: false,
        body: {
          clienteId: 1,
          itens: [{ discoId: disco.id, quantidade: 1 }],
          enderecoId: 1,
          pagamentos: [
            {
              cartaoNovo: {
                numero: '6062825624233788',
                nomeImpresso: 'ANA P RIBEIRO',
                codigoSeguranca: '456',
                bandeira: { desc: 'Cabal' },
              },
              valor: 317,
            },
          ],
        },
      }).then((resposta) => {
        expect(resposta.status).to.eq(400);
        expect(resposta.body.mensagens).to.include(
          'Bandeira de cartão não registrada no sistema (RN0025).',
        );
      });
      cy.request(`${API()}/pedidos?clienteId=1`).its('body').should('have.length', 0);
    });
  });
});
