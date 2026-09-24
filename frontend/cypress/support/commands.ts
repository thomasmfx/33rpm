/// <reference types="cypress" />

export interface DadosCliente {
  nome: string;
  nascimento: string;
  genero: string;
  cpf: string;
  tipoTelefone?: string;
  ddd: string;
  telefone: string;
  email: string;
  senha?: string;
  confirmacao?: string;
}

export interface DadosEndereco {
  nome: string;
  tipo: string;
  tipoResidencia: string;
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  observacoes?: string;
}

export interface DadosCartao {
  numero: string;
  nomeImpresso: string;
  bandeira: string;
  cvv: string;
  preferencial?: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      resetarBanco(): Chainable<void>;
      abrirCuradoriaClientes(): Chainable<void>;
      entrarComoAdministrador(caminho: string): Chainable<void>;
      selecionar(testId: string, opcao: string): Chainable<void>;
      preencherDados(dados: DadosCliente): Chainable<void>;
      adicionarEndereco(endereco: DadosEndereco): Chainable<void>;
      adicionarCartao(cartao: DadosCartao): Chainable<void>;
      preencherCadastro(dados: DadosCliente, endereco: DadosEndereco): Chainable<void>;
      linhaDoCliente(nome: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

Cypress.Commands.add('resetarBanco', () => {
  cy.request('POST', `${Cypress.env('apiUrl')}/dev/reset`);
});

/** Admin da carga (db/administradores.sql); o /dev/reset não mexe nele. */
export const ADMINISTRADOR = { email: 'admin@33rpm.com.br', senha: 'Admin@123' };

/**
 * A curadoria só abre com sessão de administrador: o login real passa pela API e
 * a sessão entra no localStorage antes de a página carregar.
 */
Cypress.Commands.add('entrarComoAdministrador', (caminho: string) => {
  cy.request('POST', `${Cypress.env('apiUrl')}/sessoes`, ADMINISTRADOR).then(({ body }) => {
    const sessao = JSON.stringify({ papel: 'administrador', id: String(body.usuario.id) });
    cy.visit(caminho, {
      onBeforeLoad(janela) {
        janela.localStorage.setItem('33rpm:sessao', sessao);
      },
    });
  });
});

Cypress.Commands.add('abrirCuradoriaClientes', () => {
  cy.entrarComoAdministrador('/curadoria/clientes');
  cy.get('[data-testid="btn-novo-cliente"]').should('be.visible');
});

/** Mantine renderiza o Select como combobox: abre a lista e escolhe pelo texto. */
Cypress.Commands.add('selecionar', (testId: string, opcao: string) => {
  cy.get(`[data-testid="${testId}"]`).click();
  // texto exato: 'Entrega' não pode casar com 'Entrega e cobrança'
  cy.get('[role="option"]').contains(new RegExp(`^${opcao}$`)).click();
});

Cypress.Commands.add('preencherDados', (dados: DadosCliente) => {
  cy.get('[data-testid="input-nome"]').clear().type(dados.nome);
  cy.get('[data-testid="input-nascimento"]').clear().type(dados.nascimento);
  cy.selecionar('select-genero', dados.genero);
  cy.get('[data-testid="input-cpf"]').then(($campo) => {
    if (!$campo.prop('disabled')) cy.wrap($campo).clear().type(dados.cpf);
  });
  cy.selecionar('select-tipo-telefone', dados.tipoTelefone ?? 'Celular');
  cy.get('[data-testid="input-ddd"]').clear().type(dados.ddd);
  cy.get('[data-testid="input-telefone"]').clear().type(dados.telefone);
  cy.get('[data-testid="input-email"]').clear().type(dados.email);
  if (dados.senha !== undefined) {
    cy.get('[data-testid="input-senha"]').clear().type(dados.senha);
  }
  if (dados.confirmacao !== undefined) {
    cy.get('[data-testid="input-confirmar-senha"]').clear().type(dados.confirmacao);
  }
});

Cypress.Commands.add('adicionarEndereco', (endereco: DadosEndereco) => {
  cy.get('[data-testid="aba-enderecos"]').click();
  cy.get('[data-testid="btn-adicionar-endereco"]').click();
  cy.get('[data-testid="endereco-nome"]').clear().type(endereco.nome);
  cy.selecionar('endereco-tipo', endereco.tipo);
  cy.selecionar('endereco-tipo-residencia', endereco.tipoResidencia);
  cy.selecionar('endereco-tipo-logradouro', endereco.tipoLogradouro);
  cy.get('[data-testid="endereco-logradouro"]').clear().type(endereco.logradouro);
  cy.get('[data-testid="endereco-numero"]').clear().type(endereco.numero);
  cy.get('[data-testid="endereco-bairro"]').clear().type(endereco.bairro);
  cy.get('[data-testid="endereco-cep"]').clear().type(endereco.cep);
  cy.get('[data-testid="endereco-cidade"]').clear().type(endereco.cidade);
  cy.selecionar('endereco-estado', endereco.estado);
  if (endereco.observacoes) {
    cy.get('[data-testid="endereco-observacoes"]').clear().type(endereco.observacoes);
  }
  cy.get('[data-testid="btn-salvar-endereco"]').click();
});

Cypress.Commands.add('adicionarCartao', (cartao: DadosCartao) => {
  cy.get('[data-testid="aba-cartoes"]').click();
  cy.get('[data-testid="btn-adicionar-cartao"]').click();
  cy.get('[data-testid="cartao-numero"]').clear().type(cartao.numero);
  cy.get('[data-testid="cartao-nome-impresso"]').clear().type(cartao.nomeImpresso);
  cy.selecionar('cartao-bandeira', cartao.bandeira);
  cy.get('[data-testid="cartao-cvv"]').clear().type(cartao.cvv);
  if (cartao.preferencial) {
    cy.get('[data-testid="cartao-preferencial"]').check({ force: true });
  }
  cy.get('[data-testid="btn-salvar-cartao"]').click();
});

/** Auto-cadastro do /cadastro: Conta → Dados pessoais → Endereço, sem cartão. */
Cypress.Commands.add('preencherCadastro', (dados: DadosCliente, endereco: DadosEndereco) => {
  cy.get('[data-testid="input-nome"]').type(dados.nome);
  cy.get('[data-testid="input-email"]').type(dados.email);
  cy.get('[data-testid="input-senha"]').type(dados.senha ?? '');
  cy.get('[data-testid="input-confirmar-senha"]').type(dados.confirmacao ?? '');
  cy.get('[data-testid="btn-continuar"]').click();

  cy.get('[data-testid="cadastro-etapa"]').should('have.attr', 'data-etapa', '2');
  cy.get('[data-testid="input-cpf"]').type(dados.cpf);
  cy.get('[data-testid="input-nascimento"]').type(dados.nascimento);
  cy.get('[data-testid="cadastro-genero"]').contains(dados.genero).click();
  cy.selecionar('select-tipo-telefone', dados.tipoTelefone ?? 'Celular');
  cy.get('[data-testid="input-telefone"]').type(`${dados.ddd}${dados.telefone}`);
  cy.get('[data-testid="btn-continuar"]').click();

  // o CEP vem primeiro e pode preencher o resto; cada campo é limpo antes de digitar
  cy.get('[data-testid="cadastro-etapa"]').should('have.attr', 'data-etapa', '3');
  cy.get('[data-testid="endereco-cep"]').type(endereco.cep);
  cy.selecionar('endereco-tipo-logradouro', endereco.tipoLogradouro);
  cy.get('[data-testid="endereco-logradouro"]').clear().type(endereco.logradouro);
  cy.get('[data-testid="endereco-numero"]').clear().type(endereco.numero);
  cy.get('[data-testid="endereco-bairro"]').clear().type(endereco.bairro);
  cy.get('[data-testid="endereco-cidade"]').clear().type(endereco.cidade);
  cy.selecionar('endereco-estado', endereco.estado);
  cy.get('[data-testid="endereco-nome"]').clear().type(endereco.nome);
  cy.selecionar('endereco-tipo-residencia', endereco.tipoResidencia);
  if (endereco.observacoes) {
    cy.get('[data-testid="endereco-observacoes"]').clear().type(endereco.observacoes);
  }
});

Cypress.Commands.add('linhaDoCliente', (nome: string) =>
  cy.contains('[data-testid="cliente-linha"]', nome),
);
