from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import uuid
from datetime import datetime, timedelta
from database import get_supabase
from auth import hash_password, verify_password, create_access_token, decode_access_token
from models import (
    UserRegister, UserLogin, Token,
    ContaBancariaCreate, ContaBancariaUpdate,
    PlanoContasCreate, PlanoContasUpdate,
    MovimentacaoCreate, MovimentacaoUpdate,
    PlanejamentoCreate, PlanejamentoUpdate
)

app = FastAPI(title="Sistema Financeiro Industrial")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependência para pegar user_id do token
async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    return user_id

# ============================================
# ROTAS DE AUTENTICAÇÃO
# ============================================

@app.post("/api/auth/register", response_model=Token)
async def register(user: UserRegister):
    supabase = get_supabase()
    
    # Verificar se email já existe
    result = supabase.table("users").select("*").eq("email", user.email).execute()
    if result.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Criar usuário
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(user.password)
    
    new_user = {
        "id": user_id,
        "email": user.email,
        "password_hash": hashed_pwd,
        "nome": user.nome,
        "created_at": datetime.utcnow().isoformat()
    }
    
    supabase.table("users").insert(new_user).execute()
    
    # Criar token
    token = create_access_token({"sub": user_id, "email": user.email})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "email": user.email, "nome": user.nome}
    }

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    supabase = get_supabase()
    
    # Buscar usuário
    result = supabase.table("users").select("*").eq("email", credentials.email).execute()
    
    if not result.data:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    user = result.data[0]
    
    # Verificar senha
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    # Criar token
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "nome": user["nome"]}
    }

@app.get("/api/auth/me")
async def get_me(user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table("users").select("id, email, nome").eq("id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return result.data[0]

# ============================================
# ROTAS DE CONTAS BANCÁRIAS
# ============================================

@app.get("/api/contas-bancarias")
async def get_contas_bancarias(user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table("contas_bancarias").select("*").eq("user_id", user_id).order("nome").execute()
    return result.data

@app.post("/api/contas-bancarias")
async def create_conta_bancaria(conta: ContaBancariaCreate, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    nova_conta = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "nome": conta.nome,
        "saldo_inicial": conta.saldo_inicial,
        "saldo_atual": conta.saldo_inicial,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = supabase.table("contas_bancarias").insert(nova_conta).execute()
    return result.data[0]

@app.put("/api/contas-bancarias/{conta_id}")
async def update_conta_bancaria(conta_id: str, conta: ContaBancariaUpdate, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Verificar propriedade
    result = supabase.table("contas_bancarias").select("*").eq("id", conta_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    update_data = conta.dict(exclude_unset=True)
    result = supabase.table("contas_bancarias").update(update_data).eq("id", conta_id).execute()
    return result.data[0]

@app.delete("/api/contas-bancarias/{conta_id}")
async def delete_conta_bancaria(conta_id: str, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Verificar propriedade
    result = supabase.table("contas_bancarias").select("*").eq("id", conta_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    supabase.table("contas_bancarias").delete().eq("id", conta_id).execute()
    return {"message": "Conta excluída com sucesso"}

# ============================================
# ROTAS DE PLANO DE CONTAS
# ============================================

@app.get("/api/plano-contas")
async def get_plano_contas(user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table("plano_contas").select("*").eq("user_id", user_id).order("tipo, nome").execute()
    return result.data

@app.post("/api/plano-contas")
async def create_plano_contas(plano: PlanoContasCreate, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    novo_plano = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "nome": plano.nome,
        "tipo": plano.tipo,
        "categoria": plano.categoria,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = supabase.table("plano_contas").insert(novo_plano).execute()
    return result.data[0]

@app.put("/api/plano-contas/{plano_id}")
async def update_plano_contas(plano_id: str, plano: PlanoContasUpdate, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Verificar propriedade
    result = supabase.table("plano_contas").select("*").eq("id", plano_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Plano de contas não encontrado")
    
    update_data = plano.dict(exclude_unset=True)
    result = supabase.table("plano_contas").update(update_data).eq("id", plano_id).execute()
    return result.data[0]

@app.delete("/api/plano-contas/{plano_id}")
async def delete_plano_contas(plano_id: str, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Verificar propriedade
    result = supabase.table("plano_contas").select("*").eq("id", plano_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Plano de contas não encontrado")
    
    supabase.table("plano_contas").delete().eq("id", plano_id).execute()
    return {"message": "Plano de contas excluído com sucesso"}

# ============================================
# ROTAS DE MOVIMENTAÇÕES
# ============================================

@app.get("/api/movimentacoes")
async def get_movimentacoes(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    user_id: str = Depends(get_current_user)
):
    supabase = get_supabase()
    query = supabase.table("movimentacoes").select("*, plano_contas(*), contas_bancarias:conta_bancaria_id(*)").eq("user_id", user_id)
    
    # Aplicar filtros se fornecidos
    if mes and ano:
        # Filtrar por mês e ano
        data_inicio = f"{ano}-{mes:02d}-01"
        if mes == 12:
            data_fim = f"{ano + 1}-01-01"
        else:
            data_fim = f"{ano}-{mes + 1:02d}-01"
        
        query = query.gte("data", data_inicio).lt("data", data_fim)
    elif ano:
        query = query.gte("data", f"{ano}-01-01").lt("data", f"{ano + 1}-01-01")
    
    result = query.order("data", desc=True).execute()
    return result.data

@app.post("/api/movimentacoes")
async def create_movimentacao(mov: MovimentacaoCreate, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Buscar conta bancária para atualizar saldo
    conta_result = supabase.table("contas_bancarias").select("*").eq("id", mov.conta_bancaria_id).eq("user_id", user_id).execute()
    if not conta_result.data:
        raise HTTPException(status_code=404, detail="Conta bancária não encontrada")
    
    conta = conta_result.data[0]
    
    nova_mov = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "data": mov.data,
        "tipo": mov.tipo,
        "plano_contas_id": mov.plano_contas_id,
        "complemento": mov.complemento,
        "conta_bancaria_id": mov.conta_bancaria_id,
        "valor": mov.valor,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Atualizar saldo da conta
    if mov.tipo == "entrada":
        novo_saldo = conta["saldo_atual"] + mov.valor
    else:
        novo_saldo = conta["saldo_atual"] - mov.valor
    
    supabase.table("contas_bancarias").update({"saldo_atual": novo_saldo}).eq("id", mov.conta_bancaria_id).execute()
    
    result = supabase.table("movimentacoes").insert(nova_mov).execute()
    return result.data[0]

@app.put("/api/movimentacoes/{mov_id}")
async def update_movimentacao(mov_id: str, mov: MovimentacaoUpdate, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Buscar movimentação original
    result = supabase.table("movimentacoes").select("*").eq("id", mov_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada")
    
    mov_original = result.data[0]
    
    # Se mudou valor ou tipo, atualizar saldo
    if mov.valor is not None or mov.tipo is not None:
        conta_result = supabase.table("contas_bancarias").select("*").eq("id", mov_original["conta_bancaria_id"]).execute()
        conta = conta_result.data[0]
        
        # Reverter movimentação original
        if mov_original["tipo"] == "entrada":
            saldo = conta["saldo_atual"] - mov_original["valor"]
        else:
            saldo = conta["saldo_atual"] + mov_original["valor"]
        
        # Aplicar nova movimentação
        novo_tipo = mov.tipo if mov.tipo else mov_original["tipo"]
        novo_valor = mov.valor if mov.valor is not None else mov_original["valor"]
        
        if novo_tipo == "entrada":
            saldo += novo_valor
        else:
            saldo -= novo_valor
        
        supabase.table("contas_bancarias").update({"saldo_atual": saldo}).eq("id", mov_original["conta_bancaria_id"]).execute()
    
    update_data = mov.dict(exclude_unset=True)
    result = supabase.table("movimentacoes").update(update_data).eq("id", mov_id).execute()
    return result.data[0]

@app.delete("/api/movimentacoes/{mov_id}")
async def delete_movimentacao(mov_id: str, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Buscar movimentação
    result = supabase.table("movimentacoes").select("*").eq("id", mov_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada")
    
    mov = result.data[0]
    
    # Reverter saldo da conta
    conta_result = supabase.table("contas_bancarias").select("*").eq("id", mov["conta_bancaria_id"]).execute()
    conta = conta_result.data[0]
    
    if mov["tipo"] == "entrada":
        novo_saldo = conta["saldo_atual"] - mov["valor"]
    else:
        novo_saldo = conta["saldo_atual"] + mov["valor"]
    
    supabase.table("contas_bancarias").update({"saldo_atual": novo_saldo}).eq("id", mov["conta_bancaria_id"]).execute()
    
    supabase.table("movimentacoes").delete().eq("id", mov_id).execute()
    return {"message": "Movimentação excluída com sucesso"}

# ============================================
# ROTAS DE DASHBOARD
# ============================================

@app.get("/api/dashboard/dados")
async def get_dashboard_dados(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    user_id: str = Depends(get_current_user)
):
    supabase = get_supabase()
    
    # Buscar movimentações com filtros
    query = supabase.table("movimentacoes").select("*, plano_contas(*)").eq("user_id", user_id)
    
    if mes and ano:
        data_inicio = f"{ano}-{mes:02d}-01"
        if mes == 12:
            data_fim = f"{ano + 1}-01-01"
        else:
            data_fim = f"{ano}-{mes + 1:02d}-01"
        query = query.gte("data", data_inicio).lt("data", data_fim)
    elif ano:
        query = query.gte("data", f"{ano}-01-01").lt("data", f"{ano + 1}-01-01")
    
    movimentacoes = query.execute().data
    
    # Calcular totais
    total_entradas = sum(m["valor"] for m in movimentacoes if m["tipo"] == "entrada")
    total_saidas = sum(m["valor"] for m in movimentacoes if m["tipo"] == "saida")
    
    # Agrupar por plano de contas
    entradas_por_plano = {}
    saidas_por_plano = {}
    
    for m in movimentacoes:
        plano_nome = m["plano_contas"]["nome"] if m.get("plano_contas") else "Sem categoria"
        
        if m["tipo"] == "entrada":
            entradas_por_plano[plano_nome] = entradas_por_plano.get(plano_nome, 0) + m["valor"]
        else:
            saidas_por_plano[plano_nome] = saidas_por_plano.get(plano_nome, 0) + m["valor"]
    
    # Buscar saldos das contas
    contas = supabase.table("contas_bancarias").select("*").eq("user_id", user_id).execute().data
    
    # Calcular indicadores
    receita = total_entradas
    custos = total_saidas * 0.4  # Exemplo: 40% das saídas são custos
    lucro_bruto = receita - custos
    despesas = total_saidas * 0.6  # Exemplo: 60% das saídas são despesas
    lucro_operacional = lucro_bruto - despesas
    impostos = lucro_operacional * 0.15  # Exemplo: 15% de impostos
    lucro_liquido = lucro_operacional - impostos
    
    margem_contribuicao = lucro_bruto
    margem_contribuicao_pct = (margem_contribuicao / receita * 100) if receita > 0 else 0
    lucro_operacional_pct = (lucro_operacional / receita * 100) if receita > 0 else 0
    lucro_liquido_pct = (lucro_liquido / receita * 100) if receita > 0 else 0
    
    return {
        "total_entradas": total_entradas,
        "total_saidas": total_saidas,
        "entradas_por_plano": entradas_por_plano,
        "saidas_por_plano": saidas_por_plano,
        "contas": contas,
        "indicadores": {
            "receita": receita,
            "margem_contribuicao": margem_contribuicao,
            "margem_contribuicao_pct": margem_contribuicao_pct,
            "lucro_operacional": lucro_operacional,
            "lucro_operacional_pct": lucro_operacional_pct,
            "lucro_liquido": lucro_liquido,
            "lucro_liquido_pct": lucro_liquido_pct
        }
    }

# ============================================
# ROTAS DE DRE
# ============================================

@app.get("/api/dre/{mes}/{ano}")
async def get_dre(mes: int, ano: int, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Buscar movimentações do mês
    data_inicio = f"{ano}-{mes:02d}-01"
    if mes == 12:
        data_fim = f"{ano + 1}-01-01"
    else:
        data_fim = f"{ano}-{mes + 1:02d}-01"
    
    movimentacoes = supabase.table("movimentacoes").select("*, plano_contas(*)").eq("user_id", user_id).gte("data", data_inicio).lt("data", data_fim).execute().data
    
    # Calcular DRE
    receitas = sum(m["valor"] for m in movimentacoes if m["tipo"] == "entrada")
    
    # Separar custos e despesas (simplificado)
    total_saidas = sum(m["valor"] for m in movimentacoes if m["tipo"] == "saida")
    custos = total_saidas * 0.4  # 40% são custos
    despesas_operacionais = total_saidas * 0.6  # 60% são despesas
    
    lucro_bruto = receitas - custos
    lucro_operacional = lucro_bruto - despesas_operacionais
    impostos = lucro_operacional * 0.15 if lucro_operacional > 0 else 0
    lucro_liquido = lucro_operacional - impostos
    
    return {
        "mes": mes,
        "ano": ano,
        "receitas": receitas,
        "custos": custos,
        "lucro_bruto": lucro_bruto,
        "despesas_operacionais": despesas_operacionais,
        "lucro_operacional": lucro_operacional,
        "impostos": impostos,
        "lucro_liquido": lucro_liquido,
        "margem_bruta_pct": (lucro_bruto / receitas * 100) if receitas > 0 else 0,
        "margem_operacional_pct": (lucro_operacional / receitas * 100) if receitas > 0 else 0,
        "margem_liquida_pct": (lucro_liquido / receitas * 100) if receitas > 0 else 0
    }

# ============================================
# ROTAS DE PLANEJAMENTO ORÇAMENTÁRIO
# ============================================

@app.get("/api/planejamento")
async def get_planejamento(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    user_id: str = Depends(get_current_user)
):
    supabase = get_supabase()
    query = supabase.table("planejamento_orcamentario").select("*, plano_contas(*)").eq("user_id", user_id)
    
    if mes:
        query = query.eq("mes", mes)
    if ano:
        query = query.eq("ano", ano)
    
    result = query.order("ano, mes").execute()
    return result.data

@app.post("/api/planejamento")
async def create_planejamento(plan: PlanejamentoCreate, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Verificar se já existe planejamento para esse período e plano de contas
    existing = supabase.table("planejamento_orcamentario").select("*").eq("user_id", user_id).eq("mes", plan.mes).eq("ano", plan.ano).eq("plano_contas_id", plan.plano_contas_id).execute()
    
    if existing.data:
        raise HTTPException(status_code=400, detail="Já existe planejamento para este período e plano de contas")
    
    novo_plan = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "mes": plan.mes,
        "ano": plan.ano,
        "plano_contas_id": plan.plano_contas_id,
        "valor_planejado": plan.valor_planejado,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = supabase.table("planejamento_orcamentario").insert(novo_plan).execute()
    return result.data[0]

@app.put("/api/planejamento/{plan_id}")
async def update_planejamento(plan_id: str, plan: PlanejamentoUpdate, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Verificar propriedade
    result = supabase.table("planejamento_orcamentario").select("*").eq("id", plan_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Planejamento não encontrado")
    
    update_data = plan.dict(exclude_unset=True)
    result = supabase.table("planejamento_orcamentario").update(update_data).eq("id", plan_id).execute()
    return result.data[0]

@app.delete("/api/planejamento/{plan_id}")
async def delete_planejamento(plan_id: str, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Verificar propriedade
    result = supabase.table("planejamento_orcamentario").select("*").eq("id", plan_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Planejamento não encontrado")
    
    supabase.table("planejamento_orcamentario").delete().eq("id", plan_id).execute()
    return {"message": "Planejamento excluído com sucesso"}

@app.get("/")
async def root():
    return {"message": "Sistema Financeiro Industrial API", "status": "online"}

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
