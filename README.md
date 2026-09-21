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
| Cadastro de clientes | **Completo de ponta a ponta**: React → API Spring Boot → PostgreSQL, com 42 testes Cypress |
| Catálogo, estoque, carrinho, compra, trocas, cupons e análise gerencial | Interface pronta, rodando sobre dados mockados em `localStorage` |
| Assistente de recomendação | Funciona local; com as chaves do Dify.ai preenchidas, passa a conversar pelo serviço |

O backend cobre apenas o agregado Cliente. A arquitetura em Fachada já está montada para
receber as demais entidades sem alteração das classes existentes.

## Stack

**Frontend** — React 19 · TypeScript · Vite · Mantine 9 · SCSS Modules · react-router-dom 7 · Cypress
**Backend** — Java 21 · Spring Boot 4.1 · Spring Web MVC · Spring Data JPA · Hibernate · BCrypt
**Banco** — PostgreSQL 16 com a extensão pgvector (busca semântica) e unaccent (consulta sem acento)
**Externo** — Dify.ai com Google Gemini, para o assistente de recomendação

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
| [db/schema.sql](db/schema.sql) | o DDL, 29 tabelas |
| [db/seed.sql](db/seed.sql) | tabelas de domínio do RNF0013: gênero, tipo de telefone, bandeira, as 27 unidades federativas e as operações de log |
| [db/clientes.sql](db/clientes.sql) | cinco clientes de demonstração, com telefone, endereço e cartão |

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

O banco já sobe com estes cinco cadastros, todos com a senha `Senha@123`:

| Código | Nome | E-mail | Situação |
|---|---|---|---|
| CLI-000001 | Ana Paula Ribeiro | `ana.ribeiro@email.com` | ativa, ranking 5, 1 endereço, 1 cartão |
| CLI-000002 | Bruno Tavares | `bruno.tavares@email.com` | ativo, ranking 3, 1 endereço |
| CLI-000003 | Carla Nogueira | `carla.nogueira@email.com` | **inativa**, ranking 1, 1 endereço |
| CLI-000004 | Diego Ferraz | `diego.ferraz@email.com` | ativo, ranking 4, endereços de cobrança e entrega separados, 2 cartões |
| CLI-000005 | Eduarda Lins | `eduarda.lins@email.com` | ativo, ranking 2, 1 endereço, 1 cartão |

Carla é a inativa de propósito: é com ela que se demonstra o bloqueio de acesso da RF0023.
Diego é o caso de cobrança e entrega em endereços distintos (RN0021 e RN0022) e de cartão
preferencial entre dois (RF0027).

Para voltar ao estado conhecido durante a demonstração, com o banco e a API no ar:

```bash
curl -X POST http://localhost:8080/api/dev/reset      # PowerShell: curl.exe -X POST ...
```

Esse endpoint, que só existe no perfil `dev`, é o que os testes usam: ele limpa o cadastro
e deixa **apenas os três primeiros** clientes. Para ter os cinco de volta, recrie o volume
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

A lista de clientes é buscada uma vez, quando a página abre. Se você rodou o
`dev/reset` ou recriou o banco com a loja aberta, recarregue a página: pedidos, cupons e o
dashboard são derivados dos clientes.

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
| `/curadoria/clientes` | cadastrar (RF0021), consultar com filtros combinados (RF0024), alterar (RF0022), salvar apenas a senha (RF0028), salvar apenas os endereços (RNF0034), cartões e preferencial (RF0027), inativar e reativar (RF0023) |
| `/login` | entrar como `ana.ribeiro@email.com` / `Senha@123`; tentar `carla.nogueira@email.com` para ver o bloqueio do cadastro inativo |
| `/cadastro` | auto-cadastro do cliente, que já entra na loja ao concluir |
| terminal | `npm run e2e` — os 42 testes contra a pilha real |
| banco | `docker compose exec db psql -U 33rpm -d 33rpm -c "SELECT codigo, nome, is_ativo FROM cliente;"` — a prova de que a tela escreveu no PostgreSQL |

## Testes de interface

A suíte roda contra a pilha real — navegador, API e banco — sem nenhum mock no caminho.
Com os três serviços no ar:

```bash
cd frontend
npm run e2e                     # execução headless
npm run e2e:open                # abre o runner do Cypress
```

| Spec | Testes | Cobre |
|---|---:|---|
| `cadastro.cy.ts` | 6 | RF0021, RN0021 a RN0023, RN0026, RF0026, RF0027, RNF0035 |
| `validacoes.cy.ts` | 7 | RN0026, RNF0031, RNF0032, RNF0033, unicidade de e-mail e CPF |
| `consulta.cy.ts` | 10 | RF0024 — filtros isolados e combinados |
| `alteracao.cy.ts` | 6 | RF0022, RF0028, RNF0034 |
| `inativacao.cy.ts` | 4 | RF0023 — inativar sem excluir |
| `cartoes.cy.ts` | 5 | RF0027, RN0024, RN0025 |
| `sessao.cy.ts` | 4 | login, credencial inválida, cliente inativo, auto-cadastro |

O mapa completo de requisito → código → teste está em
[docs/RASTREABILIDADE-CLIENTE.md](docs/RASTREABILIDADE-CLIENTE.md).

Cada teste chama `POST /api/dev/reset` antes de rodar, então a suíte é repetível sem
recriar o banco. Esse reset trunca `cliente` **e** `log`: para mostrar o registro de
escritas do RNF0012, faça a operação na tela depois da última execução da suíte e consulte
o banco:

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

Todas as escritas passam pela Fachada e devolvem a entidade afetada, ou `400` com
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
| `POST` | `/api/clientes/login` | autenticação simples por e-mail e senha |
| `GET` | `/api/dominios` | listas de domínio: gêneros, tipos de telefone, bandeiras e estados |
| `POST` | `/api/dev/reset` | recarrega a massa de teste (só no perfil `dev`) |

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
| `VITE_DIFY_API_URL` | não | ausente, o chat responde pelo recomendador local |
| `VITE_DIFY_API_KEY` | não | idem |

O Vite embute qualquer `VITE_*` no bundle do navegador: a chave do Dify fica visível no
DevTools. Serve para demonstrar a integração — em produção a chamada precisa sair do
servidor.

## Estrutura do repositório

```
backend/     API REST Spring Boot: controller, service, model, repository
db/          schema.sql e seed.sql do PostgreSQL
docs/        DRS, DVP, backlog, rastreabilidade e diagramas
frontend/    aplicação React, com a suíte Cypress em frontend/cypress
```

Documentos:

| Arquivo | O que é |
|---|---|
| [docs/DRS.docx](docs/DRS.docx) | Documento de Requisitos do Sistema — fonte dos RF, RNF e RN |
| [docs/DVP.docx](docs/DVP.docx) | Documento de Visão de Projeto — arquitetura e diagramas |
| [docs/BACKLOG.md](docs/BACKLOG.md) | as 111 atividades, com estimativa em três pontos |
| [docs/RASTREABILIDADE-CLIENTE.md](docs/RASTREABILIDADE-CLIENTE.md) | requisito → código → teste que o prova |
| [docs/diagramas/](docs/diagramas/) | casos de uso, classes, sequência, pacotes, implantação e dados |

O DRS foi escrito para um e-commerce de livros; a adaptação para discos preserva a
numeração original dos requisitos. Onde o documento diz "livro", leia "disco".

## Arquitetura

```
FormX (React)
  → XController        um controlador por entidade, dependendo de IFachada
  → Fachada            Map<String, IService>, delega pelo nome da entidade
  → XService           regras de negócio
  → XRepository        Spring Data JPA
  → PostgreSQL
```

As quatro operações — `inserir`, `alterar`, `consultar`, `excluir` — trafegam
`EntidadeDominio` e devolvem um `Resultado`, que carrega as entidades afetadas ou as
mensagens de negócio. Incluir uma entidade nova não altera a Fachada: o serviço registra
sua própria chave no mapa.

Regra de negócio vive no serviço. O formulário repete validações de formato para dar
resposta imediata, mas quem decide é sempre o servidor.

## Escopo e limitações

- **Autenticação é simples, não é segurança.** Há login por e-mail e senha, com a senha
  guardada em hash BCrypt (RNF0033), mas não há JWT, sessão no servidor nem proteção de
  rota: `/curadoria` está aberta.
- **Cliente não é excluído, é inativado.** O DRS só prevê a inativação (RF0023), e as
  chaves estrangeiras de `pedido` e `cupom` impedem o delete físico de quem tem histórico.
- **Testes automatizados cobrem o CRUD de cliente**, por definição do professor.
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

**A loja abre sem nenhum cliente.** O volume do banco é anterior ao
[db/clientes.sql](db/clientes.sql): os scripts de inicialização só rodam em volume vazio.
Recrie com `docker compose down -v && docker compose up -d`, ou carregue os três de teste
com `POST /api/dev/reset`. Depois recarregue a página.

**A loja está com estoque estranho, carrinho cheio ou pedido de ensaio.** Discos, estoque,
carrinho, pedidos e cupons ainda vivem no `localStorage`, sob as chaves `33rpm:*` — o
`dev/reset` só alcança o banco. Limpe os dados do site em `localhost:3300`
(DevTools → Application → Local Storage) ou abra uma janela anônima.

**Erro de CORS no navegador.** O backend libera apenas `http://localhost:3300`
(`app.cors.origem`). Rodando o Vite em outra porta, ajuste essa propriedade.

**Cypress falha com `bad option: --smoke-test`.** A variável `ELECTRON_RUN_AS_NODE` está
definida no ambiente — o terminal integrado do VS Code faz isso — e o binário do Cypress
acaba executando como Node. Limpe-a antes de rodar:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE
npm run e2e
```
