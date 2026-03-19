# Sistema Financeiro Industrial - PRD

## Problema Original
Sistema financeiro industrial conectado ao Supabase. Múltiplas melhorias solicitadas:
- DRE com estrutura hierárquica de 3 níveis (Categoria > Subcategoria > Item)
- Exportação em PDF e Excel
- Menu lateral minimizável
- Nova aba Fluxo de Caixa Diário
- Relatórios Comparativos com análise vertical e horizontal
- Planejamento usando estrutura do DRE

## Arquitetura
- **Frontend**: React + Vite + TailwindCSS + Lucide Icons
- **Backend**: FastAPI (Python)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: JWT

## Implementado (19/03/2026)

### 1. DRE - Demonstrativo de Resultado
- [x] Removido botão "Criar Plano Padrão" (agora apenas em Configurações)
- [x] Botões de exportação: Excel (CSV) e PDF
- [x] Campo ano mostra apenas anos com lançamentos
- [x] Estrutura hierárquica de 3 níveis com expand/collapse
- [x] Valores agregam: Item → Subcategoria → Categoria

### 2. Menu Lateral Minimizável
- [x] Sidebar pode ser minimizado/expandido
- [x] Quando minimizado: apenas ícones
- [x] Botão de toggle com animação suave
- [x] Logo compacto ("SF") quando minimizado

### 3. Fluxo de Caixa Diário (NOVA ABA)
- [x] Visualização dia a dia do mês inteiro
- [x] Colunas: Dia, Dia Semana, Entradas, Saídas, Saldo
- [x] Cards de resumo: Saldo Inicial, Total Entradas, Total Saídas, Saldo Final
- [x] Filtro por conta bancária
- [x] Navegação entre meses
- [x] Destaque para finais de semana

### 4. Movimentações Financeiras
- [x] Campo Item/Conta mostra apenas itens (nível 3) do plano de contas
- [x] Campo Valor formatado como moeda brasileira (R$ 0,00)
- [x] Dropdown organizado por subcategoria

### 5. Planejamento Orçamentário
- [x] Usa mesmo plano de contas do DRE
- [x] Agrupado por categorias fixas do DRE
- [x] Cada categoria expandível com itens planejados
- [x] Total por categoria

### 6. Relatórios Comparativos (NOVA FUNCIONALIDADE)
- [x] Dois períodos configuráveis (Data Início/Fim)
- [x] Filtros flexíveis: dia, semana, mês, trimestre
- [x] Análise Vertical (AV%) - % sobre receita total
- [x] Análise Horizontal (AH%) - variação entre períodos
- [x] Toggles para mostrar/ocultar AV% e AH%
- [x] Tabela comparativa com formatação condicional

## Estrutura do Menu
1. Dashboard
2. Movimentação Financeira
3. Demonstrativo de Resultado (DRE)
4. Fluxo de Caixa Diário
5. Planejamento Orçamentário
6. Relatórios Comparativos
7. Configurações

## Testes
- Frontend: 95% passou
- Backend: funcionando
- Todas as novas funcionalidades validadas visualmente

## Backlog
### P0
- [ ] Vincular movimentações aos itens para cálculo real no DRE

### P1
- [ ] Gráficos no Fluxo de Caixa
- [ ] Comparativo Orçado x Realizado
- [ ] Alertas de orçamento

### P2
- [ ] Dashboard customizável
- [ ] Integração bancária
