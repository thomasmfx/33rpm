/// <reference types="cypress" />

export {};

const API = () => Cypress.env('apiUrl');

describe('Demonstração · Criação de pedido', () => {
  beforeEach(() => {
    // o ViaCEP é externo; sem resposta o formulário fica com o que o teste digitou
    cy.intercept('GET', 'https://viacep.com.br/ws/**', { body: { erro: true } });
  });

  it('3. Uma compra com novo endereço e novo cartão cadastrados durante o processo, incorporados ao perfil do cliente', () => {
    cy.fixture('compra').then(({ enderecoNovo, cartaoNovo }) => {
      cy.etapa('A Ana entra na loja e inclui The College Dropout no carrinho');
      cy.entrarComoCliente('/');
      cy.adicionarAoCarrinho('The College Dropout', 1);
      cy.get('[data-testid="link-carrinho"]').click();
      cy.get('[data-testid="btn-finalizar-compra"]').click();

      cy.etapa('RF0035: cadastra um endereço novo, em Salvador, durante a compra');
      cy.get('[data-testid="btn-entregar-outro-endereco"]').click();
      cy.preencherEndereco(enderecoNovo);

      cy.etapa('Marca para salvar o endereço no perfil');
      cy.get('[data-testid="checkbox-salvar-endereco"]').check({ force: true });
      cy.get('[data-testid="btn-salvar-endereco"]').click();
      cy.contains('[data-testid="opcao-endereco"]', 'Casa da Bahia').should('be.visible');

      cy.etapa('RF0034: frete para Salvador — Nordeste R$ 35,00 + 1 kg iniciado R$ 8,00');
      cy.get('[data-testid="btn-continuar-entrega"]').click();
      cy.conferirValor('frete-valor', 43);
      cy.get('[data-testid="btn-continuar-pagamento"]').click();
      cy.conferirValor('resumo-total', 432);

      cy.etapa('RF0036: cadastra um cartão novo durante a compra e marca para salvar no perfil');
      cy.get('[data-testid="btn-adicionar-cartao-checkout"]').click();
      cy.preencherCartao(cartaoNovo);
      cy.get('[data-testid="checkbox-salvar-cartao"]').check({ force: true });
      cy.get('[data-testid="btn-salvar-cartao"]').click();
      cy.get('[data-testid="cartao-opcao"][data-final="2222"] [data-testid="cartao-checkbox"]').should(
        'be.checked',
      );

      cy.etapa('Finaliza a compra: R$ 432,00 no cartão novo');
      cy.finalizarPedido().then((id) => {
        cy.request(`${API()}/pedidos/${id}`)
          .its('body')
          .then((pedido) => {
            expect(pedido.enderecoEntrega).to.include({ nome: 'Casa da Bahia', cidade: 'Salvador' });
            expect(pedido.pagamentos[0]).to.include({ finalNumero: '2222', valor: 432 });
          });
      });

      cy.etapa('O endereço novo aparece no perfil da Ana');
      cy.visit('/perfil');
      cy.contains('nav[aria-label="Seções da conta"] button', 'Endereços').click();
      cy.contains('strong', 'Casa da Bahia').should('be.visible');

      cy.etapa('O cartão novo também');
      cy.contains('nav[aria-label="Seções da conta"] button', 'Cartões').click();
      cy.contains('strong', '2222').should('be.visible');
    });
  });
});
