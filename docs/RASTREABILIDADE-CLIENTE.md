# Rastreabilidade do CRUD de Cliente

Mapa de cada requisito do módulo de Cadastro de Clientes do DRS até o código que
o implementa e o teste automatizado de interface que o comprova.

A suíte roda contra a pilha real — React (`localhost:3300`) → Spring Boot
(`localhost:8080`) → PostgreSQL (`localhost:5433`). Não há mock no caminho.

```
cd db       && docker compose up -d
cd backend  && ./mvnw spring-boot:run
cd frontend && npm run dev
cd frontend && npm run e2e
```

**42 testes, 7 arquivos, todos verdes.** Cada `it()` começa pelo identificador do
requisito que valida.

---

## Requisitos funcionais

| Requisito | Onde está implementado | Teste que prova |
|---|---|---|
| **RF0021** Cadastrar cliente | `ClienteService.salvar` · `POST /api/clientes` · `CuradoriaClientes.handleSubmitCliente` | `cadastro.cy.ts` — cadastro completo; `validacoes.cy.ts` — e-mail e CPF duplicados; `sessao.cy.ts` — auto-cadastro |
| **RF0022** Alterar cliente | `ClienteService.alterar` · `PUT /api/clientes/{id}` | `alteracao.cy.ts` — altera dados e mantém o código; CPF não editável; e-mail de outro cliente recusado |
| **RF0023** Inativar cadastro | `ClienteService.excluir` (inativação lógica) · `DELETE /api/clientes/{id}` | `inativacao.cy.ts` — 4 testes, incluindo a prova de que o registro continua no banco |
| **RF0024** Consulta com filtros | `ClienteSpecs.de` · `GET /api/clientes?...` | `consulta.cy.ts` — 10 testes, filtros isolados e combinados |
| **RF0025** Consulta de transações | **fora do escopo desta entrega** — depende do módulo de pedido, que segue em mock | — |
| **RF0026** Endereços de entrega | `Endereco` · `FormEndereco` · `ListaEnderecos` | `cadastro.cy.ts` — endereço nomeado e persistido |
| **RF0027** Cartões de crédito | `ClienteService.substituirCartoes` · `ListaCartoes` | `cartoes.cy.ts` — associação e preferencial único |
| **RF0028** Alteração apenas de senha | `ClienteService.alterarSenha` · `PUT /api/clientes/{id}/senha` · botão “Salvar apenas a senha” | `alteracao.cy.ts` — senha nova entra, senha antiga deixa de valer |
| **RF0036** Cartão novo incorporado ao perfil | `ClienteService.alterarCartoes` · `PUT /api/clientes/{id}/cartoes` · Checkout | — (fluxo de compra, fora do CRUD) |

## Regras de negócio

| Regra | Onde está implementada | Teste que prova |
|---|---|---|
| **RN0021** Endereço de cobrança obrigatório | `ClienteService.validarEnderecos` | `cadastro.cy.ts` — bloqueio no formulário e no servidor |
| **RN0022** Endereço de entrega obrigatório | `ClienteService.validarEnderecos` | `cadastro.cy.ts` — endereço só de cobrança não basta |
| **RN0023** Composição do endereço | `ClienteService.camposObrigatoriosDoEndereco` · `CHECK ck_endereco_tipo` | `cadastro.cy.ts` — todos os campos exigidos, menos observações |
| **RN0024** Composição do cartão | `ClienteService.validarCartoes` | `cartoes.cy.ts` — número, nome impresso, bandeira e CVV |
| **RN0025** Bandeiras registradas | `ClienteService.resolverBandeira` · tabela `bandeira_cartao` | `cartoes.cy.ts` — seleção limitada a 6 bandeiras e recusa no servidor |
| **RN0026** Dados obrigatórios do cliente | `ClienteService.validarDadosCadastrais` | `validacoes.cy.ts` — nome, e-mail, CPF, gênero e telefone |
| **RN0027** Ranking do cliente | coluna `cliente.ranking`, exibida na curadoria e usada como filtro | `consulta.cy.ts` — filtro por ranking mínimo |
| **RN0028** Retorno da operadora | regra de estoque; entra com o módulo de pedido | — |

## Requisitos não funcionais

| Requisito | Onde está implementado | Teste que prova |
|---|---|---|
| **RNF0011** Consulta em até 1 s | índice `idx_cliente_nome`, consulta por `Specification` | — (medido na apresentação) |
| **RNF0012** Log de transação | `RegistradorLog` · tabelas `log` e `operacao_log` | conferido no banco: `SELECT * FROM log` |
| **RNF0013** Carga de domínio | `db/seed.sql` — gênero, tipo de telefone, bandeira, estado, operação de log | `cartoes.cy.ts` — a lista de bandeiras vem do banco |
| **RNF0031** Senha forte | `ClienteService.validarSenha` e espelho no `FormCliente` | `validacoes.cy.ts` — no formulário e no servidor |
| **RNF0032** Confirmação de senha | `ClienteService.validarSenha` | `validacoes.cy.ts` — confirmação divergente |
| **RNF0033** Senha criptografada | `BCryptPasswordEncoder` em `ConfiguracaoApp` · coluna `cliente.senha` | `validacoes.cy.ts` — senha nunca volta na resposta e o login confere o hash; `sessao.cy.ts` — login, senha errada e cliente inativo |
| **RNF0034** Alteração apenas de endereços | `ClienteService.alterarEnderecos` · `PUT /api/clientes/{id}/enderecos` | `alteracao.cy.ts` — endereço novo sem tocar no cadastro |
| **RNF0035** Código único de cliente | `ClienteService.gerarCodigo` · `SEQUENCE seq_codigo_cliente` | `cadastro.cy.ts` e `consulta.cy.ts` — código gerado e usado como filtro |

---

## Inativar ≠ excluir

O DRS prevê **apenas inativação** de cliente (RF0023). Não existe requisito de
exclusão, e o banco reforça a decisão: `pedido.cliente_id` e `cupom.cliente_id`
não têm `ON DELETE CASCADE`, então apagar um cliente com histórico é impossível
sem destruir o histórico de vendas.

A operação `excluir(ed)` da Fachada executa a inativação lógica
(`is_ativo = false`). O teste `inativacao.cy.ts` prova as duas metades: o cliente
some da lista de ativos e continua no banco, com os endereços intactos.

## Divergências do DRS registradas na leitura

- **RN0027** grafa “raking” no corpo da descrição.
- **RN0026** exige “endereço residencial”, enquanto RN0021 e RN0022 falam em
  endereço de cobrança e de entrega — três designações para o mesmo cadastro.
- **RN0028** está no grupo de Cadastro de Clientes, mas descreve regra de estoque.
- **RNF0044** aparece duas vezes, nos grupos de Análise e de Recomendação.
- **RNF0064** está numerado como requisito não funcional dentro das regras de negócio.
- Para livro existem RF de inativar **e** ativar (RF0012 e RF0016) com motivo
  associado; para cliente só existe RF0023. A reativação foi implementada por
  simetria, sem exigir justificativa.
- **RN0024** exige armazenar o código de segurança do cartão. Isso é o que o
  sistema faz, e é o que o PCI DSS proíbe em produção — a divergência está
  comentada em `db/schema.sql`.
