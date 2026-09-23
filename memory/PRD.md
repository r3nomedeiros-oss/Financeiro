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

### [Jun 2026] Contas a Pagar/Receber: seleção múltipla + ações em lote
- `ContasSection.jsx`: checkbox por linha + "selecionar todos" (sobre a lista filtrada). Barra de ações aparece com ≥1 selecionado: Editar em lote, Excluir selecionados, Limpar.
- Modal de edição em lote: cada campo (Descrição, Item/Conta, Valor, Vencimento, Status) tem checkbox "alterar"; só os marcados são aplicados a todos os selecionados. Item/Conta via `<select>` de itensDisponiveis. Exclusão em lote com confirm.
- Verificado via screenshot (mock do plano de contas + seed): selecionar todos, editar Item/Conta+Valor em 3 linhas (Total R$ 2.997) e excluir em lote (0 linhas) OK.

### [Jun 2026] Contas a Pagar/Receber: categoria agora usa Item/Conta do plano de contas
- `ContasSection.jsx`: campo "Categoria" (texto livre) substituído por combobox "Item/Conta *" com busca (typeahead) igual ao form de Movimentações — carrega `planoContasAPI.getHierarquico()` e lista itens nível 3 (ou subcategoria sem itens) filtrados por `tipoPlano` do config.
- Config: `tipoPlano: 'despesa'` em `ContasAPagar.jsx`, `'receita'` em `ContasAReceber.jsx`. Cada conta salva `planoContasId` + `categoria` (label "Sub → Item"). Cabeçalho da coluna renomeado para "Item/Conta". Item/Conta é obrigatório ao salvar.
- Requer backend (plano de contas). Verificado via screenshot com mock do hierárquico: dropdown lista itens de despesa, seleção e salvamento OK. Continua client-side (localStorage) para os lançamentos.

### [Jun 2026] Projeção/Contas: campo de recorrência nos lançamentos
- `ContasSection.jsx` (usado por Contas a Pagar e a Receber): novo campo "Recorrência" (Não recorrente / Semanal / Mensal / Anual) + campo "Repetições" (1..120, aparece só quando recorrente e em novo lançamento).
- Ao salvar recorrente, gera N lançamentos com datas avançadas pela frequência (`avancarData`), marcados com `recorrente:true` e `serieId` compartilhado. Ícone `Repeat` (lucide) indica linhas recorrentes.
- Exclusão de item de série pergunta se apaga a série toda. Edição aplica-se só ao lançamento (recorrência desabilitada ao editar). 100% client-side (localStorage).
- Preview de datas: ao marcar recorrência, mostra a lista de datas que serão criadas (inputs de data editáveis + remover cada uma) antes de salvar; total recalcula em tempo real; as datas do preview (ajustadas) são as efetivamente salvas. `datasPreview` recalcula quando frequência/data-base/repetições mudam.
- Verificado via screenshot: mensal×6 gerou 6 lançamentos; no preview editei a 3ª data e removi 1 (ficaram 5, total R$ 17.500) e as 5 datas ajustadas foram salvas.

### [Jun 2026] DRE: exportação PDF redesenhada (modelo do usuário)
- `DREPage.jsx` (`exportToPDF`): título + subtítulo ("Visão Simplificada – Mês / Ano" ou "Visão Anual – Ano"); tabela com tema 'plain' (apenas linhas horizontais finas cinza, sem grade vertical); texto colorido por categoria/total (ciano/vermelho/verde/azul) e itens em cinza; orientação retrato no mês único e paisagem no consolidado.
- Cards de resumo no rodapé (roundedRect): RECEITA LÍQUIDA (azul), MARGEM DE CONTRIBUIÇÃO (verde, com %), LUCRO LÍQUIDO (rosa/vermelho, com %). Valores usam o período exportado.
- Verificado gerando PDF isolado (jsPDF em Node) + análise visual: layout confere com o modelo. E2E não verificável (backend sem `.env` Supabase). Build Vite OK.

### [Jun 2026] DRE: exportações sem subcategorias (exceto Resultado Não Operacional)
- `DREPage.jsx` (`gerarDadosExportacao`): nas exportações PDF/Excel, as linhas de subcategoria foram removidas e os itens passam a aparecer diretamente sob a categoria principal (nível 1 com bullet). Exceção: `resultado_nao_operacional` mantém a hierarquia completa (categoria -> subcategoria -> itens).
- Bullet de item agora usa flag `isItem` (antes era `nivel === 2`). Tabela na tela permanece inalterada; muda apenas o conteúdo dos arquivos exportados.
- NÃO verificado via testing_agent: backend não sobe no preview (falta `/app/backend/.env` do Supabase). Build Vite OK.

## Known Environment Issue
- `/app/backend/.env` AUSENTE neste preview → backend não sobe (ValueError SUPABASE_URL/KEY). Necessário restaurar credenciais Supabase para rodar/testar localmente. Não afeta produção (Vercel/Supabase).

## Backlog
