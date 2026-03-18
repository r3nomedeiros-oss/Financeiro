# Sistema Financeiro Industrial - PRD

## Problema Original
Sistema financeiro industrial conectado ao Supabase. Usuário solicitou que a aba de DRE (Demonstrativo de Resultado do Exercício) seguisse a estrutura de uma planilha Excel com:
- Visualização anual (Jan-Dez) com consolidado
- Dados vindos de movimentações reais
- Estrutura hierárquica com categorias e subcategorias
- Formatação com cores (receitas em ciano, despesas em vermelho, margens em azul)

## Arquitetura
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: FastAPI (Python)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: JWT

## Personas de Usuário
1. **Gestor Financeiro**: Visualiza DRE anual, analisa margens e resultados
2. **Contador**: Configura plano de contas, categoriza movimentações
3. **Administrador**: Gerencia usuários e configurações gerais

## Requisitos Core (Estáticos)
- Login/Registro de usuários
- Dashboard financeiro
- Movimentações financeiras
- DRE gerencial
- Planejamento orçamentário
- Configurações de plano de contas

## Implementado (18/03/2026)
### DRE Anual - Estrutura Excel
- [x] Nova API `/api/dre/anual/{ano}` para dados anuais
- [x] Tabela no estilo planilha Excel (Jan-Dez + Total + AV%)
- [x] Estrutura hierárquica completa:
  - (+) Receita Bruta
  - (-) Deduções Sobre Vendas
  - (=) Receita Líquida
  - (-) Custos Variáveis
  - (=) Margem de Contribuição + %
  - (-) Custos Fixos
  - (=) Resultado Operacional
  - Resultado Não Operacional
  - (=) Lucro Líquido + %
- [x] 17 subcategorias (códigos 1-22 conforme imagem)
- [x] Formatação com cores (ciano, vermelho, verde, azul)
- [x] Coluna AV% (Análise Vertical)

### Configurações - Plano de Contas
- [x] Nova página de configurações completa
- [x] Abas: Plano de Contas | Contas Bancárias
- [x] Botão "Criar Plano Padrão DRE" - cria 17 categorias
- [x] CRUD completo de plano de contas (adicionar, editar, excluir)
- [x] Mapeamento de categoria para linha do DRE
- [x] CRUD de contas bancárias

### Backend
- [x] API `/api/plano-contas/criar-padrao` para criar estrutura padrão
- [x] Estrutura DRE_ESTRUTURA com 17 categorias
- [x] Cálculos automáticos de margens e totais

## Backlog Priorizado
### P0 (Crítico)
- [ ] Importação de movimentações via CSV/Excel

### P1 (Alta Prioridade)
- [ ] Relatórios em PDF
- [ ] Comparativo ano a ano no DRE
- [ ] Gráficos de evolução mensal

### P2 (Média Prioridade)
- [ ] Dashboard customizável
- [ ] Alertas de orçamento excedido
- [ ] Integração bancária (OFX)

## Próximos Passos
1. Cadastrar movimentações de teste para validar cálculos do DRE
2. Implementar importação de dados CSV
3. Adicionar relatórios exportáveis
