-- =====================================================================
-- 33rpm — administrador de demonstração
--
-- Roda depois de schema.sql, seed.sql e clientes.sql, na primeira subida do
-- volume. Não há cadastro de administrador pela API: é este registro que abre
-- a curadoria. O POST /api/dev/reset não mexe nesta tabela.
--
-- Senha 'Admin@123'. O valor abaixo é o hash BCrypt gerado pelo
-- BCryptPasswordEncoder da aplicação (RNF0033).
-- =====================================================================

INSERT INTO administrador (codigo, nome, email, senha)
VALUES (
    'ADM-000001',
    'Thomas Moisés Fernandes',
    'admin@33rpm.com.br',
    '$2a$10$OdScpI4Lh96JNpdPpE0xduE8jv5J1EsbWY5j2plrSLB8I3Rw9wXxu'
);
