-- =====================================================================
-- 33rpm — cupons de demonstração
--
-- Roda depois de clientes.sql, na primeira subida do volume. É a única carga
-- direta de dado de negócio, liberada pelo professor: os cupons com que a
-- demonstração começa. Os de troca gerados pela devolução (RF0045) e pela sobra
-- dos cupons (RN0036) nascem das próprias operações.
-- O POST /api/dev/reset recria os da Ana e do Bruno com os mesmos códigos.
--
-- O cupom pertence a um cliente (cupom.cliente_id é obrigatório), inclusive o
-- promocional. Os valores da Ana fecham os cenários do roteiro com um disco
-- entregue em São Paulo, onde o frete fica em R$ 28,00:
--   TROCA-AP-300 deixa R$ 7,00 para um cartão num total de R$ 307,00 (RN0035);
--   TROCA-AP-300 + PROMO-AP-50 passam de R$ 327,00 e geram R$ 23,00 de troca (RN0036);
--   com TROCA-AP-300 + TROCA-AP-045, PROMO-AP-20 fica dispensável em R$ 327,00 (RN0036);
--   PROMO-AP-20 + PROMO-AP-50 são dois promocionais (RN0033).
-- O PROMO-BT-280 do Bruno, sozinho, deixa R$ 7,00 para um cartão num total de
-- R$ 287,00 no Rio de Janeiro: cupom promocional e cartão abaixo de R$ 10,00 (RN0035).
-- =====================================================================

INSERT INTO cupom (cliente_id, tipo_cupom_id, codigo, valor)
SELECT c.id, t.id, v.codigo, v.valor
FROM (VALUES
    ('ana.ribeiro@email.com',   'TROCA',       'TROCA-AP-300', 300.00),
    ('ana.ribeiro@email.com',   'TROCA',       'TROCA-AP-045',  45.00),
    ('ana.ribeiro@email.com',   'PROMOCIONAL', 'PROMO-AP-20',   20.00),
    ('ana.ribeiro@email.com',   'PROMOCIONAL', 'PROMO-AP-50',   50.00),
    ('bruno.tavares@email.com', 'TROCA',       'TROCA-BT-120', 120.00),
    ('bruno.tavares@email.com', 'PROMOCIONAL', 'PROMO-BT-30',   30.00),
    ('bruno.tavares@email.com', 'PROMOCIONAL', 'PROMO-BT-280', 280.00),
    ('diego.ferraz@email.com',  'TROCA',       'TROCA-DF-080',  80.00),
    ('diego.ferraz@email.com',  'PROMOCIONAL', 'PROMO-DF-25',   25.00),
    ('eduarda.lins@email.com',  'PROMOCIONAL', 'PROMO-EL-20',   20.00)
) AS v (email, tipo, codigo, valor)
JOIN cliente c ON c.email = v.email
JOIN tipo_cupom t ON t.desc_tipo = v.tipo;
