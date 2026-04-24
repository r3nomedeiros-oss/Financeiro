# Sistema Financeiro (Vercel/Supabase/GitHub) - PRD

## Problem Statement
Sistema financeiro existente conectado a Vercel/Supabase/GitHub. Na aba de Planejamento Orçamentário, existe uma barra horizontal para rolar os dados na parte inferior da tabela. Usuário solicitou uma barra idêntica na parte SUPERIOR da tabela para facilitar a rolagem quando estiver editando os campos de cima.

## Tech Stack
- Frontend: React + Vite + Tailwind
- Backend: Supabase
- Deploy: Vercel
- Repo: GitHub

## Feature Log
### [Jan 2026] Barra de scroll superior na Tabela de Planejamento Orçamentário
- Arquivo: `/app/frontend/src/pages/PlanejamentoPage.jsx`
- Arquivo: `/app/frontend/src/index.css` (classe `.planejamento-top-scroll`)
- Sincronização bi-direcional via refs + `requestAnimationFrame` (anti-loop).
- Largura dinâmica do spacer via `ResizeObserver` acompanhando `scrollWidth` real da tabela.
- Scrollbar estilizada sempre visível (12px) em webkit e Firefox.
- data-testid: `planejamento-top-scrollbar`

## Backlog
- P2: Considerar scroll superior também em outras tabelas grandes (Comparativo), se usuário solicitar.
