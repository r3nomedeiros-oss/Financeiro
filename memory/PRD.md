# Sistema Financeiro Industrial - PRD

## Problem Statement Original
Aplicativo de controle financeiro com os seguintes problemas a corrigir:
1. DRE em PDF está errado - corrigir exportação
2. Colocar filtro por período no Fluxo de Caixa
3. Quero baixar o Planejamento Orçamentário (PDF e Excel)
4. Relatórios Comparativos não funcionam - período 1 e 2 mostram dados iguais

### Correções Adicionais (2ª iteração)
5. Dashboard - Gráfico Saídas por Plano de Contas não compacto
6. Dashboard - Gráfico Entradas x Saídas - cores erradas
7. Dashboard - Gráfico Entradas por Plano de Contas - todas barras iguais
8. DRE - Barra de scroll apenas em baixo
9. DRE - Exportação não respeita estado de expansão

## Arquitetura
- **Frontend**: React + Vite + TailwindCSS + Recharts
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Autenticação**: JWT

## User Personas
- Gestores financeiros de empresas industriais
- Controllers e analistas financeiros

## Core Requirements (Static)
- Dashboard com indicadores e gráficos financeiros
- DRE anual com estrutura hierárquica expansível
- Fluxo de Caixa diário com filtros
- Planejamento Orçamentário
- Relatórios Comparativos (AV% e AH%)

## What's Been Implemented

### 2026-03-26 - 1ª Iteração
1. **DRE PDF/Excel** - Exportação corrigida
2. **Fluxo de Caixa - Filtro por Período** - Toggle entre mês e período personalizado
3. **Planejamento Orçamentário - Download** - Botões Excel e PDF
4. **Relatórios Comparativos** - Backend aceita data_inicio e data_fim

### 2026-03-26 - 2ª Iteração
5. **Dashboard - Gráfico Entradas x Saídas** - Cores: verde (#16a34a) para Entradas, vermelho (#dc2626) para Saídas
6. **Dashboard - Gráfico Saídas por Plano de Contas** - Compactado com legenda lateral, donut style
7. **Dashboard - Gráfico Entradas por Plano de Contas** - Cada barra com cor diferente (palette COLORS)
8. **DRE - Scroll horizontal no topo** - Barra de scroll sincronizada com a de baixo
9. **DRE - Exportação respeita expansão** - PDF/Excel exporta conforme estado visual atual

## Arquivos Modificados
- `/app/backend/server.py` - Suporte a data_inicio/data_fim
- `/app/frontend/src/pages/DashboardPage.jsx` - Cores e layout dos gráficos
- `/app/frontend/src/pages/DREPage.jsx` - Scroll topo + exportação com expansão
- `/app/frontend/src/pages/FluxoCaixaPage.jsx` - Filtro por período + exportação
- `/app/frontend/src/pages/PlanejamentoPage.jsx` - Exportação PDF/Excel
- `/app/frontend/src/pages/RelatoriosPage.jsx` - Mensagem de orientação

## Prioritized Backlog

### P0 - Crítico
- [x] Todas as correções da 1ª iteração
- [x] Todas as correções da 2ª iteração

### P1 - Importante
- [ ] Adicionar gráficos comparativos aos relatórios

### P2 - Nice to Have
- [ ] Dark mode
- [ ] Notificações de orçamento excedido
- [ ] Integração Open Finance

## Next Tasks
- Validar com dados reais de produção
- Coletar feedback do usuário
