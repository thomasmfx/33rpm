-- =====================================================================
-- 33rpm — carga das tabelas de domínio (RNF0013)
-- Cobre o que o cadastro de cliente consome. Os domínios de disco,
-- pedido e cupom entram quando esses módulos forem implementados.
-- =====================================================================

INSERT INTO genero (desc_genero) VALUES
    ('Feminino'),
    ('Masculino'),
    ('Prefiro não informar');

INSERT INTO tipo_telefone (desc_tipo) VALUES
    ('Celular'),
    ('Residencial'),
    ('Comercial');

-- RN0025: só estas bandeiras podem ser associadas a um cartão
INSERT INTO bandeira_cartao (desc_bandeira) VALUES
    ('Visa'),
    ('Mastercard'),
    ('Elo'),
    ('American Express'),
    ('Hipercard'),
    ('Diners Club');

INSERT INTO estado (desc_estado) VALUES
    ('AC'), ('AL'), ('AM'), ('AP'), ('BA'), ('CE'), ('DF'), ('ES'), ('GO'),
    ('MA'), ('MG'), ('MS'), ('MT'), ('PA'), ('PB'), ('PE'), ('PI'), ('PR'),
    ('RJ'), ('RN'), ('RO'), ('RR'), ('RS'), ('SC'), ('SE'), ('SP'), ('TO');

-- RNF0012: operações registradas na tabela log
INSERT INTO operacao_log (descricao) VALUES
    ('INSERIR'),
    ('ALTERAR'),
    ('EXCLUIR');
