-- ============================================================
-- Recalcular saldo das contas bancárias
-- saldo_atual = saldo_inicial + entradas - saídas
-- ============================================================

-- 1) DIAGNÓSTICO: comparar saldo gravado x saldo correto
SELECT
  c.id,
  c.nome,
  c.saldo_inicial,
  c.saldo_atual AS saldo_gravado,
  c.saldo_inicial + COALESCE((
    SELECT SUM(CASE WHEN m.tipo = 'entrada' THEN m.valor ELSE -m.valor END)
    FROM movimentacoes m
    WHERE m.conta_bancaria_id = c.id
  ), 0) AS saldo_correto,
  c.saldo_atual - (c.saldo_inicial + COALESCE((
    SELECT SUM(CASE WHEN m.tipo = 'entrada' THEN m.valor ELSE -m.valor END)
    FROM movimentacoes m
    WHERE m.conta_bancaria_id = c.id
  ), 0)) AS diferenca
FROM contas_bancarias c
ORDER BY c.nome;

-- 2) CORRIGIR APENAS A CONTA "Débito Automático"
--    (ajuste o nome/filtro conforme necessário)
UPDATE contas_bancarias c
SET saldo_atual = c.saldo_inicial + COALESCE((
  SELECT SUM(CASE WHEN m.tipo = 'entrada' THEN m.valor ELSE -m.valor END)
  FROM movimentacoes m
  WHERE m.conta_bancaria_id = c.id
), 0)
WHERE c.nome ILIKE '%debito automatico%';

-- 3) (OPCIONAL) CORRIGIR TODAS AS CONTAS DE UM USUÁRIO
--    Substitua 'SEU_USER_ID' pelo id do usuário.
-- UPDATE contas_bancarias c
-- SET saldo_atual = c.saldo_inicial + COALESCE((
--   SELECT SUM(CASE WHEN m.tipo = 'entrada' THEN m.valor ELSE -m.valor END)
--   FROM movimentacoes m
--   WHERE m.conta_bancaria_id = c.id
-- ), 0)
-- WHERE c.user_id = 'SEU_USER_ID';
