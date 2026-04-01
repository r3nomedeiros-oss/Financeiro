# Sistema Financeiro Industrial - PRD

## Visão Geral
Sistema financeiro completo para gestão industrial com DRE, fluxo de caixa, planejamento orçamentário e relatórios comparativos.

## Stack Tecnológica
- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **PDF Export**: jsPDF + jsPDF-autotable (COM CORES)

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
- [x] Exportação para PDF COM CORES

### Fluxo de Caixa
- [x] Resumo mensal por semana
- [x] Detalhamento diário por período
- [x] Exportação para Excel e PDF

### Planejamento Orçamentário (ATUALIZADO)
- [x] Estrutura hierárquica igual ao DRE
- [x] Interface estilo planilha (Jan-Dez + Total)
- [x] Edição inline - clique na célula para editar
- [x] Botão "Aplicar para todos os meses"
- [x] **Barra superior fixa** com controles
- [x] **Botões Expandir/Recolher Tudo**
- [x] Salvamento sequencial
- [x] Exportação PDF COM CORES
- [x] Exportação Excel

### Orçado x Realizado (ATUALIZADO)
- [x] **Estrutura hierárquica igual ao DRE**
- [x] **Cards compactos**
- [x] **Botões Expandir/Recolher Tudo**
- [x] **Percentuais corrigidos** (variação real vs orçado)
- [x] Exportação PDF COM CORES
- [x] Exportação Excel

### Relatórios Comparativos (ATUALIZADO)
- [x] **Estrutura hierárquica igual ao DRE**
- [x] Comparação de dois períodos
- [x] Análise Vertical (AV%)
- [x] Análise Horizontal (AH%) 
- [x] **Botões Expandir/Recolher Tudo**
- [x] Exportação PDF COM CORES
- [x] Exportação Excel

### Configurações
- [x] Gestão de contas bancárias
- [x] Plano de contas hierárquico (3 níveis)

## Correções (29/03/2026)

### PDFs e Excel
- ✅ Todos os relatórios agora exportam COM CORES
- ✅ Cabeçalhos coloridos por categoria
- ✅ Valores positivos/negativos com cores distintas

### Planejamento Orçamentário
- ✅ Barra superior fixa
- ✅ Botões expandir/recolher tudo

### Orçado x Realizado
- ✅ Cards compactos
- ✅ Estrutura DRE
- ✅ Percentuais corrigidos

### Relatórios Comparativos
- ✅ Estrutura DRE hierárquica
- ✅ Exportações com cores

## Backlog (P1)
- [ ] Resolver erro de Network ao salvar (verificar ambiente de produção)
- [ ] Importação de dados via CSV

## Backlog (P2)
- [ ] Notificações de vencimentos
- [ ] Multi-empresa

## Credenciais de Teste
Ver `/app/memory/test_credentials.md`

---
Última atualização: 29/03/2026
