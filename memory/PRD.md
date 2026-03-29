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
- [x] Gráficos de entradas x saídas
- [x] Saldo das contas bancárias
- [x] Filtros por mês/ano

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

### Planejamento Orçamentário
- [x] Cadastro de orçamentos por período
- [x] Comparativo orçado x realizado

### Configurações
- [x] Gestão de contas bancárias
- [x] Plano de contas hierárquico (3 níveis)

## Otimizações de Performance (29/03/2026)

### Lazy Loading
- Todas as páginas agora são carregadas sob demanda via React.lazy()
- Reduz bundle inicial significativamente

### Code Splitting (Vite)
- Chunks separados: vendor-react, vendor-charts, vendor-pdf, vendor-utils
- Melhor cache de navegador

### Cache de API
- Cache em memória para requisições GET (30s TTL)
- Deduplicação de requests pendentes
- Invalidação automática em mutações

### Memoização de Componentes
- Cards de indicadores memoizados
- Gráficos memoizados
- Sidebar com itens memoizados
- useMemo/useCallback para dados processados

### Prefetch
- Páginas prováveis são pré-carregadas em background

## Correções de Bugs (29/03/2026)

### Erro 404 ao Atualizar Página
- **Problema**: F5 retornava 404 em SPAs
- **Solução**: Configuração de rewrites no vercel.json
- **Status**: ✅ Corrigido

## Backlog (P1)
- [ ] Filtro avançado de movimentações
- [ ] Gráficos de tendência
- [ ] Dashboard com KPIs customizáveis

## Backlog (P2)
- [ ] Importação de dados via CSV
- [ ] Notificações de vencimentos
- [ ] Multi-empresa

## Credenciais de Teste
Ver `/app/memory/test_credentials.md`

---
Última atualização: 29/03/2026
