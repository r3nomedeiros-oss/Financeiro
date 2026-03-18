# Sistema Financeiro Industrial 🏭💰

Sistema completo de gestão financeira para indústrias, desenvolvido com React, FastAPI e Supabase.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Tecnologias Utilizadas](#tecnologias-utilizadas)
3. [Funcionalidades](#funcionalidades)
4. [Configuração do Supabase](#configuração-do-supabase)
5. [Como Usar](#como-usar)
6. [Estrutura do Projeto](#estrutura-do-projeto)
7. [Deploy](#deploy)

---

## 🎯 Visão Geral

Este é um sistema financeiro completo desenvolvido para gestão industrial, com recursos avançados de análise financeira, DRE gerencial e planejamento orçamentário.

### ✨ Principais Recursos

- **Dashboard Interativo** com gráficos e indicadores em tempo real
- **Gestão de Movimentações** financeiras (entrada/saída)
- **DRE Gerencial** mensal automatizada
- **Planejamento Orçamentário** por período
- **Relatórios** e análises financeiras
- **Multi-conta bancária**
- **Plano de contas** personalizável
- **Autenticação segura** com JWT

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Framework UI
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **Recharts** - Gráficos interativos
- **React Router** - Navegação
- **Axios** - Cliente HTTP
- **Lucide React** - Ícones

### Backend
- **FastAPI** - Framework Python
- **Supabase** - Database PostgreSQL
- **JWT** - Autenticação
- **Bcrypt** - Hash de senhas
- **Uvicorn** - Servidor ASGI

### Database
- **Supabase (PostgreSQL)**
- 5 tabelas principais
- Relacionamentos e constraints

---

## 🚀 Funcionalidades

### 1. Dashboard
- Gráfico de Entradas x Saídas
- Gráfico de Saídas por Plano de Contas (Pizza)
- Gráfico de Entradas por Plano de Contas (Barras)
- Saldo de cada conta bancária
- Indicadores Financeiros:
  - Receita Total
  - Margem de Contribuição (R$ e %)
  - Lucro Operacional (R$ e %)
  - Lucro Líquido (R$ e %)
- **Filtros**: Mês e Ano

### 2. Movimentação Financeira
- Cadastro de movimentações (entrada/saída)
- Campos: Data, Tipo, Plano de Contas, Complemento, Banco, Valor
- Editar e excluir movimentações
- Atualização automática de saldo das contas
- Listagem com filtros

### 3. DRE Gerencial
- Demonstrativo de Resultado mensal
- Estrutura completa:
  - Receitas
  - (-) Custos
  - (=) Lucro Bruto
  - (-) Despesas Operacionais
  - (=) Lucro Operacional
  - (-) Impostos
  - (=) Lucro Líquido
- Cálculo de margens percentuais

### 4. Planejamento Orçamentário
- Criar planejamento por mês/ano
- Associar valores a planos de contas
- Acompanhar metas vs realizado

### 5. Relatórios
- Estrutura preparada para relatórios futuros
- Análises comparativas
- Tendências financeiras

### 6. Configurações
- Área reservada para configurações futuras

---

## 🗄️ Configuração do Supabase

### ⚠️ PASSO CRÍTICO - Execute este script primeiro!

1. **Acesse seu projeto no Supabase:**
   - URL: https://supabase.com
   - Entre no seu projeto

2. **Abra o SQL Editor:**
   - No menu lateral, clique em **SQL Editor**
   - Clique em **New Query**

3. **Execute o script SQL:**
   - Abra o arquivo `/app/scripts/supabase_tables.sql`
   - Copie todo o conteúdo
   - Cole no SQL Editor
   - Clique em **RUN** ou pressione **Ctrl+Enter**

4. **Verifique a criação:**
   - Execute a query de verificação no final do script
   - Deve retornar 5 tabelas:
     - `contas_bancarias`
     - `movimentacoes`
     - `planejamento_orcamentario`
     - `plano_contas`
     - `users`

### 📊 Estrutura das Tabelas

**users**
- `id` (UUID)
- `email` (VARCHAR)
- `password_hash` (TEXT)
- `nome` (VARCHAR)
- `created_at` (TIMESTAMP)

**contas_bancarias**
- `id` (UUID)
- `user_id` (UUID) → users
- `nome` (VARCHAR)
- `saldo_inicial` (DECIMAL)
- `saldo_atual` (DECIMAL)
- `created_at` (TIMESTAMP)

**plano_contas**
- `id` (UUID)
- `user_id` (UUID) → users
- `nome` (VARCHAR)
- `tipo` (VARCHAR) - 'receita' ou 'despesa'
- `categoria` (VARCHAR)
- `created_at` (TIMESTAMP)

**movimentacoes**
- `id` (UUID)
- `user_id` (UUID) → users
- `data` (DATE)
- `tipo` (VARCHAR) - 'entrada' ou 'saida'
- `plano_contas_id` (UUID) → plano_contas
- `complemento` (TEXT)
- `conta_bancaria_id` (UUID) → contas_bancarias
- `valor` (DECIMAL)
- `created_at` (TIMESTAMP)

**planejamento_orcamentario**
- `id` (UUID)
- `user_id` (UUID) → users
- `mes` (INTEGER) - 1 a 12
- `ano` (INTEGER)
- `plano_contas_id` (UUID) → plano_contas
- `valor_planejado` (DECIMAL)
- `created_at` (TIMESTAMP)

---

## 💻 Como Usar

### 1. Primeiro Acesso

1. **Acesse a aplicação:**
   - URL: https://relatorio-financeiro-2.preview.emergentagent.com

2. **Crie sua conta:**
   - Clique em "Cadastro"
   - Preencha: Nome, Email e Senha
   - Clique em "Criar Conta"

3. **Faça login:**
   - Use o email e senha cadastrados
   - Você será direcionado ao Dashboard

### 2. Configuração Inicial

**IMPORTANTE:** Configure nesta ordem:

#### Passo 1: Criar Contas Bancárias
1. Não há menu específico para isso no frontend atual
2. **Solução temporária:** Use a API diretamente ou adicione via SQL:

```sql
-- Substitua 'SEU_USER_ID' pelo ID gerado no seu cadastro
INSERT INTO contas_bancarias (id, user_id, nome, saldo_inicial, saldo_atual) VALUES
(gen_random_uuid(), 'SEU_USER_ID', 'Banco Bradesco', 10000.00, 10000.00),
(gen_random_uuid(), 'SEU_USER_ID', 'Banco Itaú', 5000.00, 5000.00),
(gen_random_uuid(), 'SEU_USER_ID', 'Caixa Empresarial', 20000.00, 20000.00);
```

#### Passo 2: Criar Plano de Contas
Use o SQL Editor:

```sql
-- Substitua 'SEU_USER_ID' pelo ID gerado no seu cadastro
INSERT INTO plano_contas (id, user_id, nome, tipo, categoria) VALUES
-- RECEITAS
(gen_random_uuid(), 'SEU_USER_ID', 'Vendas de Produtos', 'receita', 'Receitas Operacionais'),
(gen_random_uuid(), 'SEU_USER_ID', 'Prestação de Serviços', 'receita', 'Receitas Operacionais'),
(gen_random_uuid(), 'SEU_USER_ID', 'Receitas Financeiras', 'receita', 'Receitas Não Operacionais'),

-- DESPESAS
(gen_random_uuid(), 'SEU_USER_ID', 'Matéria Prima', 'despesa', 'Custos Diretos'),
(gen_random_uuid(), 'SEU_USER_ID', 'Mão de Obra Direta', 'despesa', 'Custos Diretos'),
(gen_random_uuid(), 'SEU_USER_ID', 'Salários Administrativos', 'despesa', 'Despesas Administrativas'),
(gen_random_uuid(), 'SEU_USER_ID', 'Energia Elétrica', 'despesa', 'Despesas Operacionais'),
(gen_random_uuid(), 'SEU_USER_ID', 'Aluguel', 'despesa', 'Despesas Operacionais'),
(gen_random_uuid(), 'SEU_USER_ID', 'Marketing', 'despesa', 'Despesas Comerciais'),
(gen_random_uuid(), 'SEU_USER_ID', 'Impostos', 'despesa', 'Impostos e Taxas');
```

#### Passo 3: Pegar seu User ID

Para saber seu `user_id` após criar a conta:

**Método 1 - Via SQL:**
```sql
SELECT id, email, nome FROM users WHERE email = 'seu@email.com';
```

**Método 2 - Via API:**
```bash
# 1. Faça login e pegue o token
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"suasenha"}'

# 2. Use o token para pegar seus dados
curl -X GET http://localhost:8001/api/auth/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 3. Uso Diário

#### Registrar Movimentações
1. Vá em **"Movimentação Financeira"**
2. Clique em **"Nova Movimentação"**
3. Preencha:
   - Data da transação
   - Tipo (Entrada ou Saída)
   - Plano de Contas correspondente
   - Conta Bancária
   - Valor
   - Complemento (opcional)
4. Clique em **"Salvar"**

#### Visualizar Dashboard
1. Vá em **"Dashboard"**
2. Use os filtros de **Mês** e **Ano**
3. Analise:
   - Indicadores financeiros
   - Gráficos de entradas e saídas
   - Saldo das contas

#### Consultar DRE
1. Vá em **"Demonstrativo de Resultado"**
2. Selecione **Mês** e **Ano**
3. Visualize a DRE completa

#### Criar Planejamento
1. Vá em **"Planejamento Orçamentário"**
2. Clique em **"Novo Planejamento"**
3. Selecione período e plano de contas
4. Defina o valor planejado

---

## 📁 Estrutura do Projeto

```
/app/
├── backend/
│   ├── server.py           # Aplicação principal FastAPI
│   ├── database.py         # Conexão com Supabase
│   ├── auth.py             # Autenticação e JWT
│   ├── models.py           # Schemas Pydantic
│   ├── requirements.txt    # Dependências Python
│   └── .env               # Variáveis de ambiente
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── MovimentacoesPage.jsx
│   │   │   ├── DREPage.jsx
│   │   │   ├── PlanejamentoPage.jsx
│   │   │   ├── RelatoriosPage.jsx
│   │   │   └── ConfiguracoesPage.jsx
│   │   ├── services/
│   │   │   └── api.js      # Cliente API
│   │   ├── App.jsx         # Componente principal
│   │   └── main.jsx        # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env
│
└── scripts/
    └── supabase_tables.sql # Script de criação das tabelas
```

---

## 🚀 Deploy

### Opção 1: Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
1. Faça push do código para GitHub
2. Conecte o repositório no Vercel
3. Configure:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `yarn build`
   - Output Directory: `dist`
4. Adicione variável de ambiente:
   - `VITE_BACKEND_URL`: URL do backend no Railway

**Backend (Railway):**
1. Conecte o repositório no Railway
2. Configure:
   - Root Directory: `backend`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
3. Adicione variáveis de ambiente:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `JWT_SECRET`

### Opção 2: Deploy Completo no Emergent

O sistema já está rodando no Emergent! Para salvar no GitHub:

1. Clique no botão **"Save to GitHub"** no chat
2. O código será enviado para seu repositório
3. Configure o deploy no Vercel/Railway conforme instruções acima

---

## 🔐 Segurança

- **Senhas**: Hash com bcrypt
- **Autenticação**: JWT com expiração
- **API**: Proteção de rotas com middleware
- **Database**: Row-level security no Supabase (recomendado configurar)
- **CORS**: Configurado para produção

---

## 🐛 Troubleshooting

### Backend não inicia
```bash
# Verificar logs
tail -f /var/log/supervisor/backend.err.log

# Reinstalar dependências
cd /app/backend
pip install -r requirements.txt

# Reiniciar serviço
sudo supervisorctl restart backend
```

### Frontend não carrega
```bash
# Verificar logs
tail -f /var/log/supervisor/frontend.err.log

# Reinstalar dependências
cd /app/frontend
yarn install

# Reiniciar serviço
sudo supervisorctl restart frontend
```

### Erro de conexão com Supabase
- Verifique se a URL e API Key estão corretas
- Confirme que as tabelas foram criadas
- Teste a conexão no SQL Editor do Supabase

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique a seção de Troubleshooting
2. Revise os logs do backend e frontend
3. Consulte a documentação do Supabase: https://supabase.com/docs

---

## 📝 Próximos Passos Recomendados

1. ✅ **Adicionar página de gerenciamento de Contas Bancárias**
2. ✅ **Adicionar página de gerenciamento de Plano de Contas**
3. ✅ **Implementar relatórios avançados**
4. ✅ **Adicionar exportação para Excel/PDF**
5. ✅ **Implementar notificações**
6. ✅ **Adicionar gráfico de evolução do saldo**
7. ✅ **Implementar comparação de períodos**
8. ✅ **Adicionar suporte a múltiplas moedas**

---

## 📜 Licença

Este projeto foi desenvolvido como um sistema personalizado para gestão financeira industrial.

---

**Desenvolvido com ❤️ usando React, FastAPI e Supabase**
