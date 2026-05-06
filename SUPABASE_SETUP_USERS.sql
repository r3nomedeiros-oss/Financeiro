-- ===========================================================
-- USUÁRIOS / PERMISSÃO DE ADMIN
-- Rode este SQL UMA VEZ no Supabase (SQL Editor → New query → Run)
-- ===========================================================

-- 1) Adiciona a coluna is_admin se ainda não existir
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Promove os primeiros administradores
UPDATE public.users
   SET is_admin = TRUE
 WHERE email IN ('r3nomedeiros@gmail.com', 'reno14medeiros@gmail.com');

-- 3) (Opcional) Conferir
SELECT id, email, nome, is_admin
  FROM public.users
 ORDER BY is_admin DESC, created_at ASC;
