# 33rpm

E-commerce de discos de vinil, trabalho da disciplina de Laboratório de Engenharia de
Software (LES) da FATEC.

O diferencial é a descoberta: além de buscar por artista e título, o cliente encontra
discos por sonoridade, clima, estética e subgênero detalhado — "rap psicodélico",
"jazz para dias de chuva" — com um assistente de recomendação.

---

## Estado do projeto

| Módulo | Situação |
|---|---|
| Cadastro de clientes | **Completo de ponta a ponta**: React → API Spring Boot → PostgreSQL, com 44 testes Cypress. Inclui o auto-cadastro, a área "Minha conta" e o login do administrador, que guarda a curadoria |
| Cadastro de discos e estoque | **Completo de ponta a ponta**, com 16 testes Cypress: cadastro, alteração, consulta com filtros, inativação manual e automática, ativação, entrada em estoque e preço pela margem do grupo. A vitrine e a Curadoria › Inventário leem da API |
| Carrinho e criação de pedido | **Completo de ponta a ponta**, com 19 testes Cypress: carrinho com estoque decidido no servidor, checkout dirigido pela cotação do servidor (frete, cupons, vários cartões), pedido em EM PROCESSAMENTO, Meus pedidos e Meus cupons |
| Vendas eletrônicas: bloqueio, status e trocas | **Completo de ponta a ponta**, com 32 testes Cypress: carrinho no servidor com bloqueio e expiração, validação do pagamento com operadora simulada, baixa em estoque, despacho e entrega pela curadoria, troca de item ou da compra inteira, notificação, cupom de troca e reentrada em estoque |
| Análise de vendas | **Completo de ponta a ponta**, com 21 testes Cypress: gráfico de linhas das vendas ENTREGUE por mês e categoria (gênero principal do disco), com período, comparação entre categorias e exportação em planilha, só para o administrador |
| Assistente de recomendação | **Completo de ponta a ponta**, com 26 testes Cypress: chat do cliente com IA generativa (Gemini no Vertex AI), recomendação pelo histórico de compras e pelas preferências declaradas, busca e dúvidas sobre discos, avaliação útil ou não útil de cada resposta e ajuste fino do modelo com as vendas e o feedback, acompanhado na Curadoria › Assistente |

O backend cobre Cliente, Administrador, Disco, Estoque, Carrinho, Pedido, Pagamento, Cupom,
Troca, Notificação, Análise e o Assistente de recomendação, em camadas de controller, serviço
e repositório.

## Stack

**Frontend** — React 19 · TypeScript · Vite · Mantine 9 · SCSS Modules · react-router-dom 7 · Cypress. Visual definido por um guia de estilo próprio
**Backend** — Java 21 · Spring Boot 4.1 · Spring Web MVC · Spring Data JPA · Hibernate · BCrypt
**Banco** — PostgreSQL 16 com a extensão pgvector (busca semântica) e unaccent (consulta sem acento)
**Externo** — Google Gemini no Vertex AI, para o assistente de recomendação (conversa e ajuste fino) · ViaCEP, para preencher o endereço pelo CEP (falha silenciosa: sem rede, o cliente digita)

---

## Pré-requisitos

| Ferramenta | Versão usada no desenvolvimento | Observação |
|---|---|---|
| Java (JDK) | 21 | `java -version` |
| Node.js | 22 | `node --version` |
| Docker | 28 | usado só para o banco; no Windows, o Docker Desktop precisa estar aberto |

Maven **não** precisa estar instalado: o projeto traz o Maven Wrapper (`mvnw`, `mvnw.cmd`),
que baixa o Maven 3.9.16 na primeira execução.

A primeira execução puxa da rede o Maven, as dependências do Spring Boot, a imagem
`pgvector/pgvector:pg16` e o binário do Cypress — reserve alguns minutos.

## Instalação

Três serviços sobem juntos: banco, API e interface. **Cada um ocupa um terminal próprio**,
e todos os comandos partem da raiz do repositório.

Os blocos usam sintaxe bash (Git Bash ou WSL). No PowerShell, troque `./mvnw` por
`.\mvnw.cmd` e `curl` por `curl.exe` — no PowerShell, `curl` é apelido de
`Invoke-WebRequest` e rejeita as opções `-X`, `-H` e `-d`.

```bash
git clone -b dev https://github.com/thomasmfx/33rpm.git
cd 33rpm
```

A branch de trabalho é `dev`.

### 1. Banco de dados

```bash
docker compose up -d db
docker compose exec db pg_isready -U 33rpm -d 33rpm
```

Sobe o contêiner `33rpm-db` com PostgreSQL 16 + pgvector, publicado em **localhost:5433**
(banco, usuário e senha: `33rpm`). Na primeira subida o contêiner executa, nesta ordem:

| Script | O que faz |
|---|---|
| [db/schema.sql](db/schema.sql) | o DDL, 41 tabelas |
| [db/seed.sql](db/seed.sql) | tabelas de domínio do RNF0013: gênero, tipo de telefone, bandeira, as 27 unidades federativas, operações de log, status do pedido, tipos de cupom, grupos de precificação, fornecedores, formatos, edições, categorias de status, artistas, gravadoras, gêneros e estilos |
| [db/clientes.sql](db/clientes.sql) | doze clientes de demonstração, com telefone, endereço e cartão |
| [db/administradores.sql](db/administradores.sql) | o administrador da demonstração |
| [db/cupons.sql](db/cupons.sql) | cupons de troca e promocionais com que a demonstração começa — a única carga direta de dado de negócio, liberada pelo professor; os gerados pela troca e pela sobra de cupons nascem das operações |

Os discos **não** entram por SQL: na primeira subida do backend com o acervo vazio, a
`CargaAcervo` cadastra os 69 discos e as entradas em estoque de
[backend/src/main/resources/carga/acervo.json](backend/src/main/resources/carga/acervo.json)
pelos próprios serviços, passando pelas regras do cadastro (RN0011, RN0050, RN0051) e pelo log.
O arquivo é gerado a partir do mock do front por
`cd frontend && node --experimental-strip-types scripts/gerar-acervo.mjs`.

Os pedidos também não entram por SQL. Logo depois do acervo, e só se não houver pedido, a
`CargaVendas` registra 177 compras pela mesma esteira da loja: cotação, pedido, validação do
pagamento e passos do administrador. São dois arquivos:

| Arquivo | Compras |
|---|---|
| [carga/vendas-historico.json](backend/src/main/resources/carga/vendas-historico.json) | 161, em datas fixas de 01/2024 a 11/2026, repartidas entre os 11 clientes ativos, com pico em maio, novembro e dezembro |
| [carga/vendas.json](backend/src/main/resources/carga/vendas.json) | 16 da Ana, do Bruno, do Diego e da Eduarda, no dia 15 dos seis meses anteriores a hoje; é a massa que os testes da análise refazem e conferem |

Quase todas são ENTREGUE; há REPROVADA em todo o período, e APROVADA e EM TRANSPORTE nas
mais recentes. É a massa com que o dashboard e a curadoria abrem; a carga leva cerca de um
minuto. O `POST /api/dev/reset` zera os pedidos; reiniciar o backend os recarrega.

Por último, e só se não houver conversa com o assistente, a `CargaAssistente` grava o que
está em [carga/assistente.json](backend/src/main/resources/carga/assistente.json) pelas regras
do próprio assistente: as preferências declaradas de oito clientes e 42 conversas passadas,
34 avaliadas como úteis, 5 como não úteis e 3 sem avaliação. É o feedback com que o primeiro
ajuste fino começa. Os históricos mais distintos para comparar recomendações são os do Bruno,
que compra rock, e da Eduarda, que compra rap e R&B.

`up -d` devolve o prompt antes de o banco aceitar conexões. Só siga quando o `pg_isready`
responder `accepting connections`, ou quando `docker ps` mostrar o contêiner como
`healthy` — o backend valida o mapeamento na subida e morre se o banco ainda não estiver
pronto.

### 2. Backend

```bash
cd backend
./mvnw spring-boot:run          # PowerShell: .\mvnw.cmd spring-boot:run
```

API em **localhost:8080**, perfil `dev`. Fica em primeiro plano: deixe o terminal aberto.

O Hibernate roda com `ddl-auto: validate`: ele confere o mapeamento contra o banco e
**recusa subir** se o esquema divergir — é proposital, é o que impede o código e o DDL de
andarem separados.

### 3. Massa de demonstração

O banco já sobe com estes doze cadastros, todos com a senha `Senha@123`:

| Código | Nome | E-mail | Situação |
|---|---|---|---|
| CLI-000001 | Ana Paula Ribeiro | `ana.ribeiro@email.com` | ativa, ranking 5, 1 endereço, 1 cartão |
| CLI-000002 | Bruno Tavares | `bruno.tavares@email.com` | ativo, ranking 3, 1 endereço |
| CLI-000003 | Carla Nogueira | `carla.nogueira@email.com` | **inativa**, ranking 1, 1 endereço |
| CLI-000004 | Diego Ferraz | `diego.ferraz@email.com` | ativo, ranking 4, endereços de cobrança e entrega separados, 2 cartões |
| CLI-000005 | Eduarda Lins | `eduarda.lins@email.com` | ativo, ranking 2, 1 endereço, 1 cartão |
| CLI-000006 | Felipe Andrade | `felipe.andrade@email.com` | ativo, ranking 3, Salvador/BA, 1 cartão |
| CLI-000007 | Gabriela Moura | `gabriela.moura@email.com` | ativa, ranking 4, Recife/PE, 1 cartão |
| CLI-000008 | Henrique Saraiva | `henrique.saraiva@email.com` | ativo, ranking 2, Brasília/DF, cobrança e entrega separadas |
| CLI-000009 | Isabela Torres | `isabela.torres@email.com` | ativa, ranking 5, Florianópolis/SC, 2 cartões |
| CLI-000010 | João Pedro Martins | `joao.martins@email.com` | ativo, ranking 1, Manaus/AM, 1 cartão |
| CLI-000011 | Larissa Campos | `larissa.campos@email.com` | ativa, ranking 3, Fortaleza/CE |
| CLI-000012 | Marcelo Vieira | `marcelo.vieira@email.com` | ativo, ranking 4, Goiânia/GO, 1 cartão |

A curadoria só abre para o administrador, que tem tabela própria e senha `Admin@123`:

| Código | Nome | E-mail |
|---|---|---|
| ADM-000001 | Thomas Moisés Fernandes | `admin@33rpm.com.br` |

Carla é a inativa de propósito: é com ela que se demonstra o bloqueio de acesso da RF0023.
Diego é o caso de cobrança e entrega em endereços distintos (RN0021 e RN0022) e de cartão
preferencial entre dois (RF0027).

Os cupons da Ana fecham os cenários de pagamento com um disco entregue em São Paulo, e
o do Bruno, com um entregue no Rio de Janeiro; nos dois, o frete fica em R$ 28,00:

| Cupom | Tipo | Valor | Cenário |
|---|---|---:|---|
| `TROCA-AP-300` | troca | 300,00 | sozinho, deixa R$ 7,00 para um cartão num total de R$ 307,00 (RN0035) |
| `TROCA-AP-045` | troca | 45,00 | somado ao `TROCA-AP-300`, torna o `PROMO-AP-20` dispensável num total de R$ 327,00 (RN0036) |
| `PROMO-AP-20` | promocional | 20,00 | com o `PROMO-AP-50`, são dois promocionais (RN0033) |
| `PROMO-AP-50` | promocional | 50,00 | com o `TROCA-AP-300`, passa de R$ 327,00 e gera R$ 23,00 de troca (RN0036) |
| `PROMO-BT-280` | promocional | 280,00 | do Bruno: sozinho, deixa R$ 7,00 para um cartão num total de R$ 287,00 no Rio de Janeiro (RN0035) |

Frete (RF0034): tarifa da região da UF de destino — Sudeste 20, Sul 25, Centro-Oeste 30,
Nordeste 35, Norte 45 — mais R$ 8,00 por quilo iniciado do peso dos discos.

Para voltar ao estado conhecido durante a demonstração, com o banco e a API no ar:

```bash
curl -X POST http://localhost:8080/api/dev/reset      # PowerShell: curl.exe -X POST ...
```

Esse endpoint, que só existe no perfil `dev`, é o que os testes usam: ele limpa clientes,
carrinhos, pedidos, trocas, notificações, cupons, discos e log, deixa **apenas os três primeiros** clientes, recadastra o
acervo pelos serviços e recria os cupons da Ana e do Bruno — leva cerca de 1,5 s. O
administrador não é tocado. Para ter os doze clientes de volta, recrie o volume
com `docker compose down -v && docker compose up -d`.

### 4. Frontend

Em um terceiro terminal:

```bash
cd frontend
npm install
cp .env.example .env            # opcional; sem .env a API assumida é localhost:8080/api
npm run dev
```

Loja em **localhost:3300** (porta fixa, definida em `frontend/vite.config.ts`).

Clientes e discos são buscados quando a página abre. Se você rodou o `dev/reset` ou
recriou o banco com a loja aberta, recarregue a página: os ids de disco vêm da API.

### Encerrar

`Ctrl+C` nos terminais do backend e do frontend. O banco continua no ar:

```bash
docker compose stop db  # pausa, preservando os dados
docker compose down     # remove o contêiner, mantém o volume
docker compose down -v  # descarta também o volume e os dados
```

### Alternativa: a pilha inteira em contêiner

Para uma demonstração em máquina limpa, sem Java 21 nem Node instalados, o
[docker-compose.yml](docker-compose.yml) da raiz sobe os três serviços:

```bash
docker compose up -d --build
```

| Serviço | Porta | O que é |
|---|---|---|
| `frontend` | 3300 | build de produção servido por nginx, que também faz proxy de `/api` para o backend |
| `backend` | 8383 | jar do Spring Boot, perfil `dev` |
| `db` | 5433 | o mesmo PostgreSQL de sempre |

A porta da API muda de propósito: em 8383, a pilha em contêiner convive com o
backend nativo em 8080. O frontend em contêiner não usa nem uma nem outra — ele
fala com `/api` na própria origem e o nginx encaminha, então o CORS nem entra em
cena. Carregue a massa com `curl -X POST http://localhost:8383/api/dev/reset`.

Não há hot reload aqui: o bundle é estático, gerado no `docker build`. Para
desenvolver, use o fluxo nativo acima — e repare que os dois disputam a 3300 e a
5433, então rode um de cada vez.

O assistente do contêiner responde no modo simulado. Para ligá-lo ao Vertex AI, some o
[docker-compose.vertex.yml](docker-compose.vertex.yml), que passa ao backend as variáveis do
`backend/.env` e monta a chave de `~/.config/33rpm/vertex-sa.json` só para leitura, sem
levá-la para a imagem:

```bash
docker compose -f docker-compose.yml -f docker-compose.vertex.yml up -d --build
```

A suíte Cypress continua fora do contêiner. Para apontá-la à pilha conteinerizada:

```bash
cd frontend
CYPRESS_apiUrl=http://localhost:8383/api npx cypress run
```

---

## Roteiro de demonstração

Com os três serviços no ar e a massa carregada:

| Onde | O que mostrar |
|---|---|
| `/curadoria` | sem sessão, ou como cliente, mostra "Página indisponível"; entre como `admin@33rpm.com.br` / `Admin@123` para abrir o painel |
| `/curadoria/clientes` | cadastrar (RF0021), consultar com filtros combinados (RF0024), alterar (RF0022), salvar apenas a senha (RF0028), salvar apenas os endereços (RNF0034), cartões e preferencial (RF0027), inativar e reativar (RF0023) |
| `/login` | entrar como `ana.ribeiro@email.com` / `Senha@123`; tentar `carla.nogueira@email.com` para ver o bloqueio do cadastro inativo |
| `/cadastro` | auto-cadastro em três etapas (Conta, Dados pessoais, Endereço), com o CEP preenchendo o endereço pelo ViaCEP; o cliente já entra na loja ao concluir |
| `/perfil` | o próprio cliente altera dados, endereços (cobrança e entrega), cartões e senha, gravando na API |
| `/curadoria/inventario` | cadastrar disco (RF0011), consultar com filtros (RF0015), alterar e baixar o preço com aval (RF0014, RN0014), entrada em estoque com prévia do preço (RF0051, RF0052, RN0051), inativar e reativar com motivo (RF0012, RF0016), inativação automática (RF0013) |
| `/disco/:id` → `/carrinho` → `/checkout` | como a Ana: quantidade na inclusão e no carrinho (RF0031, RF0032), teto do estoque (RN0031), bloqueio com contador e aviso 5 minutos antes do fim (RN0044), endereço e cartão do perfil ou novos (RF0035, RF0036), frete (RF0034), cupons e vários cartões (RN0033 a RN0036) |
| `/pedidos` e `/cupons` | o pedido em EM PROCESSAMENTO (RF0038), depois APROVADA ou REPROVADA com o motivo (RN0038); a troca de itens ou da compra inteira de um pedido ENTREGUE (RF0041, RN0041, RN0043); os cupons de troca da sobra (RN0036) e da troca recebida (RF0045) |
| sino no cabeçalho | a notificação da troca autorizada (RN0046) |
| balão do assistente | como o Bruno (`bruno.tavares@email.com`), pedir uma recomendação e comparar com a da Eduarda (`eduarda.lins@email.com`); procurar discos de um artista, tirar dúvida sobre um disco e avaliar cada resposta como útil ou não útil (RNF0044) |
| `/perfil` › Preferências musicais | o cliente marca gêneros e estilos preferidos, que o assistente soma ao histórico de compras (RNF0044) |
| `/curadoria/assistente` | a IA em uso, os exemplos de vendas, do acervo e de feedback do próximo treino, o procedimento do ajuste fino, o histórico de treinos com o dataset de cada um e o feedback dado no chat, com filtro por avaliação (RNF0044) |
| `/curadoria/pedidos` | validar os pagamentos pendentes na hora (RN0037), despachar e confirmar a entrega (RF0039, RF0040), o chip **Trocas** com os pedidos EM TROCA (RF0043), autorizar (RF0042) e confirmar o recebimento informando se os itens voltam ao estoque (RF0044, RF0054) |
| terminal | `npm run demo` — o roteiro do professor no Cypress, passo a passo; `npm run e2e` — os 166 testes contra a pilha real |
| banco | `docker compose exec db psql -U 33rpm -d 33rpm -c "SELECT codigo, nome, is_ativo FROM cliente;"` — a prova de que a tela escreveu no PostgreSQL |

## Testes de interface

A suíte roda contra a pilha real — navegador, API e banco — sem nenhum mock no caminho.
Com os três serviços no ar:

```bash
cd frontend
npm run e2e                     # execução headless
npm run e2e:open                # abre o runner do Cypress
npm run demo                    # abre só a suíte de demonstração, passo a passo
npm run demo:lento              # a mesma suíte, sem pausas e devagar
```

| Spec | Testes | Cobre |
|---|---:|---|
| `cadastro.cy.ts` | 6 | RF0021, RN0021 a RN0023, RN0026, RF0026, RF0027, RNF0035 |
| `validacoes.cy.ts` | 7 | RN0026, RNF0031, RNF0032, RNF0033, unicidade de e-mail e CPF |
| `consulta.cy.ts` | 10 | RF0024 — filtros isolados e combinados |
| `alteracao.cy.ts` | 6 | RF0022, RF0028, RNF0034 |
| `inativacao.cy.ts` | 4 | RF0023 — inativar sem excluir |
| `cartoes.cy.ts` | 5 | RF0027, RN0024, RN0025 |
| `sessao.cy.ts` | 7 | login, conta de demonstração com entrada direta, credencial inválida, cliente inativo, auto-cadastro, login do administrador, curadoria recusada ao cliente |
| `disco/cadastro.cy.ts` | 3 | RF0011, RN0011, RN0012, RNF0021 |
| `disco/estoque.cy.ts` | 3 | RF0051, RF0052, RN0013, RN0050, RN0051, RN0061, RN0062, RNF0064 |
| `disco/alteracao.cy.ts` | 2 | RF0014, RN0014 |
| `disco/status.cy.ts` | 5 | RF0012, RF0013, RF0016, RN0015, RN0016, RN0017 |
| `disco/consulta.cy.ts` | 3 | RF0015 — filtros isolados e combinados |
| `pedido/carrinho.cy.ts` | 5 | RF0031, RF0032, RN0031 |
| `pedido/compra.cy.ts` | 4 | RF0033 a RF0036, RF0038, RN0023 a RN0025 |
| `pedido/pagamento.cy.ts` | 7 | RF0036, RF0037, RN0033 a RN0036 |
| `pedido/finalizacao.cy.ts` | 3 | RF0038, RNF0011, RNF0012 |
| `pedido/bloqueio.cy.ts` | 6 | RN0032, RN0044, RN0045, RNF0042 |
| `pedido/validacao.cy.ts` | 5 | RN0028, RN0036, RN0037, RN0038, RF0053, RNF0012 |
| `pedido/status.cy.ts` | 3 | RF0039, RF0040, RN0039, RN0040, RNF0011 |
| `pedido/troca.cy.ts` | 7 | RF0041 a RF0045, RF0054, RN0041, RN0042, RN0046, RNF0012 |
| `demonstracao/criacao-de-pedido/` | 7 | o roteiro mínimo do professor, um spec por item |
| `demonstracao/vendas-eletronicas/` | 11 | o roteiro mínimo do professor da fase de vendas, um spec por item |
| `disco/genero-principal.cy.ts` | 5 | RN0071 — o gênero principal do disco, na API e no formulário |
| `analise/vendas.cy.ts` | 8 | RF0055 a RF0057, RN0071 a RN0074, RNF0011 — a consulta, pela API |
| `demonstracao/analise-de-vendas/` | 8 | o roteiro mínimo do professor da fase de análise, um spec por item |
| `assistente/chat.cy.ts` | 5 | RNF0044 itens 1 e 2: chat só para o cliente, resposta com discos do acervo, conversa mantida e recusas do servidor |
| `assistente/feedback.cy.ts` | 4 | RNF0044 item 3, RNF0012: avaliação útil ou não útil, mudança de avaliação e o feedback na curadoria |
| `assistente/preferencias.cy.ts` | 3 | RNF0044: preferências em Minha conta e no perfil que a IA recebe |
| `assistente/treinamento.cy.ts` | 6 | RNF0044 item 3: exemplos de vendas, do acervo (respondidos só com discos do acervo do exemplo) e de feedback, treino pela curadoria, modelo ajustado em uso e dados novos para o próximo treino |
| `demonstracao/assistente/` | 8 | o roteiro do professor da fase do assistente, um spec por item |

### Suíte de demonstração

`cypress/e2e/demonstracao/` guarda, por fase entregue, um spec para cada item do roteiro do
professor, com o texto do roteiro como nome do teste ("livro" lido como "disco"). Os testes
são divididos em etapas com o requisito que cada uma mostra, e cada um usa discos que a
suíte de regressão não usa. Cada fase tem a sua pasta: `criacao-de-pedido/`,
`vendas-eletronicas/`, `analise-de-vendas/` e `assistente/`.

No Cypress a unidade de execução é o arquivo: clicar num spec roda todos os testes dele, e
não há botão para rodar um teste só. Por isso a demonstração tem um teste por arquivo, e o
ritmo vem do script:

| Comando | Ritmo |
|---|---|
| `npm run demo` | pausa no início de cada etapa; o ▶ (Resume) da barra de comandos segue até a próxima, e o **Next** executa um comando por vez |
| `npm run demo:lento` | roda sozinho, digitando devagar e segurando cada etapa por 1,5 s |
| `npm run e2e` | sem ritmo: a demonstração roda junto com a regressão, na velocidade normal |

Depois que um teste termina, passar o mouse ou clicar em cada comando do log mostra a tela
naquele momento (time travel), sem rodar de novo. Fora da demonstração, um spec isolado roda
com `npx cypress run --spec cypress/e2e/pedido/pagamento.cy.ts`; um teste isolado dentro de
um spec só com `it.only`, alterando o arquivo.

Os specs de cliente ficam em `cypress/e2e/cliente/`. Cada teste chama `POST /api/dev/reset`
antes de rodar, então a suíte é repetível sem recriar o banco. Esse reset trunca também o
`log`: os testes provam o RNF0012 por `GET /api/dev/logs?entidade=Pedido` (perfil `dev`).
Para ver o registro de escritas no banco, faça a operação na tela depois da última execução
da suíte e consulte:

```bash
docker compose exec db psql -U 33rpm -d 33rpm -c "SELECT * FROM log ORDER BY id DESC LIMIT 10;"
```

Falhas geram captura de tela em `frontend/cypress/screenshots/`, que não é versionada.

## Outros comandos

Frontend, a partir de `frontend/`:

```bash
npm run lint                    # ESLint
npm run build                   # checagem de tipos + bundle de produção
npm run preview                 # serve o bundle gerado
```

Backend, a partir de `backend/` (no PowerShell, `.\mvnw.cmd`):

```bash
./mvnw test                     # sobe o contexto Spring contra o banco
./mvnw package                  # gera target/rpm33-0.0.1-SNAPSHOT.jar
```

O teste do backend é o `contextLoads` do Spring: ele exige o banco no ar, porque o
Hibernate valida o mapeamento na subida. Os testes de regra de negócio são os de
interface, por definição de escopo da disciplina.

---

## API REST

Todas as escritas passam pelo serviço da entidade e devolvem a entidade afetada, ou `400` com
`{ "mensagens": [...] }` quando alguma regra de negócio barra a operação.

| Método | Rota | Para quê |
|---|---|---|
| `POST` | `/api/clientes` | cadastrar cliente (RF0021) |
| `GET` | `/api/clientes` | consultar com filtros `nome`, `email`, `telefone`, `cpf`, `codigo`, `status`, `rankingMinimo` (RF0024) |
| `GET` | `/api/clientes/{id}` | carregar um cliente |
| `PUT` | `/api/clientes/{id}` | alterar dados cadastrais (RF0022) |
| `PUT` | `/api/clientes/{id}/senha` | alterar apenas a senha (RF0028) |
| `PUT` | `/api/clientes/{id}/enderecos` | alterar apenas os endereços (RNF0034) |
| `PUT` | `/api/clientes/{id}/cartoes` | alterar apenas os cartões (RF0036) |
| `DELETE` | `/api/clientes/{id}` | inativar o cadastro (RF0023) |
| `PUT` | `/api/clientes/{id}/ativacao` | reativar o cadastro |
| `POST` | `/api/sessoes` | login de cliente ou administrador; devolve `{ papel, usuario }`, ou `401` |
| `POST` | `/api/clientes/login` | autenticação simples por e-mail e senha, só de cliente |
| `GET` | `/api/administradores/{id}` | carregar o administrador da sessão |
| `PUT` | `/api/administradores/{id}` | alterar nome e e-mail do administrador |
| `PUT` | `/api/administradores/{id}/senha` | alterar apenas a senha do administrador (RNF0031, RNF0032) |
| `GET` | `/api/dominios` | listas de domínio: gêneros, tipos de telefone, bandeiras, estados, formatos, edições, grupos de precificação, fornecedores, categorias e categorias de status |
| `GET` | `/api/discos` | consultar com filtros `titulo`, `artista`, `gravadora`, `categoria`, `codigo`, `anoMin`, `anoMax`, `precoMin`, `precoMax`, `grupo`, `formato`, `status`, `estoque` (RF0015) |
| `GET` | `/api/discos/{id}` | carregar um disco, com o preço sugerido pela margem |
| `POST` | `/api/discos` | cadastrar disco (RF0011) |
| `PUT` | `/api/discos/{id}` | alterar disco e preço (RF0014, RN0014) |
| `PUT` | `/api/discos/{id}/inativacao` | inativar com categoria e justificativa (RF0012, RN0015) |
| `PUT` | `/api/discos/{id}/ativacao` | ativar com categoria e justificativa (RF0016, RN0017) |
| `POST` | `/api/discos/inativacao-automatica` | roda a inativação automática agora (RF0013, RN0016) |
| `POST` | `/api/estoque/entradas` | registrar entrada em estoque (RF0051, RF0052, RN0051) |
| `GET` | `/api/estoque/entradas?discoId=` | histórico de entradas |
| `POST` | `/api/estoque/entradas/previa` | prévia do preço e do estoque, sem gravar |
| `POST` | `/api/estoque/disponibilidade` | confere quantidades contra o estoque livre, descontado o que está bloqueado (RN0031, RN0044) |
| `GET` | `/api/carrinhos/{clienteId}` | o carrinho: itens, expirados e segundos até o bloqueio vencer (RN0044, RNF0042) |
| `POST` | `/api/carrinhos/{clienteId}/itens` | incluir `{ discoId, quantidade }`, somando e renovando o prazo (RF0031, RF0032, RN0044) |
| `PUT` · `DELETE` | `/api/carrinhos/{clienteId}/itens/{discoId}` | alterar a quantidade, renovando o prazo só quando ela aumenta · tirar o disco |
| `DELETE` | `/api/carrinhos/{clienteId}` · `/api/carrinhos/{clienteId}/expirados` | esvaziar · dispensar os expirados (RNF0042) |
| `POST` | `/api/carrinhos/{clienteId}/revalidacao` | ajusta o carrinho ao estoque e devolve os `ajustes` (RN0032) |
| `POST` | `/api/pedidos/cotacao` | subtotal, frete, total, restante, troco e pendências da compra, sem gravar |
| `POST` | `/api/pedidos` | criar o pedido em EM PROCESSAMENTO (RF0033, RF0038) |
| `GET` | `/api/pedidos/{id}` · `/api/pedidos?clienteId=` · `/api/pedidos` | carregar um pedido · pedidos do cliente · todos, para a curadoria; com `validacao` e `trocas` |
| `POST` | `/api/pedidos/validacao-pagamento` | valida agora os pagamentos EM PROCESSAMENTO, sem esperar a operadora (RN0037, RN0038) |
| `PUT` | `/api/pedidos/{id}/status` | `{ status: { descricao } }`: EM TRANSPORTE (RN0039) ou ENTREGUE (RN0040) |
| `POST` | `/api/trocas` | pedir a troca de `itens` (`itemPedidoId`, `quantidade`) ou da `compraInteira` (RF0041, RN0041, RN0043) |
| `GET` | `/api/trocas?status=&clienteId=&pedidoId=` | pedidos de troca (RF0043) |
| `PUT` | `/api/trocas/{id}/status` | TROCA AUTORIZADA (RF0042) ou TROCADO com `retornoEstoque` (RF0044, RF0045, RF0054) |
| `GET` | `/api/notificacoes?clienteId=` · `PUT /api/notificacoes/{id}/leitura` | notificações do cliente · marcar como lida (RN0046) |
| `GET` | `/api/cupons?clienteId=` | cupons do cliente |
| `PUT` | `/api/clientes/{id}/preferencias` | alterar só os gêneros e estilos preferidos, `{ preferencias: [{ id }] }` (RNF0044) |
| `POST` | `/api/assistente/mensagens` | pergunta do cliente ao assistente, `{ clienteId, mensagem, historico }`; devolve a resposta com as sugestões, já gravada (RNF0044) |
| `PUT` | `/api/assistente/interacoes/{id}/avaliacao` | `{ isUtil }`: a resposta foi útil ou não (RNF0044 item 3) |
| `GET` | `/api/assistente/interacoes?avaliacao=` | as 100 respostas mais recentes, filtradas por `util`, `nao-util` ou `pendente` |
| `GET` | `/api/assistente/situacao` | a IA em uso e os exemplos que o próximo treino enviaria |
| `GET` · `POST` | `/api/assistente/treinamentos` | os treinos · iniciar um ajuste fino agora (RNF0044 item 3) |
| `POST` | `/api/assistente/treinamentos/acompanhamento` | consulta agora os treinos em andamento, sem esperar a rotina |
| `GET` | `/api/assistente/treinamentos/{id}/dataset` · `/api/assistente/dataset` | o JSONL enviado naquele treino · o que o próximo treino enviaria |
| `POST` | `/api/dev/reset` | recarrega a massa de teste (só no perfil `dev`) |
| `POST` | `/api/dev/carrinhos/{clienteId}/envelhecer?minutos=` | o carrinho fica como se os minutos tivessem passado, para mostrar a expiração (só no perfil `dev`) |
| `GET` | `/api/dev/logs?entidade=&entidadeId=` | registros do RNF0012 (só no perfil `dev`) |

Exemplo de cadastro. Os domínios trafegam como objeto — `genero`, `tipo` do telefone,
`cidade`/`estado` e `bandeira` do cartão são resolvidos pela descrição, e a cidade é
criada se ainda não existir. Salve como `cliente.json`:

```json
{
  "nome": "Renata Bittencourt",
  "email": "renata.bittencourt@email.com",
  "cpf": "32165498700",
  "dataNascimento": "1994-04-12",
  "senha": "Senha@123",
  "confirmarSenha": "Senha@123",
  "genero": { "desc": "Feminino" },
  "telefone": { "tipo": { "desc": "Celular" }, "ddd": "11", "numero": "976543210" },
  "enderecos": [
    {
      "nome": "Casa",
      "tipo": "ambos",
      "tipoResidencia": "Apartamento",
      "tipoLogradouro": "Avenida",
      "logradouro": "Angélica",
      "numero": "1500",
      "bairro": "Higienópolis",
      "cep": "01227200",
      "pais": "Brasil",
      "cidade": { "desc": "São Paulo", "estado": { "desc": "SP" } }
    }
  ],
  "cartoes": []
}
```

```bash
curl -X POST http://localhost:8080/api/clientes \
  -H "Content-Type: application/json" \
  --data-binary @cliente.json
```

No PowerShell, a barra invertida não continua a linha; use o equivalente nativo:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/clientes `
  -ContentType "application/json" -InFile cliente.json
```

Resposta: `201` com o cliente salvo, já com o `codigo` gerado e sem a senha. Mande o JSON
por arquivo, não colado na linha de comando: terminais do Windows costumam reenviar os
acentos em Latin-1, e a API responde `400 Invalid UTF-8 middle byte`.

## Variáveis de ambiente

`frontend/.env` não é versionado; use [frontend/.env.example](frontend/.env.example) como base.

| Variável | Obrigatória | Efeito |
|---|---|---|
| `VITE_API_URL` | não | endereço da API. Ausente, o frontend usa `http://localhost:8080/api` |

`backend/.env` também não é versionado. O backend o lê ao subir de dentro de `backend/`
(`spring.config.import`) e, sem ele, o assistente roda no modo simulado:

| Variável | Obrigatória | Efeito |
|---|---|---|
| `VERTEX_PROJETO` | para usar a IA | ID do projeto no Google Cloud. Vazio, o assistente responde no modo simulado |
| `VERTEX_REGIAO` | não | local do Vertex AI; padrão `us`, o multirregional dos EUA, único com o Gemini 3 e o ajuste fino dele (`eu` e `global` também servem a conversa) |
| `VERTEX_BUCKET` | para treinar | bucket do Cloud Storage onde cada treino grava o dataset |
| `VERTEX_CREDENCIAIS` | não | caminho da chave JSON da conta de serviço, no formato do Windows (`C:/Users/...`). Vazio, vale a credencial padrão do `gcloud` |
| `VERTEX_MODELO` | não | modelo base; padrão `gemini-3.5-flash` |

A credencial fica só no servidor: o navegador fala com a API da loja, nunca com o Google.

## Estrutura do repositório

```
backend/     API REST Spring Boot: controller, service, model, repository; carga/acervo.json
db/          schema.sql, seed.sql e as cargas de demonstração do PostgreSQL
frontend/    aplicação React, com a suíte Cypress em frontend/cypress
```

Os documentos da disciplina (DRS, DVP, casos de uso, backlog, rastreabilidade e diagramas)
são entregues à parte e não ficam no repositório. Os IDs de requisito citados no código e
nos testes vêm do DRS (Documento de Requisitos do Sistema). Nas vendas eletrônicas, o caso
de uso CDU03 – Gestão de Vendas é a fonte da verdade: onde o DRS é ambíguo, vale a leitura
registrada nas observações dele.

O DRS foi escrito para um e-commerce de livros; a adaptação para discos preserva a
numeração original dos requisitos. Onde o documento diz "livro", leia "disco".

A atividade de vendas eletrônicas cita os requisitos com outra numeração a partir da
finalização da compra. O código e os testes seguem o DRS do projeto; a correspondência:

| Atividade | DRS do projeto | Requisito |
|---|---|---|
| RF0037 | RF0038 | finalizar a compra em EM PROCESSAMENTO |
| RF0038 | RF0039 | despachar: EM TRANSPORTE |
| RF0039 | RF0040 | confirmar a entrega: ENTREGUE |
| RF0040 | RF0041 | solicitar troca |
| RF0041 | RF0042 | autorizar troca |
| RF0042 | RF0043 | visualizar trocas |
| RF0043 | RF0044 | confirmar o recebimento |
| RF0044 | RF0045 | gerar o cupom de troca |
| RNF0045 | RN0045 | retirar do carrinho os itens desbloqueados |
| RNF0046 | RN0046 | notificar a troca autorizada |

## Arquitetura

```
FormX (React)
  → XController        um controlador por recurso: traduz o HTTP e chama o serviço
  → XService           regras de negócio e transação
  → XRepository        Spring Data JPA
  → PostgreSQL
```

Cada serviço tem um método por caso de uso (`cadastrar`, `alterarSenha`, `inativar`...) e
devolve a própria entidade. Quando uma regra barra a operação, o serviço lança
`RegraNegocioException` com as mensagens, a transação é desfeita e o `TratadorDeErros`
responde `400` com `{ "mensagens": [...] }` (`401` no login). Serviço que depende de outro,
como o de pedido do de estoque e do de pagamento, recebe a classe dele no construtor.

Regra de negócio vive no serviço. O formulário repete validações de formato para dar
resposta imediata, mas quem decide é sempre o servidor.

## Assistente de recomendação (RNF0044)

O chat da loja é do cliente: sem sessão de cliente, o balão só convida a entrar. Cada pergunta
vai ao backend, que monta o texto da IA com três partes (as regras do assistente, o perfil do
cliente e o acervo disponível), chama o Gemini e grava a pergunta, a resposta e os discos
sugeridos. O cliente avalia cada resposta como útil ou não útil, e a Curadoria › Assistente
acompanha o modelo em uso, os treinos e o feedback.

### IA generativa escolhida

Gemini, no Vertex AI do Google Cloud, com o `gemini-3.5-flash` como modelo base. Em novembro
de 2026, foi a opção avaliada que permitia ajuste fino supervisionado a uma conta nova, como o
critério da atividade exige:

| Opção | Situação do ajuste fino em novembro de 2026 |
|---|---|
| Gemini no Vertex AI | disponível, com dataset JSONL no Cloud Storage e job gerenciado, sem GPU própria |
| Gemini API (AI Studio), usada no protótipo pelo Dify | indisponível desde maio de 2025, segundo a documentação do Google |
| OpenAI | plataforma em desativação, fechada a usuários novos |
| Mistral | ajuste fino listado como recurso obsoleto |
| Modelo aberto na máquina | sem GPU NVIDIA no ambiente do projeto |

Também pesaram a continuidade com o Gemini do protótipo, a qualidade em português e o custo
do modelo Flash. O Dify saiu: ele não faz ajuste fino, e chamá-lo do navegador expunha a chave.

### Preferências do cliente

O cliente marca gêneros e estilos em Minha conta › Preferências musicais (decisão do grupo,
já que o DRS não define a origem). O perfil que a IA recebe junta essas preferências às
compras, da mais recente para a mais antiga. As preferências pesam, mas não filtram: as regras
pedem, numa recomendação, dois discos do gosto do cliente e uma descoberta. O backend marca
como descoberta o disco cujo gênero principal não está entre os que somam um quarto das
compras do cliente nem entre os preferidos, e cujo estilo não é preferido.

### Ajuste fino com vendas e feedback

O dataset é montado do banco a cada treino, no formato de ajuste fino supervisionado do Gemini:

- **vendas:** cada compra de um cliente a partir da segunda vira um exemplo. O perfil traz as
  compras anteriores, a pergunta pede uma recomendação, e a resposta esperada são até três
  discos das compras seguintes, com o motivo (o estilo em comum com uma compra anterior, a
  preferência declarada ou, na descoberta, o disco do cliente que outros clientes levaram
  junto) e um texto com o nome do cliente e os discos, em frases que variam;
- **acervo:** junto com cada venda vai um exemplo de outra tarefa do chat, com o mesmo perfil e
  o mesmo acervo: dúvida sobre um disco (ano, artista, estilo, preço), busca por título,
  artista, estilo ou preço, ou pergunta fora do tema. A resposta sai dos dados do acervo do
  exemplo (`PerguntasDoAcervo`); a busca sem resultado usa artistas e discos que a loja não
  vende;
- **feedback:** cada resposta avaliada como útil vira um exemplo com a pergunta, a resposta e o
  perfil que a IA viu, gravado na interação. As não úteis ficam fora.

Os exemplos do acervo vieram do primeiro treino real, em 22/11/2026: só com vendas e feedback,
33 textos de resposta repetidos e 4 épocas, o modelo ajustado passou a responder qualquer
pergunta como recomendação, inclusive dúvidas e perguntas fora do tema. Desde então o treino
usa 2 épocas (`app.ia.vertex.epocas`).

O `TreinamentoService` grava o JSONL no bucket, cria o job de ajuste fino no Vertex AI e
acompanha o job a cada minuto. Concluído o treino, o chat passa a chamar o endpoint do modelo
ajustado, e a resposta mostra o treino em uso. Para a personalização seguir contínua, cada
venda e cada avaliação útil novas entram no próximo treino, e a Curadoria › Assistente mostra
quantos exemplos chegaram desde o último. Só a curadoria dispara o treino, pelo botão
**Treinar agora**: cada job tem custo no Google, e não há rotina que treine sozinha. Em
novembro de 2026, a massa de demonstração dava 153 exemplos de vendas, 153 do acervo e 34 de
feedback.

O perfil e o acervo continuam indo em cada pergunta: o ajuste fino ensina os padrões da loja,
e o contexto diz quem é o cliente agora e o que há em estoque.

### Modo simulado

Sem `VERTEX_PROJETO`, o `ModeloSimulado` responde por regra, sem rede nem custo: dados do disco
citado numa pergunta, discos do artista citado ou os discos mais próximos das compras e
preferências, mais uma descoberta. O treino conclui na primeira consulta. A curadoria mostra
"Modo simulado, sem IA" como modelo em uso. É o modo da suíte Cypress e da pilha em contêiner.

### Configuração do Vertex AI

1. Crie um projeto no Google Cloud com faturamento e ative a API `aiplatform.googleapis.com`.
2. Crie um bucket para os datasets. A região dele não importa para o ajuste fino.
3. Crie uma conta de serviço com `roles/aiplatform.user` no projeto e
   `roles/storage.objectAdmin` no bucket, e gere a chave JSON dela fora do repositório.
4. Preencha `backend/.env` com as variáveis da seção [Variáveis de ambiente](#variáveis-de-ambiente)
   e suba o backend de dentro de `backend/`.

## Escopo e limitações

- **Autenticação é simples, não é segurança.** Há login por e-mail e senha, com a senha
  guardada em hash BCrypt (RNF0033), e ele distingue cliente de administrador. A guarda de
  `/curadoria` fica só no React: a API continua aberta, sem JWT nem sessão no servidor.
- **Cliente não é excluído, é inativado.** O DRS só prevê a inativação (RF0023), e as
  chaves estrangeiras de `pedido` e `cupom` impedem o delete físico de quem tem histórico.
- **Testes automatizados cobrem cliente, disco, estoque, criação de pedido, vendas
  eletrônicas e análise de vendas.**
- **O carrinho mora no servidor e exige sessão de cliente.** O bloqueio da RN0044 é de um
  cliente: sem sessão, incluir um disco leva ao login. O prazo (15 min) e o aviso (5 min
  antes) ficam em `app.carrinho` no `application.yml`; uma rotina derruba os carrinhos
  vencidos a cada 15 s, e toda leitura do carrinho já considera o prazo. Incluir um disco
  ou aumentar a quantidade renova o prazo; reduzir não (CDU03 A1.3).
- **A operadora de cartão é simulada (decisão do grupo).** Como nos sandboxes de
  pagamento, os números de `app.operadora.cartoes-recusados` (padrão
  `4000 0000 0000 0002`) são recusados e qualquer outro é aceito. A rotina da RN0037
  valida a cada 10 s os pedidos com 30 s ou mais; a Curadoria › Pedidos valida na hora.
- **Compra reprovada devolve os cupons usados nela.** O DRS fala só dos itens (RN0028);
  como a compra não aconteceu, os cupons voltam ao cliente (decisão do grupo).
- **O cupom da diferença (RN0036) é emitido na aprovação.** A finalização só guarda o
  valor em `pedido.troco`; a compra reprovada não deixa crédito (CDU03 P8.2 e O13).
- **A troca não é recusada nem estornada.** O DRS só prevê a autorização (RF0042); o
  administrador informa no recebimento se os itens voltam ao estoque (RF0044).
- **A análise conta só as compras ENTREGUE, no gênero principal do disco (decisão do
  grupo).** O DRS (RN0074) aceitaria também APROVADA e EM TRANSPORTE, mas o critério da
  atividade manda só ENTREGUE. Um disco com vários gêneros tem um gênero principal, e a
  venda cai só nele; o mês é o da compra, que é a única data que o pedido guarda.
- **As preferências do cliente são declaradas em Minha conta (decisão do grupo).** O DRS não
  diz como obtê-las. Gêneros e estilos marcados pelo cliente atendem quem ainda não comprou
  e ficam sob controle dele; somados ao histórico, pesam na recomendação sem filtrar o
  acervo, e cada resposta reserva espaço para uma descoberta fora do gosto de costume.
- **Cada ajuste fino recomeça do modelo base com o dataset inteiro.** Assim todo treino
  enxerga todas as vendas e todo o feedback útil, sem depender de treinos anteriores. O
  feedback não útil fica fora do dataset, para o treino não reforçar a resposta ruim.
- **A suíte Cypress roda com o assistente no modo simulado.** Para testar contra uma pilha
  com o Vertex AI configurado, suba o backend com `--app.ia.vertex.projeto=`; com a IA de
  verdade, `assistente/treinamento.cy.ts` se pula, porque cada treino cria um job pago.
- **A pilha em contêiner roda o assistente no modo simulado.** A imagem não leva o
  `backend/.env` nem a chave da conta de serviço; o `docker-compose.vertex.yml` liga o Vertex
  AI montando a chave na hora de subir.
- **Deploy não foi definido.** O `docker-compose.yml` da raiz sobe a pilha inteira em
  contêiner, mas só para demonstração local: não há registro de imagens, TLS, segredos
  fora do arquivo nem servidor de destino.

## Solução de problemas

**`Connection to localhost:5433 refused` ao subir o backend.** O banco ainda está
inicializando. Espere o `pg_isready` responder `accepting connections` e tente de novo.

**`fail to move MAVEN_HOME` ao rodar `./mvnw` no Git Bash.** O wrapper `.cmd` e o `mvnw`
de shell guardam a mesma distribuição em pastas de nomes diferentes — um usa SHA-256 da
URL, o outro o hash estilo `String::hashCode` —, então o script de shell baixa de novo e
o `mv` para fora de `%TEMP%` pode esbarrar na permissão do Windows. Se o `.cmd` já rodou
uma vez, aproveite o que ele extraiu:

```bash
cd ~/.m2/wrapper/dists/apache-maven-3.9.16
mkdir -p 56ba1f9f && cp -r <pasta-de-hash-longo>/. 56ba1f9f/
```

O wrapper encontra `MAVEN_HOME` pronto e nem tenta baixar. A alternativa é usar sempre o
mesmo shell: `.\mvnw.cmd` no PowerShell ou `./mvnw` no Git Bash.

**Alterei `db/schema.sql` e o backend não sobe.** O volume do Postgres é nomeado: os
scripts de inicialização só rodam em volume vazio. Recrie:

```bash
docker compose down -v
docker compose up -d db
```

**`Schema validation: missing column` ou `wrong column type`.** O banco está velho em
relação às entidades. Mesma receita acima.

**Porta 5433 ou 8080 ocupada.** Ajuste `docker-compose.yml` e
`backend/src/main/resources/application.yml`; se mudar a porta da API, ajuste também
`VITE_API_URL` e o `env.apiUrl` de `frontend/cypress.config.ts`.

**Porta 3300 ocupada.** O Vite roda com `strictPort: true` e falha em vez de trocar de
porta. Libere a 3300 ou altere `frontend/vite.config.ts`, `app.cors.origem` no backend e
o `baseUrl` de `frontend/cypress.config.ts` — os três precisam concordar.

**A loja abre sem nenhum cliente, ou o login do admin falha.** O volume do banco é
anterior ao [db/clientes.sql](db/clientes.sql) ou ao
[db/administradores.sql](db/administradores.sql): os scripts de inicialização só rodam em
volume vazio, e o backend nem sobe se a tabela `administrador` faltar.
Recrie com `docker compose down -v && docker compose up -d`, ou carregue os três de teste
com `POST /api/dev/reset`. Depois recarregue a página.

**O chat mostra respostas de antes do reset.** A conversa do assistente fica no
`sessionStorage` da aba, sob a chave `33rpm:conversa:<cliente>`, e o `dev/reset` só alcança
o banco. Feche a aba ou abra uma janela anônima.

**O chat responde "O assistente não conseguiu responder agora".** O backend registra a causa
no log, na linha `Assistente sem resposta da IA`. `403` é permissão da conta de serviço que
ainda não propagou ou falta o papel `roles/aiplatform.user`; `429` é limite de chamadas por
minuto; `404` com `Publisher Model` é modelo aposentado ou fora do local de `VERTEX_REGIAO`
(o Gemini 3 não roda em `us-central1`), e `VERTEX_MODELO` troca o modelo base.

**O backend não sobe com `Não foi possível ler a credencial do Vertex AI`.** O caminho de
`VERTEX_CREDENCIAIS` está errado ou no formato do Git Bash (`/c/Users/...`). Use
`C:/Users/...`.

**Erro de CORS no navegador.** O backend libera apenas `http://localhost:3300`
(`app.cors.origem`). Rodando o Vite em outra porta, ajuste essa propriedade.

**Cypress falha com `bad option: --smoke-test`.** A variável `ELECTRON_RUN_AS_NODE` está
definida no ambiente — o terminal integrado do VS Code faz isso — e o binário do Cypress
acaba executando como Node. Limpe-a antes de rodar:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE
npm run e2e
```
