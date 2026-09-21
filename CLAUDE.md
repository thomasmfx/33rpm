# 33rpm

E-commerce de discos de vinil, trabalho da disciplina de Laboratório de
Engenharia de Software (LES) da FATEC. Desenvolvedor único: Thomas Moisés
Fernandes. Repositório: `github.com/thomasmfx/33rpm`, branch de trabalho `dev`.

O diferencial do produto é a descoberta: além de buscar por artista e título,
o cliente encontra discos por sonoridade, vibe e subgênero, com um assistente
de recomendação.

---

## Onde está o quê

| Caminho | O que é |
|---|---|
| `db/schema.sql` | DDL completo do PostgreSQL, 29 tabelas. Fonte para gerar entidades JPA e repositórios — não invente estrutura de tabela |
| `db/seed.sql` | carga das tabelas de domínio (RNF0013): gênero, tipo de telefone, bandeira, estado e operação de log |
| `db/clientes.sql` | população inicial: cinco clientes de demonstração com telefone, endereço e cartão. Roda no initdb, depois do seed |
| `backend/` | API REST Spring Boot. Só o agregado Cliente está implementado |
| `docs/RASTREABILIDADE-CLIENTE.md` | mapa RF/RN/RNF → código → teste Cypress que prova |
| `docs/BACKLOG.md` | as 111 atividades com estimativa, certeza e requisitos cobertos |
| `docs/DRS.docx` | Documento de Requisitos do Sistema — fonte de verdade dos RF, RNF e RN |
| `docs/DVP.docx` | Documento de Visão de Projeto — arquitetura, visões e diagramas |
| `docs/ESTIMATIVA.xlsx` | fonte do `docs/BACKLOG.md`, mantida para a entrega da disciplina |
| `docs/diagramas/` | casos de uso, classes, sequência, pacotes, implantação e dados |
| `frontend/` | aplicação React |

O DRS foi escrito para um e-commerce de **livros**. A adaptação para discos
mantém a numeração original dos requisitos. Quando o DRS disser "livro", leia
"disco".

---

## Delimitações de escopo

Definidas pelo professor. Não implemente o que está fora sem confirmação.

- **Autenticação é simples, não é segurança.** Existe login por e-mail e senha
  (`POST /api/clientes/login`), com a senha guardada em hash BCrypt (RNF0033).
  Não há JWT, sessão no servidor nem controle de acesso por rota: `/curadoria`
  continua aberta. O menu do Header mantém o atalho "Navegar como" para a
  demonstração.
- **Testes automatizados só no CRUD de cliente**, e só de interface (Cypress).
  Não há testes unitários de backend previstos.
- **Deploy não foi definido.** O `docker-compose.yml` da raiz sobe a pilha inteira
  em contêiner, mas só para demonstração local: sem registro de imagens, TLS,
  segredos fora do arquivo ou servidor de destino.
- **Log de transações (RNF0012)** está implementado no backend, em
  `RegistradorLog`, para as escritas de cliente. Não há tela que o exiba.

---

## Estado atual

**Cliente é o único módulo end-to-end.** React → API Spring Boot → PostgreSQL,
com 38 testes Cypress verdes contra a pilha real. As regras do cadastro vivem
em `ClienteService`, não mais em `utils/`.

**O resto do frontend ainda roda em mock**, persistido em `localStorage`:
discos, estoque, pedidos, cupons, carrinho e análise. Pedidos e cupons são
gerados a partir dos clientes que vieram da API (`gerarPedidos`, `gerarCupons`),
para que os ids batam.

**Backend: só o agregado Cliente.** Controllers de disco, estoque, pedido,
troca, cupom, análise e recomendação ainda não existem. A `Fachada` já está
pronta para recebê-los: basta o serviço novo registrar sua chave no Map.

**Banco: schema e carga de domínio prontos.** `ddl-auto=validate` — o Hibernate
confere o esquema contra `db/schema.sql` e recusa subir se divergir.

### Como rodar

```bash
docker compose up -d db                         # banco na porta 5433
cd backend  && ./mvnw spring-boot:run           # API na 8080, perfil dev
cd frontend && npm run dev                      # Vite na 3300
cd frontend && npm run e2e                      # suíte Cypress
```

Esse é o fluxo de trabalho: só o banco em contêiner, backend e frontend na
máquina, com hot reload. `docker compose up -d --build` sobe os três serviços em
contêiner — frontend estático em nginx na 3300, backend na **8383** —, e serve
para demonstração, não para desenvolver. Os dois disputam a 3300 e a 5433: um de
cada vez.

O banco sobe com os cinco clientes de `db/clientes.sql`. `POST /api/dev/reset` (só no
perfil dev) trunca e deixa **três** — é o que os testes usam no `beforeEach`, e por isso
a demonstração perde os outros dois depois de rodar a suíte; `docker compose down -v`
devolve os cinco.

Alterou `db/schema.sql`, `db/seed.sql` ou `db/clientes.sql`? Os scripts só rodam em volume
vazio: precisa de `docker compose down -v` antes de subir de novo.

O cliente de exemplo dos testes de cadastro é **Renata Bittencourt**
(`frontend/cypress/fixtures/clientes.json`), que não existe na carga inicial — é ela que
os testes criam.

---

## Stack

**Frontend** (`frontend/`)
React 19 · TypeScript · Vite · Mantine 9 (`@mantine/core`, `form`, `dates`,
`charts`, `carousel`) · SCSS Modules · react-router-dom 7 · Tabler Icons ·
dayjs · xlsx · Cypress

**Backend** (`backend/`)
Java 21 · Spring Boot 4.1 (Jakarta EE 11, Jackson 3) · Spring Web MVC ·
Spring Data JPA · Hibernate 7 · `spring-security-crypto` só pelo BCrypt ·
Maven Wrapper (`mvnw`, não há `mvn` instalado na máquina)

**Banco**
PostgreSQL 16 com extensão **pgvector** (coluna `disco.embedding vector(768)`
e índice HNSW para a busca semântica)

**Externo**
Dify.ai com Google Gemini, para o assistente de recomendação

---

## Arquitetura-alvo do backend

Três camadas: apresentação, negócio e persistência. O padrão central é a
**Fachada**.

```
FormX (React)
  → XController          um controller por entidade
  → IFachada             inserir/alterar/consultar/excluir, devolvendo Resultado
  → Fachada              Map<String, IService>, delega por tipo de entidade
  → IService → XService  regras de negócio
  → XRepository          Spring Data JPA
  → PostgreSQL
```

**Regras da arquitetura, não negociáveis:**

- Controllers dependem de `IFachada`, nunca da classe `Fachada`.
- A `Fachada` depende de `IService`, nunca dos serviços concretos. Incluir uma
  entidade nova não altera o código da Fachada — altera o registro do Map.
- As quatro operações trafegam `EntidadeDominio`, a superclasse abstrata de
  todas as entidades de domínio.
- Análise e Recomendação não são CRUD: passam pela fachada usando
  `consultar(ed)`, onde `ed` é um objeto de filtro que herda de
  `EntidadeDominio`.
- Regras de negócio vivem nos serviços. Nunca no controller, nunca no
  componente React. O formulário pode repetir uma validação de formato para dar
  resposta imediata, mas a decisão é sempre do servidor.
- `IFachada` usa **inserir**; `IService` usa **salvar**. Os dois devolvem
  `Resultado`, que carrega as entidades afetadas ou as mensagens de negócio.
- `excluir(ed)` de Cliente é **inativação lógica**: o DRS não prevê exclusão e
  as chaves de `pedido` e `cupom` impedem o delete físico.
- Alterações parciais (RF0028 senha, RNF0034 endereços, RF0036 cartões) também
  passam por `alterar(ed)`: o serviço detecta o que veio preenchido e desvia.

**Pacotes do backend:** `controller`, `service`, `model`, `repository`.
Não há pacote `dto` — as entidades trafegam diretamente.

**Controllers:** Cliente, Disco, Estoque, Pedido, Troca, Cupom, Analise,
Recomendacao.

**Services:** Cliente, Disco, Estoque, Pedido, Troca, Cupom, Pagamento,
Analise, Recomendacao.

---

## Estrutura do frontend

```
frontend/src/
  pages/        telas com rota: Home, Acervo, Disco, Carrinho, Checkout,
                Pedidos, Cupons, Curadoria, Login, Cadastro
  components/   Header, VinylCard, VinylCarousel, FormCliente, FormDisco,
                FormEntradaEstoque, Chatbot, SpinningDisk, EstadoVazio,
                Curadoria{Clientes,Inventario,Pedidos,Dashboard}
  contexts/     LojaProvider.tsx + loja.ts — estado global e sessão
  services/     api.ts + clientesService.ts — HTTP e conversão do agregado
  utils/        regras dos módulos ainda mockados + mocks
  types/        cliente, disco, pedido, cupom, inventario, carrinho
frontend/cypress/
  e2e/cliente/  cadastro, validacoes, consulta, alteracao, inativacao,
                cartoes, sessao
  support/      commands.ts — resetarBanco, preencherDados, adicionarEndereco…
```

`Curadoria` é o painel administrativo, com quatro abas: Clientes, Inventário,
Pedidos e Dashboard.

O JSON da API traz os domínios como objeto (`genero: { id, desc }`,
`cidade: { desc, estado: { desc } }`); `clientesService` achata isso para o tipo
`Cliente` do frontend e desfaz na volta. Não existe pacote de DTO no Java — essa
conversão é o único ponto de tradução.

Seletores dos testes: todo elemento do fluxo de cliente tem `data-testid`
estável. Os `aria-label` interpolam o nome do cliente e não servem de âncora.

---

## Regras de negócio que mais pegam

Estão todas no DRS. Estas são as que têm interação não óbvia:

**Precificação e estoque**
- `RN0013` — valor de venda = custo de aquisição + margem do grupo de
  precificação.
- `RN0051` — quando entram lotes com custos diferentes, o valor de venda
  considera o **maior** custo registrado.
- `RN0014` — preço abaixo da margem exige autorização gerencial.
- `RN0016` — rotina automática inativa discos sem estoque e com venda abaixo
  do parâmetro, sempre categorizando como FORA DE MERCADO.

**Carrinho e compra**
- `RN0044` / `RN0045` — item no carrinho fica bloqueado por prazo
  parametrizado, com aviso 5 minutos antes de expirar e remoção automática
  depois. Exige execução agendada no servidor, não só timer na interface.
- `RN0034` — pagamento pode ser dividido entre cartões, com valor mínimo por
  cartão.
- `RN0033` / `RN0035` — um cupom promocional por compra; cupons de troca
  combináveis. A presença de cupom dispensa o valor mínimo do cartão.
- `RN0036` — se os cupons excedem o valor da compra, a diferença volta como
  novo cupom de troca. **É escolha de combinação, não aritmética** — o
  critério de seleção do subconjunto precisa estar documentado.

**Análise gerencial**
- `RN0071` — vendas agregadas por categoria e mês, com rateio quando o disco
  pertence a mais de uma categoria.
- `RN0072` — período entre 1 e 24 meses.
- `RN0073` — meses sem venda aparecem com R$ 0,00, para não abrir buraco na
  série.
- `RN0074` — só compras aprovadas, em transporte ou entregues entram no
  cálculo.

---

## Convenções de código

- **Português brasileiro** em código, comentários, UI e commits. Nomes de
  domínio em pt-BR: `handleSalvarCliente`, `isCarrinhoVisivel`,
  `discoEmEdicao`.
- Props tipadas com `Readonly<T>`.
- Aspas simples, ponto e vírgula, indentação de 2 espaços.
- **Comentários são raros** e explicam apenas o *porquê* não óbvio. Quando o
  código existe por causa de um requisito, cite o ID: `// RN0051 — maior custo`.
- Regras de negócio em funções puras, nunca reimplementadas dentro de
  componentes.
- Commits em Conventional Commits, em português, no imperativo.
- **Nunca commitar nem dar push automaticamente.** Entregue a mensagem de
  commit em bloco markdown para o desenvolvedor aplicar.

---

## Armadilhas já encontradas

Custaram tempo uma vez. Não repita.

- **Mantine em modo uncontrolled:** `form.setValues()` não repinta o input.
  Use `form.setFieldValue()`, que renumera a key.
- **Mantine `Select`:** `allowDeselect` é `true` por padrão e devolve `null`,
  quebrando o submit. Desative quando o campo for obrigatório.
- **`new Date('yyyy-mm-dd')` é lido como UTC** e desloca o mês no gráfico de
  vendas, fazendo 24 meses contarem 25 e violando a RN0072. Existe um helper
  `dataLocal()` para isso.
- **React StrictMode executa updaters duas vezes.** Nunca chame outro
  `setState` dentro do updater de um `setState` — devolveu estoque em dobro
  uma vez.
- **Ao editar mocks grandes**, ancore a busca por `id:`. Fatiar por
  `index('  },')` casa dentro do fechamento de objetos aninhados e corrompe
  registros.
- **`<form>` dentro de `<form>` é HTML inválido.** O navegador descarta o
  interno e o botão do subformulário submete o externo, recarregando a página.
  `FormEndereco` e `FormCartao` vivem dentro do `<form>` do `FormCliente`, por
  isso são `<div>`, e chamam `form.onSubmit(...)()` no clique.
- **Botão Mantine sem `type` é `submit`.** Dentro do `FormCliente`, todo botão
  auxiliar precisa de `type="button"`, senão dispara o submit do cadastro.
- **`ddl-auto=validate` recusa `char(n)`** quando a entidade declara `String`:
  o esquema usa `varchar` e cada campo tem `@Column(length = ...)` batendo com
  o DDL. Divergiu, a aplicação não sobe — é proposital.
- **Spring Boot 4 usa Jackson 3:** o `ObjectMapper` vem de
  `tools.jackson.databind`, não de `com.fasterxml.jackson.databind`. As
  anotações continuam em `com.fasterxml.jackson.annotation`.
- **Duas coleções `List` com `fetch = EAGER`** quebram o plano de busca do
  Hibernate. `Cliente.enderecos` e `Cliente.cartoes` são `Set`.
- **Cypress não sobe com `ELECTRON_RUN_AS_NODE=1`** no ambiente (o terminal do
  VS Code define a variável): o binário roda como Node e falha com
  `bad option: --smoke-test`. Limpe a variável antes de `npm run e2e`.

---

## Inconsistências conhecidas no DRS

Valem menção na apresentação, mostram leitura atenta:

- `RNF0044` aparece duplicado, nos grupos de Análise e de Recomendação.
- `RNF0064` está numerado como requisito não funcional, mas aparece dentro das
  regras de negócio.

---

---

## Board no Notion

O conector MCP do Notion está disponível — use-o para consultar o estado das
tarefas em vez de perguntar.

A página do projeto é **33rpm**, favoritada, em `Fatec/33rpm`. Dentro dela:

- `Fatec/33rpm/User Stories` — 15 US, uma por bloco do backlog. A visão
  **Kanban** é a principal.
- `Fatec/33rpm/Tasks` — as 111 tarefas, ligadas à US correspondente pela
  propriedade `US`.

Cada US abre com a tabela das suas tarefas no topo, seguida do template
Como / Eu quero / Para, do escopo, da estimativa agregada e do principal
risco do bloco.

Status em ambos os bancos: **Backlog**, **In Progress**, **Done**.

Ao concluir uma tarefa, atualize o status no Notion. Ao começar, confira lá se
ela já não está em andamento — o board é a fonte de verdade do progresso, e o
`docs/BACKLOG.md` é a fonte do escopo.

## Entregas da disciplina

DRS · Planilha de estimativas · DVP · Apresentação do protótipo funcional ·
Implementação do backend · Testes de interface · Apresentação final

O acompanhamento é feito no board do Notion descrito acima.