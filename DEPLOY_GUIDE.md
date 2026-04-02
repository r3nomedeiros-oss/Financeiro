# Guia de Deploy - Sistema Financeiro Industrial

## 1. Deploy do Backend no Railway

### Passo 1: Criar projeto no Railway
1. Acesse [railway.app](https://railway.app)
2. Clique em "New Project" → "Deploy from GitHub"
3. Selecione seu repositório

### Passo 2: Configurar variáveis de ambiente
No painel do Railway, vá em **Variables** e adicione:

```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon-aqui
JWT_SECRET=sua_chave_secreta_jwt_2025_super_segura
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
PORT=8001
```

### Passo 3: Configurar o build
O Railway deve detectar automaticamente o `railway.toml`. Se não:
- Root Directory: `/backend`
- Start Command: `python -m uvicorn server:app --host 0.0.0.0 --port $PORT`

### Passo 4: Obter URL do backend
Após o deploy, copie a URL gerada (ex: `https://seu-app.up.railway.app`)

---

## 2. Deploy do Frontend no Vercel

### Passo 1: Criar projeto no Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Add New" → "Project"
3. Importe seu repositório do GitHub

### Passo 2: Configurar o build
- Framework Preset: **Vite**
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

### Passo 3: Configurar variáveis de ambiente
Em **Settings → Environment Variables**, adicione:

```
VITE_BACKEND_URL=https://seu-app.up.railway.app
```

⚠️ **IMPORTANTE**: Substitua pela URL real do seu backend no Railway!

### Passo 4: Fazer redeploy
Após adicionar a variável, clique em "Redeploy" para aplicar.

---

## Verificação

1. Acesse a URL do Vercel
2. Faça login com: `admin@sfi.com` / `admin123`
3. Teste salvar um planejamento

Se der erro, verifique:
- Console do navegador (F12 → Console)
- Logs do Railway
