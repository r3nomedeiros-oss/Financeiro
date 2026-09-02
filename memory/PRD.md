# Sistema Financeiro (Vercel/Supabase/GitHub) - PRD

## Problem Statement
Sistema financeiro existente conectado a Vercel/Supabase/GitHub (React+Vite / FastAPI / Supabase).

## Tech Stack
- Frontend: React + Vite + Tailwind + Recharts (PWA)
- Backend: FastAPI + Supabase (PostgreSQL), JWT
- Deploy: Vercel + Supabase
- Repo: GitHub

## Feature Log
### [Jan 2026] Barra de scroll superior na Tabela de Planejamento Orçamentário
- `/app/frontend/src/pages/PlanejamentoPage.jsx`, `/app/frontend/src/index.css`

### [Set 2026] Filtro de mês no DRE + exportação por mês
- Arquivo: `/app/frontend/src/pages/DREPage.jsx`
- Novo `<select>` (data-testid `mes-filtro-select`): "Todos os meses" (consolidado anual, comportamento original) + Janeiro..Dezembro.
- Quando um mês é escolhido: tabela mostra apenas a coluna daquele mês (oculta colunas dos demais meses e a coluna Total do ano); AV% recalculado sobre a Receita Líquida do mês.
- Exportações PDF e Excel respeitam o filtro: exportam só o mês selecionado (arquivo `DRE_{ano}_{Mes}.pdf/csv`) ou o ano consolidado ("Todos").
- Lógica 100% client-side, reutiliza dados de `dreAPI.getAnual(ano)` (por-mês já disponível em `valores_por_plano` e `totais`). Build Vite verificado (OK).

## Known Environment Issue
- `/app/backend/.env` AUSENTE neste preview → backend não sobe (ValueError SUPABASE_URL/KEY). Necessário restaurar credenciais Supabase para rodar/testar localmente. Não afeta produção (Vercel/Supabase).

## Backlog
- P2: Scroll superior em outras tabelas grandes (Comparativo).
- P2: Testar login/DRE ponta-a-ponta após restaurar backend .env.
