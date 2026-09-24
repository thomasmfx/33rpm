-- =====================================================================
-- 33rpm — schema PostgreSQL
-- Gerado a partir do diagrama de classes de domínio (Figura 9)
-- =====================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- extensão para a busca semântica do assistente de recomendação (RNF0044)
CREATE EXTENSION IF NOT EXISTS vector;

-- RF0024: consulta por nome e e-mail ignorando acentos, como a busca da interface
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ---------------------------------------------------------------------
-- Tabelas de domínio (RNF0013)
-- ---------------------------------------------------------------------
CREATE TABLE genero (
    id              bigserial PRIMARY KEY,
    desc_genero     varchar(40) NOT NULL UNIQUE
);

CREATE TABLE tipo_telefone (
    id              bigserial PRIMARY KEY,
    desc_tipo       varchar(40) NOT NULL UNIQUE
);

CREATE TABLE bandeira_cartao (
    id              bigserial PRIMARY KEY,
    desc_bandeira   varchar(40) NOT NULL UNIQUE
);

CREATE TABLE tipo_cupom (
    id              bigserial PRIMARY KEY,
    desc_tipo       varchar(40) NOT NULL UNIQUE
);

CREATE TABLE estado (
    id              bigserial PRIMARY KEY,
    desc_estado     varchar(40) NOT NULL UNIQUE
);

CREATE TABLE cidade (
    id              bigserial PRIMARY KEY,
    desc_cidade     varchar(80) NOT NULL,
    estado_id       bigint NOT NULL REFERENCES estado (id),
    CONSTRAINT uq_cidade_estado UNIQUE (desc_cidade, estado_id)
);

CREATE TABLE artista (
    id              bigserial PRIMARY KEY,
    nome            varchar(120) NOT NULL UNIQUE
);

CREATE TABLE gravadora (
    id              bigserial PRIMARY KEY,
    nome            varchar(120) NOT NULL UNIQUE
);

CREATE TABLE categoria (
    id              bigserial PRIMARY KEY,
    desc_categoria  varchar(60) NOT NULL UNIQUE
);

CREATE TABLE grupo_precificacao (
    id              bigserial PRIMARY KEY,
    nome            varchar(60) NOT NULL UNIQUE,
    margem_lucro    numeric(5,2) NOT NULL CHECK (margem_lucro >= 0)
);

CREATE TABLE categoria_status (
    id              bigserial PRIMARY KEY,
    desc_categoria  varchar(60) NOT NULL UNIQUE
);

CREATE TABLE status_pedido (
    id              bigserial PRIMARY KEY,
    descricao       varchar(40) NOT NULL UNIQUE
);

CREATE TABLE operacao_log (
    id              bigserial PRIMARY KEY,
    descricao       varchar(40) NOT NULL UNIQUE
);

CREATE TABLE fornecedor (
    id              bigserial PRIMARY KEY,
    nome            varchar(120) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- Cliente e agregados
-- ---------------------------------------------------------------------
-- RNF0035: numera o código de cliente sem depender da chave técnica
CREATE SEQUENCE seq_codigo_cliente;

CREATE TABLE cliente (
    id                  bigserial PRIMARY KEY,
    codigo              varchar(20) NOT NULL UNIQUE,
    nome                varchar(120) NOT NULL,
    email               varchar(120) NOT NULL UNIQUE,
    cpf                 varchar(11) NOT NULL UNIQUE,
    data_nascimento     date NOT NULL,
    -- RNF0033: hash BCrypt, nunca a senha em claro
    senha               varchar(72) NOT NULL,
    ranking             integer NOT NULL DEFAULT 0,
    is_ativo            boolean NOT NULL DEFAULT true,
    genero_id           bigint NOT NULL REFERENCES genero (id),
    data_cadastro       timestamp NOT NULL DEFAULT now()
);

CREATE TABLE telefone (
    id                  bigserial PRIMARY KEY,
    cliente_id          bigint NOT NULL REFERENCES cliente (id) ON DELETE CASCADE,
    tipo_telefone_id    bigint NOT NULL REFERENCES tipo_telefone (id),
    ddd                 varchar(2) NOT NULL,
    numero              varchar(9) NOT NULL,
    data_cadastro       timestamp NOT NULL DEFAULT now(),
    CONSTRAINT uq_telefone_cliente UNIQUE (cliente_id)
);

-- RN0023: composição obrigatória do endereço, com observações como único campo opcional
CREATE TABLE endereco (
    id                  bigserial PRIMARY KEY,
    cliente_id          bigint NOT NULL REFERENCES cliente (id) ON DELETE CASCADE,
    cidade_id           bigint NOT NULL REFERENCES cidade (id),
    nome                varchar(60) NOT NULL,
    tipo                varchar(30) NOT NULL,
    tipo_residencia     varchar(30) NOT NULL,
    tipo_logradouro     varchar(30) NOT NULL,
    logradouro          varchar(120) NOT NULL,
    numero              varchar(10) NOT NULL,
    bairro              varchar(60) NOT NULL,
    cep                 varchar(8) NOT NULL,
    pais                varchar(40) NOT NULL DEFAULT 'Brasil',
    observacoes         text,
    data_cadastro       timestamp NOT NULL DEFAULT now(),
    -- RN0021 e RN0022: um endereço serve para entrega, cobrança, ou os dois
    CONSTRAINT ck_endereco_tipo CHECK (tipo IN ('entrega', 'cobranca', 'ambos'))
);

CREATE TABLE cartao (
    id                  bigserial PRIMARY KEY,
    cliente_id          bigint NOT NULL REFERENCES cliente (id) ON DELETE CASCADE,
    bandeira_cartao_id  bigint NOT NULL REFERENCES bandeira_cartao (id),
    numero              varchar(20) NOT NULL,
    nome_impresso       varchar(80) NOT NULL,
    -- RN0024 exige o código de segurança no registro do cartão. Em produção isso
    -- violaria o PCI DSS, que proíbe armazenar o CVV após a autorização.
    codigo_seguranca    varchar(4) NOT NULL,
    is_preferencial     boolean NOT NULL DEFAULT false,
    data_cadastro       timestamp NOT NULL DEFAULT now()
);

-- apenas um cartão preferencial por cliente
CREATE UNIQUE INDEX uq_cartao_preferencial
    ON cartao (cliente_id) WHERE is_preferencial;

-- ---------------------------------------------------------------------
-- Disco e agregados
-- ---------------------------------------------------------------------
CREATE TABLE disco (
    id                      bigserial PRIMARY KEY,
    artista_id              bigint NOT NULL REFERENCES artista (id),
    gravadora_id            bigint NOT NULL REFERENCES gravadora (id),
    grupo_precificacao_id   bigint NOT NULL REFERENCES grupo_precificacao (id),
    titulo                  varchar(160) NOT NULL,
    ano_lancamento          date NOT NULL,
    codigo_catalogo         varchar(40) NOT NULL,
    preco_venda             numeric(10,2) NOT NULL CHECK (preco_venda >= 0),
    estoque                 integer NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    is_ativo                boolean NOT NULL DEFAULT true,
    embedding               vector(768)
);

CREATE TABLE disco_categoria (
    disco_id        bigint NOT NULL REFERENCES disco (id) ON DELETE CASCADE,
    categoria_id    bigint NOT NULL REFERENCES categoria (id),
    PRIMARY KEY (disco_id, categoria_id)
);

CREATE TABLE motivo_status (
    id                      bigserial PRIMARY KEY,
    disco_id                bigint NOT NULL REFERENCES disco (id) ON DELETE CASCADE,
    categoria_status_id     bigint NOT NULL REFERENCES categoria_status (id),
    justificativa           text NOT NULL,
    automatico              boolean NOT NULL DEFAULT false
);

CREATE TABLE entrada_estoque (
    id              bigserial PRIMARY KEY,
    disco_id        bigint NOT NULL REFERENCES disco (id),
    fornecedor_id   bigint NOT NULL REFERENCES fornecedor (id),
    quantidade      integer NOT NULL CHECK (quantidade > 0),
    valor_custo     numeric(10,2) NOT NULL CHECK (valor_custo > 0),
    data_entrada    date NOT NULL DEFAULT CURRENT_DATE
);

-- ---------------------------------------------------------------------
-- Pedido e agregados
-- ---------------------------------------------------------------------
CREATE TABLE pedido (
    id              bigserial PRIMARY KEY,
    cliente_id      bigint NOT NULL REFERENCES cliente (id),
    endereco_id     bigint NOT NULL REFERENCES endereco (id),
    data            timestamp NOT NULL DEFAULT now(),
    subtotal        numeric(10,2) NOT NULL CHECK (subtotal >= 0),
    frete           numeric(10,2) NOT NULL CHECK (frete >= 0),
    total           numeric(10,2) NOT NULL CHECK (total >= 0),
    status_pedido_id bigint NOT NULL REFERENCES status_pedido (id)
);

CREATE TABLE item_pedido (
    id              bigserial PRIMARY KEY,
    pedido_id       bigint NOT NULL REFERENCES pedido (id) ON DELETE CASCADE,
    disco_id        bigint NOT NULL REFERENCES disco (id),
    preco_unitario  numeric(10,2) NOT NULL CHECK (preco_unitario >= 0),
    quantidade      integer NOT NULL CHECK (quantidade > 0)
);

CREATE TABLE validacao_pagamento (
    id              bigserial PRIMARY KEY,
    pedido_id       bigint NOT NULL UNIQUE REFERENCES pedido (id) ON DELETE CASCADE,
    aprovado        boolean NOT NULL,
    data            timestamp NOT NULL DEFAULT now()
);

CREATE TABLE troca (
    id                  bigserial PRIMARY KEY,
    pedido_id           bigint NOT NULL UNIQUE REFERENCES pedido (id),
    motivo              text NOT NULL,
    dt_solicitacao      date NOT NULL DEFAULT CURRENT_DATE,
    dt_retorno          date
);

CREATE TABLE cupom (
    id              bigserial PRIMARY KEY,
    cliente_id      bigint NOT NULL REFERENCES cliente (id),
    tipo_cupom_id   bigint NOT NULL REFERENCES tipo_cupom (id),
    codigo          varchar(20) NOT NULL UNIQUE,
    valor           numeric(10,2) NOT NULL CHECK (valor > 0),
    is_utilizado    boolean NOT NULL DEFAULT false
);

CREATE TABLE pedido_cupom (
    pedido_id       bigint NOT NULL REFERENCES pedido (id) ON DELETE CASCADE,
    cupom_id        bigint NOT NULL REFERENCES cupom (id),
    PRIMARY KEY (pedido_id, cupom_id)
);

-- ---------------------------------------------------------------------
-- Administrador da curadoria
-- ---------------------------------------------------------------------
-- Tabela própria, sem relação com cliente: o administrador não tem CPF,
-- endereço nem cartão. O login único (POST /api/sessoes) procura o e-mail
-- aqui antes de procurar em cliente.
CREATE TABLE administrador (
    id            bigserial PRIMARY KEY,
    codigo        varchar(20)  NOT NULL UNIQUE,
    nome          varchar(120) NOT NULL,
    email         varchar(120) NOT NULL UNIQUE,
    -- RNF0033: hash BCrypt, nunca a senha em texto
    senha         varchar(72)  NOT NULL,
    is_ativo      boolean      NOT NULL DEFAULT true,
    data_cadastro timestamp    NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Log de transações (RNF0012)
-- ---------------------------------------------------------------------
CREATE TABLE log (
    id              bigserial PRIMARY KEY,
    operacao_log_id bigint NOT NULL REFERENCES operacao_log (id),
    entidade        varchar(60) NOT NULL,
    entidade_id     bigint NOT NULL,
    usuario         varchar(80) NOT NULL,
    data_hora       timestamp NOT NULL DEFAULT now(),
    dados_alterados jsonb NOT NULL
);

-- ---------------------------------------------------------------------
-- Índices de apoio
-- ---------------------------------------------------------------------
CREATE INDEX idx_cliente_nome          ON cliente (nome);
CREATE INDEX idx_pedido_cliente        ON pedido (cliente_id);
CREATE INDEX idx_pedido_data_status    ON pedido (data, status_pedido_id);
CREATE INDEX idx_item_pedido_disco     ON item_pedido (disco_id);
CREATE INDEX idx_entrada_disco         ON entrada_estoque (disco_id);
CREATE INDEX idx_disco_titulo          ON disco (titulo);
CREATE INDEX idx_disco_artista         ON disco (artista_id);
CREATE INDEX idx_log_entidade          ON log (entidade, entidade_id);
CREATE INDEX idx_log_data              ON log (data_hora);

-- índice vetorial para a busca semântica
CREATE INDEX idx_disco_embedding       ON disco USING hnsw (embedding vector_cosine_ops);