-- ============================================
-- LIMPAR USUÁRIOS ANTIGOS (com hash incompatível)
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Deletar todos os usuários existentes
DELETE FROM movimentacoes;
DELETE FROM planejamento_orcamentario;
DELETE FROM contas_bancarias;
DELETE FROM plano_contas;
DELETE FROM users;

-- Verificar se foi limpo
SELECT COUNT(*) as total_usuarios FROM users;
-- Deve retornar 0

-- ============================================
-- Agora você pode criar novo usuário no site!
-- ============================================
