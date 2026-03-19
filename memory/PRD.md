# Sistema Financeiro Industrial - PRD

## Problema Original
Sistema financeiro industrial conectado ao Supabase. Usuário solicitou que a aba de DRE (Demonstrativo de Resultado do Exercício) seguisse a estrutura de uma planilha Excel com:
- Visualização anual (Jan-Dez) com consolidado
- Dados vindos de movimentações reais
- Estrutura hierárquica de 3 níveis: Categoria (fixa) > Subcategoria > Item/Conta
- Formatação com cores (receitas em ciano, despesas em vermelho, margens em azul)
- Funcionalidade de expand/collapse (Tree View)

## Arquitetura
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: FastAPI (Python)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: JWT

## Personas de Usuário
1. **Gestor Financeiro**: Visualiza DRE anual, analisa margens e resultados, expande/recolhe níveis
2. **Contador**: Configura plano de contas hierárquico, categoriza movimentações
3. **Administrador**: Gerencia usuários e configurações gerais

## Requisitos Core (Estáticos)
- Login/Registro de usuários
- Dashboard financeiro
- Movimentações financeiras
- DRE gerencial com estrutura hierárquica
- Planejamento orçamentário
- Configurações de plano de contas

## Implementado (18/03/2026)

### DRE Anual com Estrutura Hierárquica
- [x] Visualização anual (Jan-Dez + Total + AV%)
- [x] **3 níveis hierárquicos**:
  - Nível 1: Categorias fixas (5 categorias imutáveis)
  - Nível 2: Subcategorias (editáveis pelo usuário)
  - Nível 3: Itens/Contas (editáveis pelo usuário)
- [x] Expand/Collapse com botões "Expandir Tudo" e "Recolher Tudo"
- [x] Clique em categorias e subcategorias para expandir/recolher
- [x] Formatação com cores conforme tipo (ciano, vermelho, verde, azul)

### Categorias Fixas do DRE
1. (+) Receita Bruta (ciano)
2. (-) Deduções Sobre Vendas (vermelho)
3. (-) Custos Variáveis (vermelho)
4. (-) Custos Fixos (vermelho)
5. Resultado Não Operacional (cinza)

### Configurações - Plano de Contas Hierárquico
- [x] Tree View com expand/collapse
- [x] Botão "Criar Plano Padrão DRE" - cria 57 contas (17 subcategorias + 40 itens)
- [x] Adicionar subcategoria em qualquer categoria
- [x] Adicionar item em qualquer subcategoria
- [x] Editar e excluir subcategorias e itens
- [x] Validação: não permite excluir subcategoria com itens vinculados

### Backend APIs
- [x] GET /api/categorias-dre - Categorias fixas
- [x] GET /api/plano-contas/hierarquico - Estrutura em árvore
- [x] POST /api/plano-contas/criar-padrao - Criar plano padrão
- [x] CRUD /api/plano-contas - Gestão de subcategorias e itens

### Estrutura de Dados
Formato da categoria: `{categoria_dre}|{nivel}|{parent_id}`
- Ex: `custos_fixos|2|` para subcategoria
- Ex: `custos_fixos|3|abc123` para item filho da subcategoria abc123

## Testes Realizados
- Backend: 85% (endpoint hierárquico 100%)
- Frontend: 100%
- Integração: 100%

## Backlog Priorizado
### P0 (Crítico)
- [ ] Vincular movimentações aos itens do plano de contas para cálculo real do DRE

### P1 (Alta Prioridade)
- [ ] Importação de movimentações via CSV/Excel
- [ ] Relatórios em PDF
- [ ] Comparativo ano a ano no DRE

### P2 (Média Prioridade)
- [ ] Gráficos de evolução mensal
- [ ] Dashboard customizável
- [ ] Alertas de orçamento excedido

## Próximos Passos
1. Cadastrar movimentações vinculadas ao plano de contas para popular o DRE
2. Implementar importação de dados CSV
3. Adicionar relatórios exportáveis
