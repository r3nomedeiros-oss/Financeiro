-- ============================================
-- SCRIPT SQL PARA CRIAR TABELAS NO SUPABASE
-- Sistema Financeiro Industrial
-- ============================================

-- IMPORTANTE: Execute este script no SQL Editor do Supabase
-- Acesse: Seu Projeto > SQL Editor > New Query
-- Cole este código e clique em RUN

-- ============================================
-- 1. TABELA DE USUÁRIOS
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- 2. TABELA DE CONTAS BANCÁRIAS
-- ============================================

CREATE TABLE IF NOT EXISTS contas_bancarias (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    saldo_inicial DECIMAL(15, 2) DEFAULT 0,
    saldo_atual DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contas_user_id ON contas_bancarias(user_id);

-- ============================================
-- 3. TABELA DE PLANO DE CONTAS
-- ============================================

CREATE TABLE IF NOT EXISTS plano_contas (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    categoria VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plano_contas_user_id ON plano_contas(user_id);
CREATE INDEX idx_plano_contas_tipo ON plano_contas(tipo);

-- ============================================
-- 4. TABELA DE MOVIMENTAÇÕES FINANCEIRAS
-- ============================================

CREATE TABLE IF NOT EXISTS movimentacoes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    plano_contas_id UUID NOT NULL REFERENCES plano_contas(id) ON DELETE RESTRICT,
    complemento TEXT,
    conta_bancaria_id UUID NOT NULL REFERENCES contas_bancarias(id) ON DELETE RESTRICT,
    valor DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_movimentacoes_user_id ON movimentacoes(user_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes(data);
CREATE INDEX idx_movimentacoes_tipo ON movimentacoes(tipo);
CREATE INDEX idx_movimentacoes_conta ON movimentacoes(conta_bancaria_id);

-- ============================================
-- 5. TABELA DE PLANEJAMENTO ORÇAMENTÁRIO
-- ============================================

CREATE TABLE IF NOT EXISTS planejamento_orcamentario (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL CHECK (ano >= 2000 AND ano <= 2100),
    plano_contas_id UUID NOT NULL REFERENCES plano_contas(id) ON DELETE CASCADE,
    valor_planejado DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, mes, ano, plano_contas_id)
);

CREATE INDEX idx_planejamento_user_id ON planejamento_orcamentario(user_id);
CREATE INDEX idx_planejamento_periodo ON planejamento_orcamentario(ano, mes);

-- ============================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- ============================================

-- Você pode descomentar abaixo para inserir dados de exemplo
-- Mas primeiro você precisa criar um usuário através da aplicação

/*
-- Exemplo de plano de contas padrão (substitua 'USER_ID_AQUI' pelo ID do seu usuário)

INSERT INTO plano_contas (id, user_id, nome, tipo, categoria) VALUES
(gen_random_uuid(), 'USER_ID_AQUI', 'Vendas de Produtos', 'receita', 'Receitas Operacionais'),
(gen_random_uuid(), 'USER_ID_AQUI', 'Prestação de Serviços', 'receita', 'Receitas Operacionais'),
(gen_random_uuid(), 'USER_ID_AQUI', 'Matéria Prima', 'despesa', 'Custos'),
(gen_random_uuid(), 'USER_ID_AQUI', 'Mão de Obra', 'despesa', 'Custos'),
(gen_random_uuid(), 'USER_ID_AQUI', 'Salários', 'despesa', 'Despesas Administrativas'),
(gen_random_uuid(), 'USER_ID_AQUI', 'Energia Elétrica', 'despesa', 'Despesas Operacionais'),
(gen_random_uuid(), 'USER_ID_AQUI', 'Aluguel', 'despesa', 'Despesas Operacionais'),
(gen_random_uuid(), 'USER_ID_AQUI', 'Marketing', 'despesa', 'Despesas Comerciais');
*/

-- ============================================
-- VERIFICAR CRIAÇÃO DAS TABELAS
-- ============================================

-- Execute esta query para verificar se todas as tabelas foram criadas:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'contas_bancarias', 'plano_contas', 'movimentacoes', 'planejamento_orcamentario')
ORDER BY table_name;

-- Deve retornar 5 tabelas

-- ============================================
-- FIM DO SCRIPT
-- ============================================
