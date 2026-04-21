# Deploy no Vercel — Guia Definitivo (100% gratuito)

Arquitetura final:
- **Frontend (Vite)** + **Backend (FastAPI Serverless)** no mesmo projeto Vercel
- **Database**: Supabase (já existe, não muda)

---

## 1. Configuração no painel Vercel

### 1.1 Settings → General → Root Directory
**DEIXE EM BRANCO** (apague o "frontend" que estava lá). Depois clique em **Save**.

> Motivo: o `vercel.json` na raiz é quem define o build. Com Root Directory = frontend, o Vercel nem vê a pasta `/api` nem o `vercel.json`.

### 1.2 Settings → General → Framework Preset
Deixe como **Other** (ou "No preset"). O `vercel.json` já cuida de tudo.

### 1.3 Settings → Environment Variables
Adicione as 5 variáveis abaixo (Production + Preview + Development):

| Nome | Valor |
|---|---|
| `SUPABASE_URL` | `https://enpvmhcxlcvapplcuwoa.supabase.co` |
| `SUPABASE_KEY` | `<sua anon key do Supabase>` |
| `JWT_SECRET` | `sua_chave_secreta_jwt_financeiro_2025_super_segura` |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRATION_HOURS` | `24` |

> ⚠️ **Não** precisa definir `VITE_BACKEND_URL` — frontend e backend ficam no mesmo domínio.

### 1.4 Deployments → Redeploy
Clique em **Redeploy** no último deploy. Marque **"Use existing Build Cache" = OFF** para garantir build limpo.

---

## 2. O que foi corrigido no código

- `vercel.json` → adicionada config de `functions` com `includeFiles: "backend/**"` para o serverless Python conseguir importar `backend/server.py`.
- `api/index.py` → limpo, importa o `app` do FastAPI via `sys.path`.
- `api/requirements.txt` → versões fixadas compatíveis com Vercel Python 3.12.

---

## 3. Teste pós-deploy

1. Abra a URL do Vercel
2. Chame `https://<sua-url>.vercel.app/api/` (deve retornar JSON do FastAPI ou 404 esperado)
3. Faça login na tela → se carregar o dashboard, está tudo funcionando

### Se der erro 500 na API:
- Veja os logs em Vercel → Deployment → Functions → `api/index.py`
- Causa mais comum: alguma env var faltando

---

## 4. Arquivos que podem ser deletados (eram do Railway)
- `railway.json`
- `railway.toml`
- `Procfile`

Já foram removidos neste repositório.
