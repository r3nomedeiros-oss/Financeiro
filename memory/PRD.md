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

### [Jun 2026] Projeção: Contas a Receber + Comparativo (Receber x Pagar)
- Componente generico `ContasSection.jsx` (parametrizado por config) usado por `ContasAPagar.jsx` (key `projecao_contas_pagar_v1`) e `ContasAReceber.jsx` (key `projecao_contas_receber_v1`).
- `ComparativoContas.jsx`: le ambos os localStorage, filtro mes/periodo, grafico com 3 linhas (A Receber, A Pagar, Saldo acumulado) + resumo (A Receber / A Pagar / Saldo). Botao "Atualizar" re-le o localStorage.
- ProjecaoPage: 4 abas internas (view): simulacao | pagar | receber | comparativo.
- Verificado via screenshot: cadastro receber, resumos e comparativo (15.745,12 - 8.220,00 = 7.525,12) OK.

### [Jun 2026] Projeção: sub-aba "Contas a Pagar" (dentro de /projecao, isolada)
- Arquivo: `/app/frontend/src/pages/ContasAPagar.jsx`. Integrada via abas internas em `ProjecaoPage.jsx` (state `view`: 'simulacao' | 'contas').
- localStorage key `projecao_contas_pagar_v1`. NAO usa API; nao afeta relatorios.
- Cadastro: descricao, valor, vencimento, categoria (datalist), status (pago/pendente, toggle na tabela). Editar/excluir.
- Resumo: Total a Pagar / Pago / Pendente (sobre o periodo filtrado). Contas vencidas destacadas.
- Filtro: "Por mes" (ano+mes) ou "Periodo" (De/Ate). Grafico de linha (Recharts) do total por periodo: buckets diarios se intervalo <= 62 dias, senao mensais.
- Verificado via screenshot: cadastro, resumo, toggle status, filtro mes/periodo e grafico OK.

### [Jun 2026] Nova aba: Projeção de Fluxo de Caixa (simulador de cenários) - ISOLADA
- Arquivo: `/app/frontend/src/pages/ProjecaoPage.jsx`. Rota `/projecao` (App.jsx), menu em Sidebar.jsx e MobileBottomNav.jsx (icone TrendingUp).
- 100% client-side (localStorage key `projecao_fluxo_caixa_v1`). NAO faz nenhuma chamada de API; nao le nem escreve DRE/Movimentacoes/saldos reais.
- Recursos: multiplos cenarios nomeados (novo/duplicar/renomear/excluir), ano selecionavel, saldo inicial manual, planilha 12 meses com linhas de receitas/despesas editaveis, Total Receitas/Despesas, Resultado do Mes e Saldo Acumulado, cards de resumo e grafico de linha (Recharts) do saldo acumulado.
- Verificado via screenshot (login exige backend, mas a pagina nao usa API; injetei user fake no localStorage): calculo e CRUD de cenarios OK.


### [Jun 2026] DRE: layout compacto no filtro de mês + linhas vazias omitidas na exportação
- `DREPage.jsx`: largura mínima de 1500px só na visão "Todos os meses"; mês único usa largura natural (compacto). Barra de scroll superior oculta no mês único.
- `DREPage.jsx` (`gerarDadosExportacao`): PDF/Excel omitem categorias, subcategorias e itens sem valor no período exportado. Linhas de resultado (Receita Líquida, Margem, etc.) sempre mantidas.

### [Jun 2026] Correção de saldo das contas bancárias (bug: saldo não batia)
- Causa raiz: saldo atualizado de forma incremental; `update_movimentacao` reaplicava saldo só na conta original mesmo quando o usuário trocava a conta bancária na edição -> saldo "desandava".
- Fix (`server.py`): novo `_recalcular_saldo_conta()` determinístico (saldo_inicial + entradas - saídas) chamado em create/update/delete de movimentação e na edição de saldo inicial. Novo endpoint `POST /api/contas-bancarias/recalcular`.
- `models.py`: `ContaBancariaUpdate` agora aceita `saldo_inicial`.
- Frontend: botão "Recalcular Saldos" em Configurações -> Contas Bancárias (`contasAPI.recalcular`).
- Script SQL manual: `/app/scripts/recalcular_saldos.sql`.
- NAO verificado via testing_agent: backend nao sobe no preview (falta `/app/backend/.env` do Supabase); usuario optou por ajustar o saldo atual direto no banco.


### [Set 2026] Filtro de mês no DRE + exportação por mês
- Arquivo: `/app/frontend/src/pages/DREPage.jsx`
- Novo `<select>` (data-testid `mes-filtro-select`): "Todos os meses" (consolidado anual, comportamento original) + Janeiro..Dezembro.
- Quando um mês é escolhido: tabela mostra apenas a coluna daquele mês (oculta colunas dos demais meses e a coluna Total do ano); AV% recalculado sobre a Receita Líquida do mês.
- Exportações PDF e Excel respeitam o filtro: exportam só o mês selecionado (arquivo `DRE_{ano}_{Mes}.pdf/csv`) ou o ano consolidado ("Todos").
- Lógica 100% client-side, reutiliza dados de `dreAPI.getAnual(ano)` (por-mês já disponível em `valores_por_plano` e `totais`). Build Vite verificado (OK).

## Known Environment Issue
- `/app/backend/.env` AUSENTE neste preview → backend não sobe (ValueError SUPABASE_URL/KEY). Necessário restaurar credenciais Supabase para rodar/testar localmente. Não afeta produção (Vercel/Supabase).

## Backlog
