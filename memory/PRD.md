# Sistema Financeiro Industrial (SFI) - PRD

## Problema Original
Sistema de controle financeiro industrial que precisava de:
1. Otimizações de performance para carregamento mais rápido
2. Correção de bug na página de Planejamento Orçamentário (ficava em branco)

## Arquitetura
- **Backend:** FastAPI + Supabase (PostgreSQL externo)
- **Frontend:** React 18 + Vite + TailwindCSS
- **Autenticação:** JWT
- **Deploy:** Vercel (frontend) + Railway (backend) + Supabase (DB)

## Funcionalidades Principais
- Dashboard com visão geral financeira
- DRE (Demonstrativo de Resultado do Exercício)
- Movimentações financeiras
- Planejamento Orçamentário
- Relatórios Comparativos (Orçado x Realizado)
- Fluxo de Caixa
- Configurações de usuário (Plano de Contas + Contas Bancárias)

## User Personas
- **Gestor Financeiro:** Analisa DRE, relatórios comparativos
- **Operador:** Lança movimentações diárias
- **Diretor:** Visualiza dashboard e planejamento

## O que foi implementado

### Sessão 1 (02/04/2026)
1. Instalado módulo `postgrest` que estava faltando
2. Corrigido erro de Hooks no PlanejamentoPage.jsx
3. Lazy Loading de PDFs/Excel
4. Skeleton Loaders
5. Cache de API (TTL 60s)
6. Paginação no backend para movimentações

### Sessão 2 (15/01/2026) - Bug Fix Performance
**Problema:** Salvamento no Planejamento Orçamentário extremamente lento (chamadas API sequenciais - cada item com "Aplicar a todos os meses" = 24+ queries ao Supabase)

**Solução implementada:**
1. **Novo endpoint batch:** `POST /api/planejamento/batch` - aceita array de itens e salva todos de uma vez
   - Busca todos os planejamentos existentes do ano em uma única query
   - Batch insert para novos itens (até 50 por vez)
   - Resultado: 12 meses salvos em < 1 segundo (antes ~10-30 segundos)
2. **Frontend otimizado:** `salvarAlteracoes()` agora usa `planejamentoAPI.batch()` em vez de chamadas sequenciais
3. **Esclarecimento DRE:** DRE mostra movimentações reais (entradas/saídas), não planejamento. Valores planejados aparecem em "Orçado x Realizado"

## Credenciais de Teste
- Email: admin@sfi.com
- Senha: admin123

## Backlog Priorizado

### P0 (Crítico)
- [x] Bug Planejamento em branco - RESOLVIDO
- [x] Salvamento lento no Planejamento - RESOLVIDO

### P1 (Alto)
- [ ] Virtualização de tabelas longas com react-window
- [ ] Endpoint batch para criação de plano de contas padrão (atualmente sequencial)

### P2 (Médio)
- [ ] Migração para TanStack Query para cache avançado
- [ ] Code splitting mais granular por rotas
- [ ] Dashboard com gráfico de tendência mensal

## Próximas Tarefas
1. Monitorar performance do batch endpoint com volumes maiores
2. Considerar adicionar coluna de "Planejado" na DRE para comparação rápida
