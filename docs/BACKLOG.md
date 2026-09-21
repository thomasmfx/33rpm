# Backlog do 33rpm

111 atividades em 15 blocos, estimadas em três pontos (otimista / realista /
pessimista, em horas). Gerado a partir de `ESTIMATIVA.xlsx`, que continua sendo
a fonte para a entrega da disciplina — este arquivo é a versão legível.

**Total:** 139h otimista · 266h realista · 395h pessimista

Este arquivo define **o escopo**: o que precisa ser feito e o que cada tarefa
cobre. Ele não registra progresso — o estado de cada tarefa vive no board do
Notion, descrito em `CONTEXTO.md`. Consulte lá antes de começar qualquer coisa.

A coluna **Certeza** indica o quanto o escopo da tarefa está claro. Tarefas com
certeza **Baixa** merecem confirmação antes de implementar: o caminho não está
definido ou depende de decisão ainda não tomada.

## Resumo

| Bloco | Tarefas | Realista |
|---|---:|---:|
| Planejamento e Documentação | 6 | 30h |
| Ambiente e Banco de Dados | 9 | 17h |
| Backend — Cadastro de Clientes | 9 | 20h |
| Backend — Cadastro de Produtos (Discos) | 11 | 28h |
| Backend — Controle de Estoque | 6 | 14h |
| Backend — Carrinho e Compra | 16 | 34h |
| Backend — Pós-venda e Trocas | 8 | 15h |
| Backend — Análise Gerencial | 7 | 10h |
| Backend — Recomendação e Chatbot (IA) | 4 | 10h |
| Backend — Requisitos Não Funcionais Gerais | 2 | 9h |
| Frontend — Base | 3 | 11h |
| Frontend — Área do Cliente | 6 | 10h |
| Frontend — Catálogo e Compra | 8 | 21h |
| Frontend — Painel Administrativo | 9 | 16h |
| Testes de Interface (Cypress) | 7 | 21h |

---

## Planejamento e Documentação

*6 tarefas · 19 / 30 / 43 h*

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Levantamento e organização de requisitos (DRS) | 2/4/8 | Média | Leitura, consolidação e rastreio dos RF/RNF/RN |
| Documento de Visão (DVS) | 10/12/14 | Baixa | Escopo, público-alvo, stakeholders e proposta de valor do 33rpm |
| Modelagem de casos de uso e diagramas UML | 3/6/9 | Média | Casos de uso, classes e diagrama de estados da venda/troca |
| Estimativa detalhada das atividades | 2/4/6 | Média | Preenchimento e revisão desta planilha (PERT 3 pontos) |
| Criação e configuração do Kanban | 1/2/3 | Alta | Colunas, WIP e importação das atividades |
| Preparação de slides (por entrega) | 1/2/3 | Alta | Apresentação de cada entrega parcial |

## Ambiente e Banco de Dados

*9 tarefas · 8 / 17 / 26 h*

O `schema.sql` em `/db` já cobre as tarefas de DDL e carga de domínio.

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Configuração do ambiente de desenvolvimento | 1/2/3 | Alta | Projetos Spring Boot e React + TS e banco PostgreSQL local |
| Modelagem do banco (DER e dicionário de dados) | 3.5/7/10.5 | Alta | Entidades, relacionamentos, tipos e restrições |
| Migrations: cliente, endereço e cartão de crédito | 0.5/1/1.5 | Alta | RF0021, RF0026, RF0027 |
| Migrations: produto, categoria e grupo de precificação | 0.5/1/1.5 | Alta | RF0011, RN0012, RN0013 |
| Migrations: estoque e entrada de estoque | 0.5/1/1.5 | Alta | RF0051, RN0050 |
| Migrations: venda, item de venda e status | 0.5/1/1.5 | Alta | RF0033, RF0038 |
| Migrations: cupom e pedido de troca | 0.5/1/1.5 | Alta | RF0041, RF0045, RN0036 |
| Migrations: log de transações | 0.5/1/1.5 | Alta | RNF0012 |
| Script de carga das tabelas de domínio | 1/2/3 | Alta | RNF0013 (grupo de precificação, gravadora, fornecedor, categoria etc.) |

## Backend — Cadastro de Clientes

*9 tarefas · 10 / 20 / 30 h*

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Análise e modelagem do cadastro de cliente | 1.5/3/4.5 | Média | Campos, relacionamentos e regras |
| CRUD de cliente | 2/4/6 | Alta | RF0021, RF0022 |
| Geração de código único de cliente | 0.5/1/1.5 | Alta | RNF0035 |
| Validações dos dados cadastrais do cliente | 0.5/1/1.5 | Alta | Campos obrigatórios e formatos |
| Inativação de cliente | 0.5/1/1.5 | Alta | RF0023 |
| Consulta de clientes com filtros combinados | 1/2/3 | Média | RF0024 |
| CRUD de endereços de entrega do cliente | 1.5/3/4.5 | Média | RF0026, RNF0034 (nome identificador por endereço) |
| CRUD de cartões de crédito e cartão preferencial | 1.5/3/4.5 | Média | RF0027 |
| Consulta de transações do cliente | 1/2/3 | Alta | RF0025 |

## Backend — Cadastro de Produtos (Discos)

*11 tarefas · 14 / 28 / 42 h*

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Análise e modelagem do cadastro de produto | 2/4/6 | Média | Atributos do disco e relacionamento com categorias |
| CRUD de produto | 2/4/6 | Média | RF0011, RF0014 |
| Validação dos dados obrigatórios do produto | 1.5/3/4.5 | Média | RN0011 |
| Associação de produto a múltiplas categorias | 0.5/1/1.5 | Alta | RN0012 |
| Geração de código único de produto | 0.5/1/1.5 | Alta | RNF0021 |
| Grupo de precificação e cálculo do valor de venda | 1.5/3/4.5 | Média | RF0052, RN0013 |
| Validação de margem de lucro e autorização gerencial | 1.5/3/4.5 | Média | RN0014 |
| Inativação manual com justificativa e categoria | 0.5/1/1.5 | Média | RF0012, RN0015 |
| Ativação com justificativa e categoria | 1/2/3 | Média | RF0016, RN0017 |
| Rotina de inativação automática | 1.5/3/4.5 | Média | RF0013, RN0016 (sem estoque e venda abaixo do parâmetro) |
| Consulta de produtos com filtros combinados | 1.5/3/4.5 | Média | RF0015 |

## Backend — Controle de Estoque

*6 tarefas · 8 / 14 / 20 h*

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Análise e modelagem do controle de estoque | 3/5/7 | Média | Entrada, saída, custo e lote |
| Entrada em estoque com dados obrigatórios | 1.5/3/4.5 | Alta | RF0051, RN0050, RNF0064 |
| Validação de quantidade e valor de custo | 1/2/3 | Média | RN0061, RN0062 |
| Recálculo do valor de venda pelo maior custo | 1/2/3 | Média | RN0051 |
| Baixa de estoque na venda | 0.5/1/1.5 | Alta | RF0053 |
| Reentrada de estoque após troca | 0.5/1/1.5 | Média | RF0054 |

## Backend — Carrinho e Compra

*16 tarefas · 17 / 34 / 51 h*

Maior bloco do projeto. Concentra RN0031 a RN0046. As regras já existem em `frontend/src/utils/` e devem migrar para cá.

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Análise e modelagem do carrinho de compra | 1.5/3/4.5 | Alta | Estados do carrinho e ciclo de vida dos itens |
| CRUD de itens do carrinho | 1/2/3 | Alta | RF0031, RF0032 |
| Validação de estoque na adição de itens | 0.5/1/1.5 | Alta | RN0031 |
| Bloqueio temporário de item com prazo parametrizado | 1/2/3 | Média | RN0044 |
| Rotina de expiração de bloqueio e remoção de itens | 2/4/6 | Média | RN0044, RN0045 |
| Notificação de expiração do bloqueio | 1.5/3/4.5 | Média | RN0044 (aviso 5 minutos antes) |
| Apresentação de itens retirados do carrinho | 1/2/3 | Alta | RNF0042 |
| Revalidação de estoque na finalização da compra | 0.5/1/1.5 | Alta | RN0032 |
| Cálculo de frete | 1/2/3 | Média | RF0034 |
| Seleção de endereço de entrega na compra | 0.5/1/1.5 | Alta | RF0035 (inclusive incorporação ao perfil) |
| Seleção de forma de pagamento | 0.5/1/1.5 | Alta | RF0036 |
| Pagamento com múltiplos cartões e valor mínimo | 1/2/3 | Alta | RN0034 |
| Aplicação de cupons de troca e promocionais | 1.5/3/4.5 | Alta | RF0037, RN0033, RN0035 |
| Geração de cupom de troca por excedente de cupons | 1.5/3/4.5 | Média | RN0036 |
| Finalização da compra e status EM PROCESSAMENTO | 1/2/3 | Alta | RF0033, RF0038 |
| Validação do pagamento e status APROVADA/REPROVADA | 1/2/3 | Alta | RN0037, RN0038 |

## Backend — Pós-venda e Trocas

*8 tarefas · 8 / 15 / 22 h*

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Análise e modelagem do fluxo de trocas | 1.5/3/4.5 | Média | Diagrama de estados do pedido e do pedido de troca |
| Despacho para entrega (EM TRANSPORTE) | 0.5/1/1.5 | Alta | RF0039, RN0039 |
| Confirmação de entrega (ENTREGUE) | 0.5/1/1.5 | Alta | RF0040, RN0040 |
| Solicitação de troca pelo cliente | 1/2/3 | Média | RF0041, RN0041, RN0043 |
| Visualização de pedidos de troca pelo administrador | 0.5/1/1.5 | Alta | RF0043 |
| Autorização de troca e notificação ao cliente | 2/4/6 | Média | RF0042, RN0046 |
| Confirmação de recebimento e retorno ao estoque | 1/2/3 | Alta | RF0044, RN0042 |
| Geração do cupom de troca ao cliente | 0.5/1/1.5 | Média | RF0045 |

## Backend — Análise Gerencial

*7 tarefas · 5 / 10 / 15 h*

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Análise e modelagem da consulta de histórico de vendas | 1.5/3/4.5 | Alta | Agregações necessárias e desenho do endpoint |
| Consulta agregada de vendas por categoria e mês | 1/2/3 | Alta | RF0055, RN0071 |
| Filtro de período com validação de datas | 0.5/1/1.5 | Alta | RF0056, RN0072 |
| Filtro de status considerados no cálculo | 0.5/1/1.5 | Alta | RN0074 |
| Preenchimento de meses sem venda com R$ 0,00 | 0.5/1/1.5 | Alta | RN0073 |
| Seleção de múltiplas categorias para comparação | 0.5/1/1.5 | Média | RF0057 |
| Exportação dos dados em planilha | 0.5/1/1.5 | Média | RF0058 |

## Backend — Recomendação e Chatbot (IA)

*4 tarefas · 5 / 10 / 15 h*

Única dependência externa. Comece pela prova de conceito antes de integrar.

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Prova de conceito Dify.ai + Google AI Studio | 1.5/3/4.5 | Média | Validar viabilidade e limites antes de integrar |
| Modelagem dos dados de entrada da recomendação | 1/2/3 | Baixa | RNF0044 (histórico de compras e preferências) |
| Endpoint de recomendação personalizada | 1.5/3/4.5 | Média | RNF0044 |
| Integração do chatbot de busca e dúvidas | 1/2/3 | Baixa | RNF0044 |

## Backend — Requisitos Não Funcionais Gerais

*2 tarefas · 4 / 9 / 14 h*

Só depois que os módulos de negócio existirem.

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Log de transações nas operações de escrita | 1.5/3/4.5 | Média | RNF0012 (data, hora, usuário e dados alterados) |
| Otimização de consultas e índices | 3/6/9 | Baixa | RNF0011 (resposta em até 1 segundo) |

## Frontend — Base

*3 tarefas · 6 / 11 / 16 h*

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Estrutura base e layout da aplicação | 2/4/6 | Alta | Rotas, shell e navegação |
| Simulação de sessão com localStorage | 1/2/3 | Alta | Contexto de sessão e persistência |
| Alternância de perfil e guarda de rotas | 3/5/7 | Média | Acesso separado para cliente e administrador |

## Frontend — Área do Cliente

*6 tarefas · 5 / 10 / 15 h*

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Tela de entrada de sessão (login simulado) | 0.5/1/1.5 | Alta | Seleção do usuário/perfil ativo |
| Tela de cadastro de cliente | 1/2/3 | Alta | RF0021 |
| Tela de perfil e alteração de dados cadastrais | 1/2/3 | Alta | RF0022 |
| Tela de endereços de entrega | 1/2/3 | Alta | RF0026, RNF0034 |
| Tela de cartões de crédito | 1/2/3 | Alta | RF0027 |
| Tela de histórico de transações do cliente | 0.5/1/1.5 | Alta | RF0025 |

## Frontend — Catálogo e Compra

*8 tarefas · 10 / 21 / 32 h*

As telas existem sobre dados mockados; migrar para chamadas HTTP quando o backend existir.

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Tela de catálogo com busca e filtros | 1.5/3/4.5 | Alta | RF0015 (filtros por sonoridade, vibe e subgênero) |
| Tela de detalhe do produto | 1.5/3/4.5 | Alta | Ficha do disco e adição ao carrinho |
| Tela de carrinho | 1/2/3 | Alta | RF0031, RF0032, RNF0042 |
| Checkout: endereço de entrega e frete | 1/2/3 | Alta | RF0034, RF0035 |
| Checkout: pagamento com cartões e cupons | 1.5/3/4.5 | Alta | RF0036, RF0037 |
| Tela de confirmação e acompanhamento do pedido | 1/2/3 | Alta | RF0038 (exibição do status da compra) |
| Tela de solicitação de troca | 1/2/3 | Alta | RF0041 |
| Interface do chatbot e vitrine de recomendações | 2/4/6 | Média | RNF0044 |

## Frontend — Painel Administrativo

*9 tarefas · 8 / 16 / 24 h*

As telas existem sobre dados mockados; migrar para chamadas HTTP quando o backend existir.

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Tela de cadastro e consulta de produtos | 1.5/3/4.5 | Alta | RF0011, RF0014, RF0015 |
| Tela de ativação/inativação de produto com justificativa | 0.5/1/1.5 | Alta | RF0012, RF0016, RN0015, RN0017 |
| Tela de consulta e inativação de clientes | 0.5/1/1.5 | Alta | RF0023, RF0024 |
| Tela de entrada em estoque | 1/2/3 | Alta | RF0051, RN0050 |
| Tela de gestão de pedidos e mudança de status | 1/2/3 | Alta | RF0039, RF0040 |
| Tela de gestão de trocas | 1/2/3 | Alta | RF0042, RF0043, RF0044 |
| Tela do gráfico gerencial de vendas | 1.5/3/4.5 | Alta | RNF0043, RNF0045, RNF0046 (linhas, legenda e tooltip) |
| Filtros de período e categorias na tela de análise | 0.5/1/1.5 | Alta | RF0056, RF0057 |
| Exportação da planilha na tela de análise | 0.5/1/1.5 | Alta | RF0058 |

## Testes de Interface (Cypress)

*7 tarefas · 12 / 21 / 30 h*

Cypress já está instalado. Escopo restrito ao CRUD de cliente por definição do professor.

| Tarefa | O/R/P | Certeza | Requisitos |
|---|---|---|---|
| Configuração da suíte Cypress | 4/6/8 | Baixa | Ambiente de teste, fixtures e comandos customizados |
| Teste de interface: cadastro de cliente | 1.5/3/4.5 | Média | RF0021 (caminho feliz do formulário) |
| Teste de interface: validações do formulário de cliente | 2/4/6 | Média | Campos obrigatórios e mensagens de erro |
| Teste de interface: alteração de dados do cliente | 1.5/3/4.5 | Média | RF0022 |
| Teste de interface: consulta de clientes com filtros | 1/2/3 | Média | RF0024 |
| Teste de interface: inativação de cliente | 0.5/1/1.5 | Média | RF0023 |
| Teste de interface: endereços e cartões do cliente | 1/2/3 | Média | RF0026, RF0027 |