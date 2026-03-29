# 🚀 GUIA RÁPIDO - Sistema Financeiro Industrial

## ✅ Status do Sistema

### Serviços Rodando:
- ✅ **Backend (FastAPI)**: http://localhost:8001
- ✅ **Frontend (React)**: http://localhost:3000
- ✅ **MongoDB**: Ativo
- ✅ **Supabase**: Conectado

### Acesso ao Sistema:
🌐 **URL Principal**: https://session-404-bug.preview.emergentagent.com

---

## 🔴 AÇÃO OBRIGATÓRIA ANTES DE USAR

### 1. Criar Tabelas no Supabase

**VOCÊ PRECISA FAZER ISSO AGORA:**

1. Acesse: https://supabase.com
2. Entre no seu projeto
3. Vá em: **SQL Editor** → **New Query**
4. Abra o arquivo: `/app/scripts/supabase_tables.sql`
5. Copie TODO o conteúdo
6. Cole no SQL Editor
7. Clique em **RUN** ou **Ctrl+Enter**
8. Aguarde a mensagem de sucesso

✅ **Verificação**: Execute esta query no SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'contas_bancarias', 'plano_contas', 'movimentacoes', 'planejamento_orcamentario')
ORDER BY table_name;
```
**Resultado esperado**: 5 tabelas

---

## 📋 Passo a Passo Inicial

### Passo 1: Acessar o Sistema
1. Abra: https://session-404-bug.preview.emergentagent.com
2. Você verá a tela de login

### Passo 2: Criar sua Conta
1. Clique na aba **"Cadastro"**
2. Preencha:
   - Nome completo
   - Email
   - Senha
3. Clique em **"Criar Conta"**
4. Você será logado automaticamente

### Passo 3: Anotar seu User ID (IMPORTANTE!)

Você precisará do seu `user_id` para configurar dados iniciais.

**Como pegar:**

**Opção A - Via Supabase SQL Editor:**
```sql
SELECT id, email, nome FROM users WHERE email = 'seu@email.com';
```

**Opção B - Via API (no terminal):**
```bash
# 1. Faça login (substitua email e senha)
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"suasenha"}'

# Resultado terá "user": {"id": "xxxx-xxxx-xxxx"}
```

### Passo 4: Criar Contas Bancárias

No **Supabase SQL Editor**, execute (substitua `SEU_USER_ID`):

```sql
INSERT INTO contas_bancarias (id, user_id, nome, saldo_inicial, saldo_atual) VALUES
(gen_random_uuid(), 'SEU_USER_ID', 'Banco Bradesco', 50000.00, 50000.00),
(gen_random_uuid(), 'SEU_USER_ID', 'Banco Itaú', 30000.00, 30000.00),
(gen_random_uuid(), 'SEU_USER_ID', 'Caixa Empresarial', 100000.00, 100000.00);
```

### Passo 5: Criar Plano de Contas

No **Supabase SQL Editor**, execute (substitua `SEU_USER_ID`):

```sql
INSERT INTO plano_contas (id, user_id, nome, tipo, categoria) VALUES
-- RECEITAS
(gen_random_uuid(), 'SEU_USER_ID', 'Vendas de Produtos', 'receita', 'Receitas Operacionais'),
(gen_random_uuid(), 'SEU_USER_ID', 'Prestação de Serviços', 'receita', 'Receitas Operacionais'),
(gen_random_uuid(), 'SEU_USER_ID', 'Receitas Financeiras', 'receita', 'Receitas Não Operacionais'),

-- DESPESAS
(gen_random_uuid(), 'SEU_USER_ID', 'Matéria Prima', 'despesa', 'Custos Diretos'),
(gen_random_uuid(), 'SEU_USER_ID', 'Mão de Obra Direta', 'despesa', 'Custos Diretos'),
(gen_random_uuid(), 'SEU_USER_ID', 'Salários', 'despesa', 'Despesas Administrativas'),
(gen_random_uuid(), 'SEU_USER_ID', 'Energia Elétrica', 'despesa', 'Despesas Operacionais'),
(gen_random_uuid(), 'SEU_USER_ID', 'Aluguel', 'despesa', 'Despesas Operacionais'),
(gen_random_uuid(), 'SEU_USER_ID', 'Marketing', 'despesa', 'Despesas Comerciais'),
(gen_random_uuid(), 'SEU_USER_ID', 'Impostos', 'despesa', 'Impostos');
```

### Passo 6: Recarregar o Sistema
1. Faça **logout**
2. Faça **login** novamente
3. Agora você verá tudo funcionando!

---

## 🎯 Como Usar

### Dashboard
- **Filtrar por período**: Use os seletores de mês e ano
- **Ver indicadores**: Receita, Margem, Lucro Operacional, Lucro Líquido
- **Analisar gráficos**: Entradas x Saídas, distribuição por plano de contas

### Movimentação Financeira
1. Clique em **"Nova Movimentação"**
2. Preencha todos os campos
3. Clique em **"Salvar"**
4. O saldo da conta será atualizado automaticamente

### DRE Gerencial
1. Selecione **mês e ano**
2. Visualize a DRE completa com margens

### Planejamento Orçamentário
1. Clique em **"Novo Planejamento"**
2. Selecione período e plano de contas
3. Defina valor planejado

---

## 🔧 Arquivos Importantes

- **Backend**: `/app/backend/server.py`
- **Frontend**: `/app/frontend/src/App.jsx`
- **SQL Script**: `/app/scripts/supabase_tables.sql`
- **Documentação Completa**: `/app/README_SISTEMA.md`

---

## 🐛 Problemas Comuns

### "Nenhuma movimentação registrada"
➡️ **Solução**: Crie contas bancárias e plano de contas primeiro (Passos 4 e 5)

### "Erro ao carregar dados"
➡️ **Solução**: Verifique se as tabelas foram criadas no Supabase

### "Token inválido"
➡️ **Solução**: Faça logout e login novamente

---

## 🎉 Pronto!

Seu sistema está **100% funcional** e pronto para uso!

**Próximos Passos:**
1. ✅ Executar SQL no Supabase
2. ✅ Criar sua conta
3. ✅ Configurar contas bancárias e plano de contas
4. ✅ Começar a usar!

---

**💡 Dica**: Leia o `/app/README_SISTEMA.md` para documentação completa!
