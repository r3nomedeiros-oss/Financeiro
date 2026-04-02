# Sistema Financeiro Industrial (SFI) - PRD

## Problema Original
Sistema de controle financeiro industrial que precisava de:
1. Otimizações de performance para carregamento mais rápido
2. Correção de bug na página de Planejamento Orçamentário (ficava em branco)

## Arquitetura
- **Backend:** FastAPI + Supabase (PostgreSQL externo)
- **Frontend:** React 18 + Vite + TailwindCSS
- **Autenticação:** JWT

## Funcionalidades Principais
- Dashboard com visão geral financeira
- DRE (Demonstrativo de Resultado do Exercício)
- Movimentações financeiras
- Planejamento Orçamentário
- Relatórios Comparativos
- Fluxo de Caixa
- Configurações de usuário

## User Personas
- **Gestor Financeiro:** Analisa DRE, relatórios comparativos
- **Operador:** Lança movimentações diárias
- **Diretor:** Visualiza dashboard e planejamento

## O que foi implementado (02/04/2026)

### Bug Fix
- Instalado módulo `postgrest` que estava faltando (causava página em branco no Planejamento)
- Corrigida estrutura de carregamento da página PlanejamentoPage.jsx

### Otimizações de Performance

1. **Lazy Loading de PDFs/Excel:**
   - jsPDF e jspdf-autotable agora carregam sob demanda
   - Reduz bundle inicial significativamente (~300KB menos)

2. **Skeleton Loaders:**
   - Adicionados em PlanejamentoPage para feedback visual imediato
   - Melhora percepção de velocidade

3. **Carregamento Sequencial Otimizado:**
   - Hierarquia carrega primeiro (estrutura visível mais rápida)
   - Dados secundários carregam em background

4. **Cache de API:**
   - TTL aumentado para 60 segundos
   - Timeout aumentado para 30s (operações pesadas)

5. **Paginação no Backend:**
   - Endpoint `/api/movimentacoes` agora suporta paginação
   - Parâmetros: `page` e `limit` (padrão: 100 itens)

## Credenciais de Teste
- Email: admin@sfi.com
- Senha: admin123

## Backlog Priorizado

### P0 (Crítico)
- [x] Bug Planejamento em branco - RESOLVIDO

### P1 (Alto)
- [ ] Otimizar endpoint "Criar Plano de Contas Padrão" (timeout)
- [ ] Virtualização de tabelas longas com react-window

### P2 (Médio)
- [ ] Migração para TanStack Query para cache avançado
- [ ] Code splitting mais granular por rotas
- [ ] Prefetch de dados nas transições de página

### P3 (Baixo)
- [ ] Optimistic updates para ações CRUD
- [ ] Service Worker para cache offline

## Próximas Tarefas
1. Verificar se há mais páginas com problemas de carregamento
2. Implementar virtualização nas tabelas de DRE e Planejamento
3. Monitorar performance em produção
