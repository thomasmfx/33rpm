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
  /** Rótulo do "Uso do endereço"; o checkout não pergunta. */
  tipo?: string;
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
      preencherEndereco(endereco: DadosEndereco): Chainable<void>;
      preencherCartao(cartao: DadosCartao): Chainable<void>;
      entrarComoCliente(caminho: string, cliente?: Credencial): Chainable<void>;
      discoPorTitulo(titulo: string): Chainable<DiscoApi>;
      cadastrarDiscoSemEstoque(titulo: string): Chainable<DiscoApi>;
      adicionarAoCarrinho(titulo: string, quantidade: number): Chainable<void>;
      itemDoCarrinho(titulo: string): Chainable<JQuery<HTMLElement>>;
      cadastrarSegundoCartao(): Chainable<void>;
      irParaPagamento(nomeEndereco: string): Chainable<void>;
      selecionarCupom(codigo: string): Chainable<void>;
      marcarCartao(final: string): Chainable<void>;
      valorNoCartao(final: string, valor: string): Chainable<void>;
      finalizarPedido(): Chainable<number>;
      conferirValor(testId: string, esperado: number): Chainable<void>;
      linhaDoDisco(titulo: string): Chainable<JQuery<HTMLElement>>;
      escolherOpcao(testId: string, inicio: string): Chainable<void>;
      preencherDisco(disco: DadosDisco): Chainable<void>;
      validarPagamentos(): Chainable<{ id: number; status: { descricao: string } }[]>;
      avancarPedido(id: number, status: 'EM TRANSPORTE' | 'ENTREGUE'): Chainable<void>;
      comprarPelaApi(itens: ItemDaCompra[]): Chainable<number>;
      pedidoEntregue(itens: ItemDaCompra[]): Chainable<number>;
      envelhecerCarrinho(clienteId: number, minutos: number): Chainable<void>;
    }
  }
}

export interface ItemDaCompra {
  titulo: string;
  quantidade: number;
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
  cy.preencherEndereco(endereco);
  cy.get('[data-testid="btn-salvar-endereco"]').click();
});

/** Campos do endereço, sem abrir nem salvar o formulário: serve ao cadastro e ao checkout. */
Cypress.Commands.add('preencherEndereco', (endereco: DadosEndereco) => {
  cy.get('[data-testid="endereco-nome"]').clear().type(endereco.nome);
  if (endereco.tipo) {
    cy.selecionar('endereco-tipo', endereco.tipo);
  }
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
});

Cypress.Commands.add('adicionarCartao', (cartao: DadosCartao) => {
  cy.get('[data-testid="aba-cartoes"]').click();
  cy.get('[data-testid="btn-adicionar-cartao"]').click();
  cy.preencherCartao(cartao);
  cy.get('[data-testid="btn-salvar-cartao"]').click();
});

/** Campos do cartão, sem abrir nem salvar o formulário: serve ao cadastro e ao checkout. */
Cypress.Commands.add('preencherCartao', (cartao: DadosCartao) => {
  cy.get('[data-testid="cartao-numero"]').clear().type(cartao.numero);
  cy.get('[data-testid="cartao-nome-impresso"]').clear().type(cartao.nomeImpresso);
  cy.selecionar('cartao-bandeira', cartao.bandeira);
  cy.get('[data-testid="cartao-cvv"]').clear().type(cartao.cvv);
  if (cartao.preferencial) {
    cy.get('[data-testid="cartao-preferencial"]').check({ force: true });
  }
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

export interface Credencial {
  email: string;
  senha: string;
  nome: string;
}

/** Ana Paula, cliente 1 do /dev/reset: endereço "Casa" em São Paulo/SP e Visa final 1002. */
export const ANA: Credencial = {
  email: 'ana.ribeiro@email.com',
  senha: 'Senha@123',
  nome: 'Ana Paula Ribeiro',
};

/** Bruno Tavares, cliente 2 do /dev/reset: endereço "Apartamento" no Rio de Janeiro/RJ, sem cartão. */
export const BRUNO: Credencial = {
  email: 'bruno.tavares@email.com',
  senha: 'Senha@123',
  nome: 'Bruno Tavares',
};

/** O disco como a API devolve; os testes só leem estes campos. */
export interface DiscoApi {
  id: number;
  codigo: string;
  titulo: string;
  precoVenda: number;
  estoque: number;
  isAtivo: boolean;
}

/**
 * Sessão de cliente pela API, como em entrarComoAdministrador. Espera o nome no
 * cabeçalho: antes de os clientes carregarem, o carrinho cairia na chave do admin.
 */
Cypress.Commands.add('entrarComoCliente', (caminho: string, cliente: Credencial = ANA) => {
  cy.request('POST', `${Cypress.env('apiUrl')}/sessoes`, {
    email: cliente.email,
    senha: cliente.senha,
  }).then(({ body }) => {
    const sessao = JSON.stringify({ papel: 'cliente', id: String(body.usuario.id) });
    cy.visit(caminho, {
      onBeforeLoad(janela) {
        janela.localStorage.setItem('33rpm:sessao', sessao);
      },
    });
  });
  cy.contains('header', cliente.nome).should('be.visible');
});

/** Os ids dos discos são gerados pelo banco: o teste acha o disco pelo título. */
Cypress.Commands.add('discoPorTitulo', (titulo: string) =>
  cy
    .request<DiscoApi[]>(`${Cypress.env('apiUrl')}/discos?titulo=${encodeURIComponent(titulo)}`)
    .its('body')
    .then((discos) => {
      const disco = discos.find((candidato) => candidato.titulo === titulo);
      expect(disco, `disco ${titulo}`).to.not.eq(undefined);
      return disco as DiscoApi;
    }),
);

/** Disco novo pela API de cadastro (RF0011): nasce ativo, sem entrada e com estoque 0. */
Cypress.Commands.add('cadastrarDiscoSemEstoque', (titulo: string) =>
  cy.fixture('disco').then((dados) =>
    cy
      .request<DiscoApi>('POST', `${Cypress.env('apiUrl')}/discos`, { ...dados.semEstoque, titulo })
      .its('body'),
  ),
);

/** RF0032: a quantidade é escolhida na página do disco, antes de incluir. */
Cypress.Commands.add('adicionarAoCarrinho', (titulo: string, quantidade: number) => {
  cy.intercept('POST', '**/api/carrinhos/*/itens').as('disponibilidade');
  cy.discoPorTitulo(titulo).then((disco) => {
    cy.visit(`/disco/${disco.id}`);
  });
  cy.get('[data-testid="disco-compra"]').within(() => {
    for (let vez = 1; vez < quantidade; vez += 1) {
      cy.get('[data-testid="quantidade-aumentar"]').click();
    }
    cy.get('[data-testid="quantidade-valor"]').should('have.text', String(quantidade));
    cy.get('[data-testid="btn-adicionar-carrinho"]').click();
  });
  // RN0031 e RN0044: o servidor decide e bloqueia antes de o item entrar no carrinho
  cy.wait('@disponibilidade').its('response.statusCode').should('eq', 200);
  cy.get('[data-testid="aviso-adicionado"]').should('be.visible');
});

Cypress.Commands.add('itemDoCarrinho', (titulo: string) =>
  cy.contains('[data-testid="item-carrinho"]', titulo),
);

/** O segundo cartão da Ana entra pela alteração de cartões já implementada (RF0027). */
Cypress.Commands.add('cadastrarSegundoCartao', () => {
  cy.request('PUT', `${Cypress.env('apiUrl')}/clientes/1/cartoes`, {
    cartoes: [
      {
        numero: '4539781234561002',
        nomeImpresso: 'ANA P RIBEIRO',
        codigoSeguranca: '123',
        isPreferencial: true,
        bandeira: { desc: 'Visa' },
      },
      {
        numero: '5105105105105100',
        nomeImpresso: 'ANA P RIBEIRO',
        codigoSeguranca: '456',
        isPreferencial: false,
        bandeira: { desc: 'Mastercard' },
      },
    ],
  });
});

/** Do carrinho até a etapa de pagamento, escolhendo o endereço pelo nome. */
Cypress.Commands.add('irParaPagamento', (nomeEndereco: string) => {
  cy.get('[data-testid="link-carrinho"]').click();
  cy.get('[data-testid="btn-finalizar-compra"]').click();
  cy.location('pathname').should('eq', '/checkout');
  cy.contains('[data-testid="opcao-endereco"]', nomeEndereco).click();
  cy.get('[data-testid="btn-continuar-entrega"]').click();
  cy.get('[data-testid="frete-valor"]').should('have.attr', 'data-valor');
  cy.get('[data-testid="btn-continuar-pagamento"]').click();
  cy.get('[data-testid="etapa-3"]').should('have.attr', 'data-estado', 'atual');
});

Cypress.Commands.add('selecionarCupom', (codigo: string) => {
  cy.get(`[data-testid="cupom-opcao"][data-codigo="${codigo}"]`)
    .click()
    .should('have.attr', 'aria-pressed', 'true');
});

Cypress.Commands.add('marcarCartao', (final: string) => {
  cy.get(`[data-testid="cartao-opcao"][data-final="${final}"]`)
    .find('[data-testid="cartao-checkbox"]')
    .check({ force: true });
});

Cypress.Commands.add('valorNoCartao', (final: string, valor: string) => {
  cy.get(`[data-testid="cartao-opcao"][data-final="${final}"]`)
    .find('input[data-testid="cartao-valor"]')
    .clear()
    .type(valor);
});

/** Paga e devolve o id do pedido criado (RF0038). */
Cypress.Commands.add('finalizarPedido', () => {
  cy.intercept('POST', '**/api/pedidos').as('criarPedido');
  cy.get('[data-testid="btn-pagar"]').should('be.enabled').click();
  return cy
    .wait('@criarPedido')
    .then(({ response }) => {
      expect(response?.statusCode).to.eq(201);
      return response?.body.id as number;
    });
});

/**
 * Valores monetários são conferidos pelo data-valor: o texto formatado traz espaço
 * não separável. A asserção se repete até o valor bater, porque cotação e carrinho
 * respondem depois da ação.
 */
Cypress.Commands.add('conferirValor', (testId: string, esperado: number) => {
  cy.get(`[data-testid="${testId}"]`).should(($elemento) => {
    expect(Number($elemento.attr('data-valor')), testId).to.eq(esperado);
  });
});

/**
 * RN0037 e RN0038: a rotina que o servidor roda a cada 10 s, depois de 30 s de espera
 * pela operadora, disparada na hora para o teste não esperar.
 */
Cypress.Commands.add('validarPagamentos', () =>
  cy.request('POST', `${Cypress.env('apiUrl')}/pedidos/validacao-pagamento`).its('body'),
);

/** RN0039 e RN0040, o passo do administrador pela API. */
Cypress.Commands.add('avancarPedido', (id: number, status: 'EM TRANSPORTE' | 'ENTREGUE') => {
  cy.request('PUT', `${Cypress.env('apiUrl')}/pedidos/${id}/status`, {
    status: { descricao: status },
  });
});

/**
 * Compra da Ana pela API, com o endereço Casa e o Visa final 1002 pagando o que a
 * cotação do servidor manda. Para os cenários em que a compra é só o ponto de partida.
 */
Cypress.Commands.add('comprarPelaApi', (itens: ItemDaCompra[]) => {
  const ids: { discoId: number; quantidade: number }[] = [];
  itens.forEach(({ titulo, quantidade }) =>
    cy.discoPorTitulo(titulo).then((disco) => ids.push({ discoId: disco.id, quantidade })),
  );
  return cy.then(() => {
    const corpo = { clienteId: 1, itens: ids, enderecoId: 1 };
    return cy
      .request('POST', `${Cypress.env('apiUrl')}/pedidos/cotacao`, corpo)
      .its('body.restante')
      .then((restante: number) =>
        cy
          .request('POST', `${Cypress.env('apiUrl')}/pedidos`, {
            ...corpo,
            pagamentos: [{ cartaoId: 1, valor: restante }],
          })
          .its('body.id'),
      );
  });
});

/** Compra da Ana já aprovada, despachada e entregue, pronta para a troca (RN0043). */
Cypress.Commands.add('pedidoEntregue', (itens: ItemDaCompra[]) =>
  cy.comprarPelaApi(itens).then((id) => {
    cy.validarPagamentos();
    cy.avancarPedido(id, 'EM TRANSPORTE');
    cy.avancarPedido(id, 'ENTREGUE');
    return cy.wrap(id);
  }),
);

/** RN0044 (perfil dev): o carrinho fica como se os minutos tivessem passado. */
Cypress.Commands.add('envelhecerCarrinho', (clienteId: number, minutos: number) => {
  cy.request(
    'POST',
    `${Cypress.env('apiUrl')}/dev/carrinhos/${clienteId}/envelhecer?minutos=${minutos}`,
  );
});

/** O inventário é paginado: a busca pelo título traz a linha do disco para a tela. */
Cypress.Commands.add('linhaDoDisco', (titulo: string) => {
  cy.get('[data-testid="filtro-titulo"]').clear().type(titulo);
  return cy.contains('[data-testid="disco-linha"]', titulo);
});

export interface DadosDisco {
  titulo: string;
  artista: string;
  ano: string;
  generos: string[];
  estilos: string[];
  capa: string;
  gravadora: string;
  edicao: string;
  codigoCatalogo: string;
  codigoBarras: string;
  numeroFaixas: string;
  duracao: string;
  descricao: string;
  formato: string;
  grupo: string;
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Select/MultiSelect do Mantine pelo começo do rótulo: 'Importado' casa 'Importado (+110%)'. */
Cypress.Commands.add('escolherOpcao', (testId: string, inicio: string) => {
  cy.get(`[data-testid="${testId}"]`).click();
  cy.contains('[role="option"]', new RegExp(`^${escaparRegex(inicio)}`)).click();
});

/** Campos do FormDisco (RN0011); o formato preenche as dimensões pelo preset. */
Cypress.Commands.add('preencherDisco', (disco: DadosDisco) => {
  cy.get('[data-testid="disco-titulo"]').clear().type(disco.titulo);
  // autocompletes e tags deixam a lista de sugestões aberta sobre o campo seguinte;
  // blur fecha a lista, já Esc fecharia o modal inteiro
  cy.get('[data-testid="disco-artista"]').clear().type(disco.artista).blur();
  cy.get('[data-testid="disco-ano"]').clear().type(disco.ano);
  disco.generos.forEach((genero) => cy.escolherOpcao('disco-generos', genero));
  cy.get('[data-testid="disco-generos"]').blur();
  disco.estilos.forEach((estilo) => cy.get('[data-testid="disco-estilos"]').type(`${estilo}{enter}`));
  cy.get('[data-testid="disco-estilos"]').blur();
  cy.get('[data-testid="disco-capa"]').clear().type(disco.capa, { delay: 0 });
  cy.get('[data-testid="disco-gravadora"]').clear().type(disco.gravadora).blur();
  cy.escolherOpcao('disco-edicoes', disco.edicao);
  cy.get('[data-testid="disco-edicoes"]').blur();
  cy.get('[data-testid="disco-codigo-catalogo"]').clear().type(disco.codigoCatalogo);
  cy.get('[data-testid="disco-codigo-barras"]').clear().type(disco.codigoBarras);
  cy.get('[data-testid="disco-numero-faixas"]').clear().type(disco.numeroFaixas);
  cy.get('[data-testid="disco-duracao"]').clear().type(disco.duracao);
  cy.get('[data-testid="disco-descricao"]').clear().type(disco.descricao, { delay: 0 });
  cy.escolherOpcao('disco-formato', disco.formato);
  cy.escolherOpcao('disco-grupo', disco.grupo);
});
