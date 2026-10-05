-- =====================================================================
-- 33rpm — carga das tabelas de domínio (RNF0013)
-- Cobre o que os cadastros de cliente e de disco, a entrada em estoque e o
-- pedido consomem. Os discos em si entram pela aplicação (CargaAcervo),
-- passando pelas regras do cadastro.
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

-- RN0033 a RN0036: tipos de cupom aceitos no pagamento
INSERT INTO tipo_cupom (desc_tipo) VALUES
    ('TROCA'),
    ('PROMOCIONAL');

-- RF0038 e os status seguintes, com os nomes do DRS
INSERT INTO status_pedido (descricao) VALUES
    ('EM PROCESSAMENTO'),
    ('APROVADA'),
    ('REPROVADA'),
    ('EM TRANSPORTE'),
    ('ENTREGUE'),
    ('EM TROCA'),
    ('TROCA AUTORIZADA'),
    ('TROCADO');

-- RN0013 e RF0052: margem somada ao custo
INSERT INTO grupo_precificacao (nome, margem_lucro) VALUES
    ('Lançamento', 85),
    ('Catálogo', 60),
    ('Importado', 110),
    ('Clássico', 70),
    ('Promocional', 35);

-- RN0050: todo item de estoque vem de um fornecedor registrado
INSERT INTO fornecedor (nome) VALUES
    ('Universal Music Brasil'),
    ('Sony Music Entertainment'),
    ('Warner Music Brasil'),
    ('Polysom Indústria Fonográfica'),
    ('Tratore Distribuidora'),
    ('Import LP Distribuidora');

-- RN0011: dimensões-padrão de cada prensagem, sugeridas no cadastro
INSERT INTO formato (nome, descricao, altura, largura, profundidade, peso) VALUES
    ('LP',     '12", 33⅓ RPM',        31.5, 31.5, 0.5, 250),
    ('2xLP',   'Duplo 12", 33⅓ RPM',  31.5, 31.5, 1.0, 480),
    ('3xLP',   'Triplo 12", 33⅓ RPM', 31.5, 31.5, 1.5, 700),
    ('EP',     '12", 45 RPM',         31.5, 31.5, 0.4, 230),
    ('Single', '7", 45 RPM',          17.8, 17.8, 0.3, 110);

-- RN0011: edição da prensagem
INSERT INTO edicao (nome, descricao) VALUES
    ('Primeira Prensagem', 'Lote original, prensado no ano em que o álbum saiu. É o que colecionador caça, e o que custa caro.'),
    ('Reprensagem',        'Fabricado anos depois do lançamento original. Vem lacrado e custa bem menos — é o que mais sai em loja.'),
    ('Remasterizado',      'A gravação original passou por retoque de áudio em estúdio, com tecnologia atual, antes de ir para o disco.'),
    ('Splatter',           'Disco tingido em vez do preto clássico. No splatter o efeito imita tinta espirrada sobre o vinil.'),
    ('Picture Disc',       'Imagem impressa direto na superfície tocável. Costuma soar um pouco pior que o vinil preto comum.');

-- RN0015, RN0016 e RN0017: categorias de inativação e de ativação
INSERT INTO categoria_status (desc_categoria, tipo) VALUES
    ('FORA DE MERCADO',          'inativacao'),
    ('FORA DE LINHA',            'inativacao'),
    ('BAIXA DEMANDA',            'inativacao'),
    ('AVARIA / QUALIDADE',       'inativacao'),
    ('PENDÊNCIA COM FORNECEDOR', 'inativacao'),
    ('OUTRO',                    'inativacao'),
    ('REPOSIÇÃO DE ESTOQUE',     'ativacao'),
    ('NOVA PRENSAGEM',           'ativacao'),
    ('DEMANDA DE CLIENTES',      'ativacao'),
    ('REVISÃO DE CATÁLOGO',      'ativacao'),
    ('OUTRO',                    'ativacao');

-- RNF0013: autores (artistas), editoras (gravadoras) e categorias do acervo
-- (bloco gerado por frontend/scripts/gerar-acervo.mjs)
INSERT INTO artista (nome) VALUES
    ('Amy Winehouse'),
    ('Arctic Monkeys'),
    ('ASAP Rocky'),
    ('Baby Keem'),
    ('Bad Bunny'),
    ('Childish Gambino'),
    ('Clipse'),
    ('Daft Punk'),
    ('Don Toliver'),
    ('Drake'),
    ('Elvis Presley'),
    ('Frank Ocean'),
    ('Fugees'),
    ('Funkadelic'),
    ('Huncho Jack'),
    ('J. Cole'),
    ('J.I.D'),
    ('Jorge Ben'),
    ('Kanye West'),
    ('Kendrick Lamar'),
    ('Kid Cudi'),
    ('Killer Mike'),
    ('Lauryn Hill'),
    ('Massive Attack'),
    ('Metallica'),
    ('Metro Boomin'),
    ('Michael Jackson'),
    ('Migos'),
    ('Nas'),
    ('Nirvana'),
    ('OutKast'),
    ('Pink Floyd'),
    ('Playboi Carti'),
    ('Prince And The Revolution'),
    ('Public Enemy'),
    ('Racionais MC''s'),
    ('Radiohead'),
    ('Rihanna'),
    ('Rita Lee'),
    ('Sade'),
    ('Stevie Wonder'),
    ('System Of A Down'),
    ('SZA'),
    ('Tame Impala'),
    ('The Beach Boys'),
    ('The Jimi Hendrix Experience'),
    ('The Strokes'),
    ('Travis Scott'),
    ('Tyler, The Creator'),
    ('Young Thug');

INSERT INTO gravadora (nome) VALUES
    ('300 Entertainment / YSL'),
    ('American Recordings'),
    ('AWGE / Interscope'),
    ('Boominati Worldwide'),
    ('Boominati Worldwide / Republic'),
    ('Boys Don''t Cry'),
    ('Cactus Jack / Atlantic'),
    ('Cactus Jack / Epic'),
    ('Cactus Jack / Quality Control'),
    ('Capitol'),
    ('Cash Money / Epic'),
    ('Circa / Virgin'),
    ('Columbia'),
    ('Cosa Nostra'),
    ('Def Jam'),
    ('Def Jam Recordings'),
    ('DGC / Sub Pop'),
    ('Domino'),
    ('Domino Recording Co.'),
    ('Dream On / G.O.O.D. Music'),
    ('Dreamville / Interscope'),
    ('Dreamville / Roc Nation'),
    ('Elektra'),
    ('Epic'),
    ('Fiction / Island'),
    ('Glassnote'),
    ('Glassnote Records'),
    ('GOOD Music / Def Jam'),
    ('Grand Hustle / Epic'),
    ('Harvest / EMI'),
    ('Island'),
    ('LaFace / Arista'),
    ('Loma Vista Recordings'),
    ('Modular Recordings'),
    ('Parlophone'),
    ('pgLang / Columbia'),
    ('Philips'),
    ('Quality Control / Motown'),
    ('RCA'),
    ('RCA / Polo Grounds'),
    ('RCA Victor'),
    ('Rimas Entertainment'),
    ('Roc Nation'),
    ('Roc-A-Fella'),
    ('Roc-A-Fella / Def Jam'),
    ('Ruffhouse / Columbia'),
    ('Som Livre'),
    ('Tamla'),
    ('Top Dawg / RCA'),
    ('Top Dawg Entertainment / Interscope'),
    ('Track Record'),
    ('Virgin'),
    ('Warner Bros.'),
    ('Westbound'),
    ('Westbury Road Entertainment');

INSERT INTO categoria (desc_categoria, tipo) VALUES
    ('Blues', 'genero'),
    ('Classical', 'genero'),
    ('Electronic', 'genero'),
    ('Folk, World, & Country', 'genero'),
    ('Funk / Soul', 'genero'),
    ('Hip Hop', 'genero'),
    ('Jazz', 'genero'),
    ('Latin', 'genero'),
    ('Pop', 'genero'),
    ('Reggae', 'genero'),
    ('Rock', 'genero'),
    ('Stage & Screen', 'genero'),
    ('Acid Rock', 'estilo'),
    ('Aguinaldo', 'estilo'),
    ('Alternative Metal', 'estilo'),
    ('Alternative Rock', 'estilo'),
    ('Art Rock', 'estilo'),
    ('Avantgarde', 'estilo'),
    ('Blues Rock', 'estilo'),
    ('Bomba', 'estilo'),
    ('Boom Bap', 'estilo'),
    ('Cloud Rap', 'estilo'),
    ('Conscious', 'estilo'),
    ('Contemporary R&B', 'estilo'),
    ('Crunk', 'estilo'),
    ('Dance-pop', 'estilo'),
    ('Disco', 'estilo'),
    ('Downtempo', 'estilo'),
    ('Electro', 'estilo'),
    ('Experimental', 'estilo'),
    ('Funk', 'estilo'),
    ('G-Funk', 'estilo'),
    ('Gangsta', 'estilo'),
    ('Groove Metal', 'estilo'),
    ('Grunge', 'estilo'),
    ('Hard Rock', 'estilo'),
    ('Heavy Metal', 'estilo'),
    ('Hip Hop', 'estilo'),
    ('Hip-House', 'estilo'),
    ('House', 'estilo'),
    ('Indie Rock', 'estilo'),
    ('Jazzy Hip-Hop', 'estilo'),
    ('Latin Pop', 'estilo'),
    ('Leftfield', 'estilo'),
    ('Mambo', 'estilo'),
    ('Minneapolis Sound', 'estilo'),
    ('MPB', 'estilo'),
    ('Neo Soul', 'estilo'),
    ('P.Funk', 'estilo'),
    ('Plena', 'estilo'),
    ('Pop Rap', 'estilo'),
    ('Pop Rock', 'estilo'),
    ('Post-Punk', 'estilo'),
    ('Prog Rock', 'estilo'),
    ('Psychedelic', 'estilo'),
    ('Psychedelic Rock', 'estilo'),
    ('Reggae', 'estilo'),
    ('Reggaeton', 'estilo'),
    ('Rhythm & Blues', 'estilo'),
    ('Rock & Roll', 'estilo'),
    ('Salsa', 'estilo'),
    ('Samba', 'estilo'),
    ('Soul', 'estilo'),
    ('Soundtrack', 'estilo'),
    ('Speed Metal', 'estilo'),
    ('Synth-pop', 'estilo'),
    ('Thrash', 'estilo'),
    ('Trap', 'estilo'),
    ('Trip Hop', 'estilo'),
    ('Vocal', 'estilo');
