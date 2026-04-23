-- ============================================
-- MIGRAÇÃO: Adicionar coluna "ordem" em movimentacoes
-- para permitir reordenação manual (drag & drop)
-- ============================================
--
-- Execute este script no SQL Editor do Supabase.
-- É seguro rodar mais de uma vez (idempotente).
-- ============================================

-- 1) Adicionar coluna "ordem" (BIGINT, nullable)
ALTER TABLE movimentacoes
    ADD COLUMN IF NOT EXISTS ordem BIGINT;

-- 2) Preencher ordem para linhas existentes com base em created_at
--    (em microssegundos para dar espaçamento amplo entre registros)
UPDATE movimentacoes
SET ordem = (EXTRACT(EPOCH FROM created_at) * 1000000)::BIGINT
WHERE ordem IS NULL;

-- 3) Índice para ordenar rapidamente por usuário + ordem
CREATE INDEX IF NOT EXISTS idx_movimentacoes_user_ordem
    ON movimentacoes (user_id, ordem DESC);

-- 4) Verificação: deve retornar todas as linhas com ordem preenchida
-- SELECT COUNT(*) AS total, COUNT(ordem) AS com_ordem FROM movimentacoes;
