-- =====================================================================
-- 33rpm — população inicial de clientes (demonstração)
--
-- Roda depois de schema.sql e seed.sql, na primeira subida do volume.
-- Doze cadastros completos, com telefone, endereço e cartão, para a loja
-- abrir com conteúdo sem depender de POST /api/dev/reset — que continua
-- existindo e reduz a base aos três clientes usados pelos testes.
--
-- Todos usam a senha 'Senha@123'. O valor abaixo é o hash BCrypt gerado
-- pelo BCryptPasswordEncoder da aplicação (RNF0033).
-- =====================================================================

-- cidades referenciadas pelos endereços; o estado já veio de seed.sql
INSERT INTO cidade (desc_cidade, estado_id)
SELECT v.cidade, e.id
FROM (VALUES
    ('São Paulo',      'SP'),
    ('Rio de Janeiro', 'RJ'),
    ('Belo Horizonte', 'MG'),
    ('Curitiba',       'PR'),
    ('Porto Alegre',   'RS'),
    ('Salvador',       'BA'),
    ('Recife',         'PE'),
    ('Brasília',       'DF'),
    ('Florianópolis',  'SC'),
    ('Manaus',         'AM'),
    ('Fortaleza',      'CE'),
    ('Goiânia',        'GO')
) AS v (cidade, uf)
JOIN estado e ON e.desc_estado = v.uf;

INSERT INTO cliente (codigo, nome, email, cpf, data_nascimento, senha, ranking, is_ativo, genero_id)
SELECT v.codigo, v.nome, v.email, v.cpf, v.nascimento::date,
       '$2a$10$B25D14KPD6uMMxX2TrRspOsLF1MmPywKffulpHevhS4Q3rNT8Z78W',
       v.ranking, v.ativo, g.id
FROM (VALUES
    ('CLI-000001', 'Ana Paula Ribeiro', 'ana.ribeiro@email.com',      '12345678901', '1991-03-14', 5, true,  'Feminino'),
    ('CLI-000002', 'Bruno Tavares',     'bruno.tavares@email.com',    '98765432100', '1985-07-02', 3, true,  'Masculino'),
    ('CLI-000003', 'Carla Nogueira',    'carla.nogueira@email.com',   '45678912300', '1998-11-30', 1, false, 'Feminino'),
    ('CLI-000004', 'Diego Ferraz',      'diego.ferraz@email.com',     '74185296300', '1979-09-08', 4, true,  'Masculino'),
    ('CLI-000005', 'Eduarda Lins',      'eduarda.lins@email.com',     '15975385200', '2000-01-22', 2, true,  'Prefiro não informar'),
    ('CLI-000006', 'Felipe Andrade',    'felipe.andrade@email.com',   '36925814700', '1993-05-17', 3, true,  'Masculino'),
    ('CLI-000007', 'Gabriela Moura',    'gabriela.moura@email.com',   '25836914700', '1988-12-03', 4, true,  'Feminino'),
    ('CLI-000008', 'Henrique Saraiva',  'henrique.saraiva@email.com', '14725836900', '1975-02-26', 2, true,  'Masculino'),
    ('CLI-000009', 'Isabela Torres',    'isabela.torres@email.com',   '96385274100', '2001-08-09', 5, true,  'Feminino'),
    ('CLI-000010', 'João Pedro Martins', 'joao.martins@email.com',    '85274196300', '1996-04-21', 1, true,  'Masculino'),
    ('CLI-000011', 'Larissa Campos',    'larissa.campos@email.com',   '74196385200', '1984-10-11', 3, true,  'Feminino'),
    ('CLI-000012', 'Marcelo Vieira',    'marcelo.vieira@email.com',   '63852741900', '1990-06-30', 4, true,  'Prefiro não informar')
) AS v (codigo, nome, email, cpf, nascimento, ranking, ativo, genero)
JOIN genero g ON g.desc_genero = v.genero
-- mantém o id em sintonia com o código: CLI-000001 é o cliente 1
ORDER BY v.codigo;

-- RN0026: um telefone por cliente, composto por tipo, DDD e número
INSERT INTO telefone (cliente_id, tipo_telefone_id, ddd, numero)
SELECT c.id, t.id, v.ddd, v.numero
FROM (VALUES
    ('ana.ribeiro@email.com',    'Celular',     '11', '987654321'),
    ('bruno.tavares@email.com',  'Residencial', '21', '32567890'),
    ('carla.nogueira@email.com', 'Celular',     '31', '991234567'),
    ('diego.ferraz@email.com',   'Comercial',   '41', '33445566'),
    ('eduarda.lins@email.com',   'Celular',     '51', '988112233'),
    ('felipe.andrade@email.com',   'Celular',     '71', '991827364'),
    ('gabriela.moura@email.com',   'Celular',     '81', '998273645'),
    ('henrique.saraiva@email.com', 'Comercial',   '61', '33224455'),
    ('isabela.torres@email.com',   'Celular',     '48', '996655443'),
    ('joao.martins@email.com',     'Celular',     '92', '993344556'),
    ('larissa.campos@email.com',   'Residencial', '85', '32445566'),
    ('marcelo.vieira@email.com',   'Celular',     '62', '994433221')
) AS v (email, tipo, ddd, numero)
JOIN cliente c ON c.email = v.email
JOIN tipo_telefone t ON t.desc_tipo = v.tipo;

-- RN0021 e RN0022: todo cliente tem cobrança e entrega cobertas
INSERT INTO endereco (cliente_id, cidade_id, nome, tipo, tipo_residencia, tipo_logradouro,
                      logradouro, numero, bairro, cep, pais, observacoes)
SELECT c.id, cid.id, v.nome, v.tipo, v.tipo_residencia, v.tipo_logradouro,
       v.logradouro, v.numero, v.bairro, v.cep, 'Brasil', v.observacoes
FROM (VALUES
    ('ana.ribeiro@email.com',    'Casa',          'ambos',    'Casa',        'Rua',     'das Palmeiras',    '120',  'Pinheiros',        '05422030', 'São Paulo',      'SP', NULL),
    ('bruno.tavares@email.com',  'Apartamento',   'ambos',    'Apartamento', 'Avenida', 'Atlântica',        '2000', 'Copacabana',       '22071900', 'Rio de Janeiro', 'RJ', 'Portaria 24h'),
    ('carla.nogueira@email.com', 'Casa da praia', 'ambos',    'Casa',        'Rua',     'dos Ipês',         '45',   'Savassi',          '30130010', 'Belo Horizonte', 'MG', NULL),
    ('diego.ferraz@email.com',   'Casa',          'cobranca', 'Condomínio',  'Rua',     'das Araucárias',   '300',  'Batel',            '80420090', 'Curitiba',       'PR', NULL),
    ('diego.ferraz@email.com',   'Escritório',    'entrega',  'Comercial',   'Avenida', 'Sete de Setembro', '1500', 'Centro',           '80060070', 'Curitiba',       'PR', 'Recebe em horário comercial'),
    ('eduarda.lins@email.com',   'Apartamento',   'ambos',    'Apartamento', 'Rua',     'Padre Chagas',     '88',   'Moinhos de Vento', '90570080', 'Porto Alegre',   'RS', NULL),
    ('felipe.andrade@email.com',   'Apartamento', 'ambos',    'Apartamento', 'Avenida', 'Oceânica',         '880',  'Ondina',           '40170010', 'Salvador',       'BA', NULL),
    ('gabriela.moura@email.com',   'Apartamento', 'ambos',    'Apartamento', 'Avenida', 'Boa Viagem',       '3200', 'Boa Viagem',       '51021000', 'Recife',         'PE', 'Deixar na portaria'),
    ('henrique.saraiva@email.com', 'Casa',        'cobranca', 'Casa',        'Quadra',  'SHIN QI 5 Conjunto 8', '12', 'Lago Norte',     '71505080', 'Brasília',       'DF', NULL),
    ('henrique.saraiva@email.com', 'Escritório',  'entrega',  'Comercial',   'Avenida', 'W3 Sul',           '510',  'Asa Sul',          '70365900', 'Brasília',       'DF', 'Recebe em horário comercial'),
    ('isabela.torres@email.com',   'Casa',        'ambos',    'Casa',        'Rua',     'Lauro Linhares',   '1010', 'Trindade',         '88036002', 'Florianópolis',  'SC', NULL),
    ('joao.martins@email.com',     'Casa',        'ambos',    'Casa',        'Avenida', 'Djalma Batista',   '1661', 'Chapada',          '69050010', 'Manaus',         'AM', NULL),
    ('larissa.campos@email.com',   'Apartamento', 'ambos',    'Apartamento', 'Avenida', 'Beira Mar',        '2500', 'Meireles',         '60165121', 'Fortaleza',      'CE', 'Bloco B'),
    ('marcelo.vieira@email.com',   'Casa',        'ambos',    'Condomínio',  'Rua',     'T-55',             '230',  'Setor Bueno',      '74215170', 'Goiânia',        'GO', NULL)
) AS v (email, nome, tipo, tipo_residencia, tipo_logradouro, logradouro, numero, bairro, cep, cidade, uf, observacoes)
JOIN cliente c ON c.email = v.email
JOIN estado e ON e.desc_estado = v.uf
JOIN cidade cid ON cid.desc_cidade = v.cidade AND cid.estado_id = e.id;

-- RN0024 e RF0027: cartão completo, com um único preferencial por cliente
INSERT INTO cartao (cliente_id, bandeira_cartao_id, numero, nome_impresso, codigo_seguranca, is_preferencial)
SELECT c.id, b.id, v.numero, v.nome_impresso, v.cvv, v.preferencial
FROM (VALUES
    ('ana.ribeiro@email.com',  'Visa',       '4539781234561002', 'ANA P RIBEIRO', '123', true),
    ('diego.ferraz@email.com', 'Mastercard', '5555444433332222', 'DIEGO FERRAZ',  '456', true),
    ('diego.ferraz@email.com', 'Elo',        '6362970000457013', 'D FERRAZ',      '789', false),
    ('eduarda.lins@email.com', 'Hipercard',  '6062825624233788', 'EDUARDA LINS',  '321', true),
    ('felipe.andrade@email.com', 'Visa',             '4024007156782391', 'FELIPE ANDRADE',   '412',  true),
    ('gabriela.moura@email.com', 'Mastercard',       '5274576394259961', 'GABRIELA MOURA',   '538',  true),
    ('isabela.torres@email.com', 'Elo',              '6363680000457021', 'ISABELA TORRES',   '274',  true),
    ('isabela.torres@email.com', 'Visa',             '4916338506082832', 'ISABELA S TORRES', '903',  false),
    ('joao.martins@email.com',   'American Express', '371449635398431',  'JOAO P MARTINS',   '7392', true),
    ('marcelo.vieira@email.com', 'Hipercard',        '6062826786276634', 'MARCELO VIEIRA',   '615',  true)
) AS v (email, bandeira, numero, nome_impresso, cvv, preferencial)
JOIN cliente c ON c.email = v.email
JOIN bandeira_cartao b ON b.desc_bandeira = v.bandeira;

-- RNF0035: o próximo cadastro continua a numeração em CLI-000013
SELECT setval('seq_codigo_cliente', 12);
