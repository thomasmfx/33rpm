/// <reference types="cypress" />

describe('Cadastro de cliente (RF0021)', () => {
  beforeEach(() => {
    cy.abrirCuradoriaClientes();
  });

  it('RF0021, RN0026, RN0023, RF0026 e RF0027 - cadastra cliente com dados, endereço e cartão', () => {
    cy.fixture('clientes').then((dados) => {
      cy.intercept('POST', '**/api/clientes').as('cadastro');
      cy.get('[data-testid="btn-novo-cliente"]').click();
      cy.preencherDados(dados.novo);
      cy.adicionarEndereco(dados.endereco);
      cy.adicionarCartao(dados.cartao);
      cy.get('[data-testid="btn-salvar-cliente"]').click();

      // sem isto a asserção da linha começa a contar antes de o POST responder
      cy.wait('@cadastro').its('response.statusCode').should('eq', 201);
      cy.get('[data-testid="alerta-erro"]').should('not.exist');
      cy.linhaDoCliente(dados.novo.nome)
        .find('[data-testid="cliente-codigo"]')
        .should('contain', 'CLI-');

      // prova de ponta a ponta: o registro está no banco, não só na tela
      cy.request(`${Cypress.env('apiUrl')}/clientes?nome=Renata`).then((resposta) => {
        expect(resposta.body).to.have.length(1);
        const cliente = resposta.body[0];
        expect(cliente.cpf).to.eq('32165498700');
        expect(cliente.genero.desc).to.eq('Feminino');
        expect(cliente.telefone.ddd).to.eq('11');
        expect(cliente.enderecos[0].cidade.estado.desc).to.eq('SP');
        expect(cliente.enderecos[0].observacoes).to.eq('Bloco B, apto 72');
        expect(cliente.cartoes[0].bandeira.desc).to.eq('Mastercard');
        // RNF0033: a senha nunca volta na resposta
        expect(cliente.senha).to.equal(undefined);
      });
    });
  });

  it('RNF0035 - o código do cliente é gerado pelo sistema e é único', () => {
    cy.request(`${Cypress.env('apiUrl')}/clientes`).then((resposta) => {
      const codigos = resposta.body.map((cliente: { codigo: string }) => cliente.codigo);
      expect(codigos).to.deep.eq(['CLI-000001', 'CLI-000002', 'CLI-000003']);
      expect(new Set(codigos).size).to.eq(codigos.length);
    });
  });

  it('RN0021 e RN0022 - o cadastro não fecha sem endereço de cobrança e de entrega', () => {
    cy.fixture('clientes').then((dados) => {
      cy.get('[data-testid="btn-novo-cliente"]').click();
      cy.preencherDados(dados.novo);
      cy.get('[data-testid="btn-salvar-cliente"]').click();

      cy.contains('RN0021').should('be.visible');
      cy.contains('RN0022').should('be.visible');
      cy.request(`${Cypress.env('apiUrl')}/clientes?nome=Renata`)
        .its('body')
        .should('have.length', 0);
    });
  });

  it('RN0022 - endereço só de cobrança não basta: falta o de entrega', () => {
    cy.fixture('clientes').then((dados) => {
      cy.get('[data-testid="btn-novo-cliente"]').click();
      cy.preencherDados(dados.novo);
      cy.adicionarEndereco({ ...dados.endereco, tipo: 'Cobrança' });
      cy.get('[data-testid="btn-salvar-cliente"]').click();

      cy.contains('ao menos um endereço de entrega (RN0022)').should('be.visible');
    });
  });

  it('RN0023 - todos os campos do endereço são obrigatórios, menos observações', () => {
    cy.fixture('clientes').then((dados) => {
      cy.get('[data-testid="btn-novo-cliente"]').click();
      cy.preencherDados(dados.novo);
      cy.get('[data-testid="aba-enderecos"]').click();
      cy.get('[data-testid="btn-adicionar-endereco"]').click();
      cy.get('[data-testid="btn-salvar-endereco"]').click();

      cy.contains('Informe um nome para o endereço').should('be.visible');
      cy.contains('Selecione o tipo de residência').should('be.visible');
      cy.contains('Selecione o tipo de logradouro').should('be.visible');
      cy.contains('Informe o logradouro').should('be.visible');
      cy.contains('Informe o número').should('be.visible');
      cy.contains('Informe o bairro').should('be.visible');
      cy.contains('CEP deve ter 8 dígitos').should('be.visible');
      cy.contains('Informe a cidade').should('be.visible');
      cy.contains('Selecione o estado').should('be.visible');
    });
  });

  it('RN0021 e RN0022 - a regra está no servidor, não só no formulário', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/clientes`,
      failOnStatusCode: false,
      body: {
        nome: 'Sem Endereço',
        email: 'sem.endereco@email.com',
        cpf: '11122233344',
        dataNascimento: '1990-01-01',
        senha: 'Senha@123',
        confirmarSenha: 'Senha@123',
        genero: { desc: 'Feminino' },
        telefone: { tipo: { desc: 'Celular' }, ddd: '11', numero: '912345678' },
        enderecos: [],
        cartoes: [],
      },
    }).then((resposta) => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.mensagens.join(' ')).to.contain('RN0021');
      expect(resposta.body.mensagens.join(' ')).to.contain('RN0022');
    });
  });
});
