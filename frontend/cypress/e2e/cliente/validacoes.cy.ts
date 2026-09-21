/// <reference types="cypress" />

const CLIENTE_VALIDO = {
  nome: 'Teste Validação',
  email: 'teste.validacao@email.com',
  cpf: '11122233344',
  dataNascimento: '1990-01-01',
  senha: 'Senha@123',
  confirmarSenha: 'Senha@123',
  genero: { desc: 'Feminino' },
  telefone: { tipo: { desc: 'Celular' }, ddd: '11', numero: '912345678' },
  enderecos: [
    {
      nome: 'Casa',
      tipo: 'ambos',
      tipoResidencia: 'Casa',
      tipoLogradouro: 'Rua',
      logradouro: 'das Flores',
      numero: '10',
      bairro: 'Centro',
      cep: '01001000',
      pais: 'Brasil',
      cidade: { desc: 'São Paulo', estado: { desc: 'SP' } },
    },
  ],
  cartoes: [],
};

function postar(corpo: Record<string, unknown>) {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/clientes`,
    failOnStatusCode: false,
    body: corpo,
  });
}

describe('Validações do cadastro de cliente', () => {
  beforeEach(() => {
    cy.abrirCuradoriaClientes();
    cy.get('[data-testid="btn-novo-cliente"]').click();
  });

  it('RN0026 - nome, e-mail, CPF, gênero e telefone são obrigatórios', () => {
    cy.get('[data-testid="btn-salvar-cliente"]').click();

    cy.contains('O nome deve ter pelo menos 3 letras').should('be.visible');
    cy.contains('E-mail inválido').should('be.visible');
    cy.contains('CPF inválido').should('be.visible');
    cy.contains('Selecione um gênero').should('be.visible');
    cy.contains('DDD inválido').should('be.visible');
  });

  it('RNF0031 - senha fraca é recusada', () => {
    cy.fixture('clientes').then((dados) => {
      cy.preencherDados({ ...dados.novo, senha: 'senha', confirmacao: 'senha' });
      cy.get('[data-testid="btn-salvar-cliente"]').click();
      cy.contains('mínimo 8 caracteres').should('be.visible');
    });
  });

  it('RNF0032 - a confirmação precisa repetir a senha', () => {
    cy.fixture('clientes').then((dados) => {
      cy.preencherDados({ ...dados.novo, confirmacao: 'Outra@Senha1' });
      cy.get('[data-testid="btn-salvar-cliente"]').click();
      cy.contains('As senhas não coincidem').should('be.visible');
    });
  });

  it('RF0021 - e-mail já cadastrado é recusado pelo servidor', () => {
    cy.fixture('clientes').then((dados) => {
      cy.preencherDados({ ...dados.novo, email: 'ana.ribeiro@email.com' });
      cy.adicionarEndereco(dados.endereco);
      cy.get('[data-testid="btn-salvar-cliente"]').click();

      cy.get('[data-testid="alerta-erro"]').should(
        'contain',
        'Já existe um cliente com este e-mail.',
      );
    });
  });

  it('RF0021 - CPF já cadastrado é recusado pelo servidor', () => {
    cy.fixture('clientes').then((dados) => {
      cy.preencherDados({ ...dados.novo, cpf: '123.456.789-01' });
      cy.adicionarEndereco(dados.endereco);
      cy.get('[data-testid="btn-salvar-cliente"]').click();

      cy.get('[data-testid="alerta-erro"]').should(
        'contain',
        'Já existe um cliente com este CPF.',
      );
    });
  });

  it('RNF0031 e RNF0032 - as regras de senha também valem no servidor', () => {
    postar({ ...CLIENTE_VALIDO, senha: 'senha', confirmarSenha: 'outra' }).then(
      (resposta) => {
        expect(resposta.status).to.eq(400);
        const mensagens = resposta.body.mensagens.join(' ');
        expect(mensagens).to.contain('RNF0031');
        expect(mensagens).to.contain('RNF0032');
      },
    );
  });

  it('RNF0033 - a senha é guardada com hash, nunca em texto puro', () => {
    postar(CLIENTE_VALIDO).then((resposta) => {
      expect(resposta.status).to.eq(201);
      expect(resposta.body.senha).to.equal(undefined);

      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/clientes/login`,
        failOnStatusCode: false,
        body: { email: CLIENTE_VALIDO.email, senha: 'Senha@123' },
      })
        .its('status')
        .should('eq', 200);
    });
  });
});
