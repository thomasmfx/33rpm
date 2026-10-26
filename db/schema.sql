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

-- RN0012: gênero e estilo são categorias do disco; "Hip Hop" existe nos dois
CREATE TABLE categoria (
    id              bigserial PRIMARY KEY,
    desc_categoria  varchar(60) NOT NULL,
    tipo            varchar(10) NOT NULL CHECK (tipo IN ('genero', 'estilo')),
    CONSTRAINT uq_categoria_tipo UNIQUE (desc_categoria, tipo)
);

CREATE TABLE grupo_precificacao (
    id              bigserial PRIMARY KEY,
    nome            varchar(60) NOT NULL UNIQUE,
    margem_lucro    numeric(5,2) NOT NULL CHECK (margem_lucro >= 0)
);

-- RN0015 e RN0017: categorias de inativação e de ativação; "OUTRO" existe nas duas
CREATE TABLE categoria_status (
    id              bigserial PRIMARY KEY,
    desc_categoria  varchar(60) NOT NULL,
    tipo            varchar(12) NOT NULL CHECK (tipo IN ('inativacao', 'ativacao')),
    CONSTRAINT uq_categoria_status_tipo UNIQUE (desc_categoria, tipo)
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

-- prensagem do disco, com as dimensões-padrão que o cadastro sugere (RN0011)
CREATE TABLE formato (
    id              bigserial PRIMARY KEY,
    nome            varchar(20) NOT NULL UNIQUE,
    descricao       varchar(60) NOT NULL,
    altura          numeric(5,2) NOT NULL,
    largura         numeric(5,2) NOT NULL,
    profundidade    numeric(5,2) NOT NULL,
    peso            integer NOT NULL
);

-- RN0011: edição do disco; uma prensagem pode combinar mais de uma
CREATE TABLE edicao (
    id              bigserial PRIMARY KEY,
    nome            varchar(40) NOT NULL UNIQUE,
    descricao       text NOT NULL
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
-- RNF0021: numera o código do disco sem depender da chave técnica
CREATE SEQUENCE seq_codigo_disco;

-- RN0011: autor, categoria, ano, título, editora, edição, ISBN, páginas, sinopse,
-- dimensões, grupo de precificação e código de barras, lidos como disco
CREATE TABLE disco (
    id                      bigserial PRIMARY KEY,
    codigo                  varchar(20) NOT NULL UNIQUE,
    artista_id              bigint NOT NULL REFERENCES artista (id),
    gravadora_id            bigint NOT NULL REFERENCES gravadora (id),
    grupo_precificacao_id   bigint NOT NULL REFERENCES grupo_precificacao (id),
    formato_id              bigint NOT NULL REFERENCES formato (id),
    titulo                  varchar(160) NOT NULL,
    ano_lancamento          date NOT NULL,
    codigo_catalogo         varchar(40) NOT NULL,
    codigo_barras           varchar(20) NOT NULL,
    numero_faixas           integer NOT NULL CHECK (numero_faixas > 0),
    duracao                 varchar(8),
    descricao               text NOT NULL,
    altura                  numeric(5,2) NOT NULL CHECK (altura > 0),
    largura                 numeric(5,2) NOT NULL CHECK (largura > 0),
    profundidade            numeric(5,2) NOT NULL CHECK (profundidade > 0),
    -- gramas; é o peso que entra no frete (RF0034)
    peso                    integer NOT NULL CHECK (peso > 0),
    capa_url                varchar(500) NOT NULL,
    capa_miniatura_url      varchar(500),
    preco_venda             numeric(10,2) NOT NULL CHECK (preco_venda >= 0),
    -- RN0014: quem autorizou o preço abaixo da margem do grupo
    autorizacao_gerente     varchar(120),
    estoque                 integer NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    is_ativo                boolean NOT NULL DEFAULT true,
    embedding               vector(768),
    data_cadastro           timestamp NOT NULL DEFAULT now()
);

CREATE TABLE disco_categoria (
    disco_id        bigint NOT NULL REFERENCES disco (id) ON DELETE CASCADE,
    categoria_id    bigint NOT NULL REFERENCES categoria (id),
    PRIMARY KEY (disco_id, categoria_id)
);

CREATE TABLE disco_edicao (
    disco_id        bigint NOT NULL REFERENCES disco (id) ON DELETE CASCADE,
    edicao_id       bigint NOT NULL REFERENCES edicao (id),
    PRIMARY KEY (disco_id, edicao_id)
);

-- RN0015, RN0016 e RN0017: histórico de inativações e ativações
CREATE TABLE motivo_status (
    id                      bigserial PRIMARY KEY,
    disco_id                bigint NOT NULL REFERENCES disco (id) ON DELETE CASCADE,
    categoria_status_id     bigint NOT NULL REFERENCES categoria_status (id),
    justificativa           text NOT NULL,
    automatico              boolean NOT NULL DEFAULT false,
    data                    timestamp NOT NULL DEFAULT now()
);

CREATE TABLE entrada_estoque (
    id              bigserial PRIMARY KEY,
    disco_id        bigint NOT NULL REFERENCES disco (id),
    fornecedor_id   bigint NOT NULL REFERENCES fornecedor (id),
    quantidade      integer NOT NULL CHECK (quantidade > 0),
    valor_custo     numeric(10,2) NOT NULL CHECK (valor_custo > 0),
    data_entrada    date NOT NULL DEFAULT CURRENT_DATE,
    data_cadastro   timestamp NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Pedido e agregados
-- ---------------------------------------------------------------------
CREATE TABLE pedido (
    id              bigserial PRIMARY KEY,
    cliente_id      bigint NOT NULL REFERENCES cliente (id),
    -- endereço do perfil usado na compra, quando houver. O pedido guarda a própria
    -- cópia abaixo, então editar ou remover o endereço do perfil não o altera
    endereco_id     bigint REFERENCES endereco (id) ON DELETE SET NULL,
    data            timestamp NOT NULL DEFAULT now(),
    subtotal        numeric(10,2) NOT NULL CHECK (subtotal >= 0),
    frete           numeric(10,2) NOT NULL CHECK (frete >= 0),
    total           numeric(10,2) NOT NULL CHECK (total >= 0),
    -- RN0036: o que os cupons passaram do total; vira cupom de troca só na aprovação
    -- (CDU03 P8.2 e O13), então a compra reprovada não deixa crédito
    troco           numeric(10,2) NOT NULL DEFAULT 0 CHECK (troco >= 0),
    status_pedido_id bigint NOT NULL REFERENCES status_pedido (id),
    -- RF0035 e RN0023: endereço de entrega como estava no momento da compra
    entrega_nome            varchar(60) NOT NULL,
    entrega_tipo_residencia varchar(30) NOT NULL,
    entrega_tipo_logradouro varchar(30) NOT NULL,
    entrega_logradouro      varchar(120) NOT NULL,
    entrega_numero          varchar(10) NOT NULL,
    entrega_bairro          varchar(60) NOT NULL,
    entrega_cep             varchar(8) NOT NULL,
    entrega_cidade          varchar(80) NOT NULL,
    entrega_uf              varchar(2) NOT NULL,
    entrega_pais            varchar(40) NOT NULL,
    entrega_observacoes     text
);

CREATE TABLE item_pedido (
    id              bigserial PRIMARY KEY,
    pedido_id       bigint NOT NULL REFERENCES pedido (id) ON DELETE CASCADE,
    disco_id        bigint NOT NULL REFERENCES disco (id),
    preco_unitario  numeric(10,2) NOT NULL CHECK (preco_unitario >= 0),
    quantidade      integer NOT NULL CHECK (quantidade > 0)
);

-- RN0034: quanto cada cartão pagou. O cartão usado só neste pedido fica só aqui;
-- o do perfil também aponta cartao_id, que some se o cartão sair do perfil
CREATE TABLE pagamento_cartao (
    id                  bigserial PRIMARY KEY,
    pedido_id           bigint NOT NULL REFERENCES pedido (id) ON DELETE CASCADE,
    cartao_id           bigint REFERENCES cartao (id) ON DELETE SET NULL,
    bandeira_cartao_id  bigint NOT NULL REFERENCES bandeira_cartao (id),
    numero              varchar(20) NOT NULL,
    nome_impresso       varchar(80) NOT NULL,
    valor               numeric(10,2) NOT NULL CHECK (valor > 0)
);

-- RN0037 e RN0038: o resultado da validação; o motivo diz o que reprovou a compra
CREATE TABLE validacao_pagamento (
    id              bigserial PRIMARY KEY,
    pedido_id       bigint NOT NULL UNIQUE REFERENCES pedido (id) ON DELETE CASCADE,
    aprovado        boolean NOT NULL,
    motivo          text,
    data            timestamp NOT NULL DEFAULT now()
);

-- RF0041 e RN0041: pedido de troca de itens de uma compra entregue, ou da compra
-- inteira. Uma compra pode ter mais de um, um item por vez
CREATE TABLE troca (
    id                  bigserial PRIMARY KEY,
    pedido_id           bigint NOT NULL REFERENCES pedido (id),
    -- EM TROCA, TROCA AUTORIZADA e TROCADO, os mesmos nomes do pedido
    status_pedido_id    bigint NOT NULL REFERENCES status_pedido (id),
    compra_inteira      boolean NOT NULL,
    motivo              text NOT NULL,
    -- RF0044: informado pelo administrador ao confirmar o recebimento
    retorno_estoque     boolean,
    data_cadastro       timestamp NOT NULL DEFAULT now(),
    data_autorizacao    timestamp,
    data_recebimento    timestamp
);

CREATE TABLE troca_item (
    id              bigserial PRIMARY KEY,
    troca_id        bigint NOT NULL REFERENCES troca (id) ON DELETE CASCADE,
    item_pedido_id  bigint NOT NULL REFERENCES item_pedido (id),
    quantidade      integer NOT NULL CHECK (quantidade > 0)
);

CREATE TABLE cupom (
    id              bigserial PRIMARY KEY,
    cliente_id      bigint NOT NULL REFERENCES cliente (id),
    tipo_cupom_id   bigint NOT NULL REFERENCES tipo_cupom (id),
    codigo          varchar(20) NOT NULL UNIQUE,
    valor           numeric(10,2) NOT NULL CHECK (valor > 0),
    is_utilizado    boolean NOT NULL DEFAULT false,
    -- RN0036: a compra cujos cupons passaram do total e geraram este cupom de troca
    pedido_origem_id bigint REFERENCES pedido (id),
    -- RF0045: a troca cujos itens chegaram e geraram este cupom
    troca_origem_id bigint REFERENCES troca (id),
    data_cadastro   timestamp NOT NULL DEFAULT now()
);

CREATE TABLE pedido_cupom (
    pedido_id       bigint NOT NULL REFERENCES pedido (id) ON DELETE CASCADE,
    cupom_id        bigint NOT NULL REFERENCES cupom (id),
    PRIMARY KEY (pedido_id, cupom_id)
);

-- RN0044: o item no carrinho bloqueia o estoque do disco até a compra ou o fim do
-- prazo, contado da última inclusão do cliente. Expirado, fica para a RNF0042 mostrar
CREATE TABLE carrinho_item (
    id              bigserial PRIMARY KEY,
    cliente_id      bigint NOT NULL REFERENCES cliente (id) ON DELETE CASCADE,
    disco_id        bigint NOT NULL REFERENCES disco (id) ON DELETE CASCADE,
    quantidade      integer NOT NULL CHECK (quantidade > 0),
    data_inclusao   timestamp NOT NULL DEFAULT now(),
    is_expirado     boolean NOT NULL DEFAULT false,
    data_cadastro   timestamp NOT NULL DEFAULT now(),
    CONSTRAINT uq_carrinho_item UNIQUE (cliente_id, disco_id)
);

-- RN0046: aviso ao cliente; hoje nasce da troca autorizada
CREATE TABLE notificacao (
    id              bigserial PRIMARY KEY,
    cliente_id      bigint NOT NULL REFERENCES cliente (id) ON DELETE CASCADE,
    pedido_id       bigint REFERENCES pedido (id),
    mensagem        text NOT NULL,
    is_lida         boolean NOT NULL DEFAULT false,
    data_cadastro   timestamp NOT NULL DEFAULT now()
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
    -- e-mail do cliente nas escritas da compra, que vai até 120 caracteres
    usuario         varchar(120) NOT NULL,
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
CREATE INDEX idx_disco_catalogo        ON disco (codigo_catalogo);
CREATE INDEX idx_disco_categoria_cat   ON disco_categoria (categoria_id);
CREATE INDEX idx_motivo_disco          ON motivo_status (disco_id);
CREATE INDEX idx_cupom_cliente         ON cupom (cliente_id);
CREATE INDEX idx_pagamento_pedido      ON pagamento_cartao (pedido_id);
CREATE INDEX idx_troca_pedido          ON troca (pedido_id);
CREATE INDEX idx_carrinho_disco        ON carrinho_item (disco_id);
CREATE INDEX idx_notificacao_cliente   ON notificacao (cliente_id);
CREATE INDEX idx_log_entidade          ON log (entidade, entidade_id);
CREATE INDEX idx_log_data              ON log (data_hora);

-- índice vetorial para a busca semântica
CREATE INDEX idx_disco_embedding       ON disco USING hnsw (embedding vector_cosine_ops);