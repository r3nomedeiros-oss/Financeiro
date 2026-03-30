# Sistema Financeiro Industrial - PRD

## Visão Geral
Sistema financeiro completo para gestão industrial com DRE, fluxo de caixa, planejamento orçamentário e relatórios comparativos.

## Stack Tecnológica
- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **PDF Export**: jsPDF + jsPDF-autotable

## Funcionalidades Implementadas

### Autenticação
- [x] Login/Registro com JWT
- [x] Persistência de sessão via localStorage

### Dashboard
- [x] Visão geral de receitas, margens e lucros
- [x] Gráficos de entradas x saídas (barras)
- [x] Gráfico de saídas por plano (barras horizontais com legenda)
- [x] Saldo das contas bancárias
- [x] Filtros por mês/ano
- [x] Cards compactos com cores dinâmicas

### Movimentações Financeiras
- [x] CRUD completo de movimentações
- [x] Vinculação com plano de contas hierárquico
- [x] Vinculação com contas bancárias
- [x] Atualização automática de saldos

### DRE (Demonstrativo de Resultado)
- [x] Visualização anual com estrutura hierárquica
- [x] Expansão/recolhimento de categorias
- [x] Exportação para Excel (CSV)
- [x] Exportação para PDF

### Fluxo de Caixa
- [x] Resumo mensal por semana
- [x] Detalhamento diário por período
- [x] Exportação para Excel e PDF

### Planejamento Orçamentário (ATUALIZADO 29/03/2026)
- [x] **Nova interface estilo planilha** (Jan-Dez + Total)
- [x] **Mesma estrutura hierárquica do DRE**
- [x] **Edição inline** - clique na célula para editar
- [x] **Botão "Aplicar para todos os meses"** - facilita preenchimento em massa
- [x] Salvamento em lote de alterações
- [x] Indicador de alterações pendentes
- [x] Totais automáticos por categoria e geral
- [x] Exportação para Excel e PDF

### Configurações
- [x] Gestão de contas bancárias
- [x] Plano de contas hierárquico (3 níveis)

## Otimizações de Performance (29/03/2026)

### Lazy Loading
- Todas as páginas carregadas sob demanda via React.lazy()

### Code Splitting (Vite)
- Chunks separados: vendor-react, vendor-charts, vendor-pdf, vendor-utils

### Cache de API
- Cache em memória para requisições GET (30s TTL)
- Deduplicação de requests pendentes

### Memoização de Componentes
- Cards, gráficos e sidebar memoizados

## Correções de Bugs (29/03/2026)

### Erro 404 ao Atualizar Página
- **Status**: ✅ Corrigido (vercel.json rewrites)

### Dashboard - Layout dos Cards
- **Status**: ✅ Corrigido (padding, truncate, cores dinâmicas)

### Dashboard - Gráfico de Saídas
- **Status**: ✅ Corrigido (barras horizontais com legenda lateral)

## Backlog (P1)
- [ ] Comparativo Orçado x Realizado com mesmo layout
- [ ] Filtro avançado de movimentações

## Backlog (P2)
- [ ] Importação de dados via CSV
- [ ] Notificações de vencimentos
- [ ] Multi-empresa

## Credenciais de Teste
Ver `/app/memory/test_credentials.md`

---
Última atualização: 29/03/2026
