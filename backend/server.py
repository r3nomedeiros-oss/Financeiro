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
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro no login: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

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
# ROTAS DE PLANO DE CONTAS - HIERÁRQUICO
# ============================================

# Estrutura fixa de Categorias DRE (Nível 1 - Imutável)
CATEGORIAS_DRE = {
    "receita_bruta": {"nome": "(+) Receita Bruta", "tipo": "receita", "cor": "cyan"},
    "deducoes_vendas": {"nome": "(-) Deduções Sobre Vendas", "tipo": "despesa", "cor": "red"},
    "custos_variaveis": {"nome": "(-) Custos Variáveis", "tipo": "despesa", "cor": "red"},
    "custos_fixos": {"nome": "(-) Custos Fixos", "tipo": "despesa", "cor": "red"},
    "resultado_nao_operacional": {"nome": "Resultado Não Operacional", "tipo": "misto", "cor": "gray"},
}

@app.get("/api/categorias-dre")
async def get_categorias_dre():
    """Retorna as categorias fixas do DRE (Nível 1)"""
    return CATEGORIAS_DRE

@app.get("/api/plano-contas")
async def get_plano_contas(user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table("plano_contas").select("*").eq("user_id", user_id).order("categoria, nome").execute()
    return result.data

@app.get("/api/plano-contas/hierarquico")
async def get_plano_contas_hierarquico(user_id: str = Depends(get_current_user)):
    """Retorna plano de contas em estrutura de árvore hierárquica"""
    supabase = get_supabase()
    result = supabase.table("plano_contas").select("*").eq("user_id", user_id).order("categoria, nome").execute()
    planos = result.data
    
    # Construir árvore hierárquica
    # Formato da categoria: "{categoria_dre}|{nivel}|{parent_id}"
    # Nível 2: subcategoria (parent_id vazio)
    # Nível 3: item (parent_id = id da subcategoria)
    
    arvore = {}
    
    # Inicializar com categorias fixas
    for cat_id, cat_info in CATEGORIAS_DRE.items():
        arvore[cat_id] = {
            "id": cat_id,
            "nome": cat_info["nome"],
            "tipo": cat_info["tipo"],
            "cor": cat_info["cor"],
            "nivel": 1,
            "is_categoria_fixa": True,
            "subcategorias": []
        }
    
    # Separar subcategorias (nível 2) e itens (nível 3)
    subcategorias = {}
    itens = []
    
    for p in planos:
        categoria = p.get("categoria", "")
        if not categoria:
            continue
            
        partes = categoria.split("|")
        if len(partes) >= 2:
            cat_dre = partes[0]
            nivel = partes[1]
            parent_id = partes[2] if len(partes) > 2 else ""
            
            if nivel == "2":
                # Subcategoria
                subcategorias[p["id"]] = {
                    **p,
                    "categoria": cat_dre,
                    "nivel": 2,
                    "itens": []
                }
            elif nivel == "3":
                # Item
                itens.append({
                    **p,
                    "categoria": cat_dre,
                    "nivel": 3,
                    "parent_id": parent_id
                })
    
    # Adicionar itens às subcategorias
    for item in itens:
        parent_id = item.get("parent_id", "")
        if parent_id and parent_id in subcategorias:
            subcategorias[parent_id]["itens"].append(item)
    
    # Adicionar subcategorias às categorias do DRE
    for subcat_id, subcat in subcategorias.items():
        cat_dre = subcat["categoria"]
        if cat_dre in arvore:
            arvore[cat_dre]["subcategorias"].append(subcat)
    
    return arvore

@app.post("/api/plano-contas")
async def create_plano_contas(plano: PlanoContasCreate, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Construir categoria no formato: "{categoria_dre}|{nivel}|{parent_id}"
    nivel = plano.nivel if plano.nivel else 2
    parent_id = plano.parent_id if plano.parent_id else ""
    categoria_dre = plano.categoria if plano.categoria else ""
    
    categoria_code = f"{categoria_dre}|{nivel}|{parent_id}"
    
    novo_plano = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "nome": plano.nome,
        "tipo": plano.tipo,
        "categoria": categoria_code,
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
    
    # Verificar se tem filhos (itens vinculados a esta subcategoria)
    # Buscar todos que tem este id como parent no campo categoria
    all_planos = supabase.table("plano_contas").select("id, categoria").eq("user_id", user_id).execute()
    
    for p in all_planos.data:
        cat = p.get("categoria", "")
        if f"|{plano_id}" in cat:  # Este plano é pai de outro
            raise HTTPException(status_code=400, detail="Não é possível excluir. Existem itens vinculados a esta subcategoria.")
    
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

# Estrutura padrão do DRE baseada na imagem do Excel
DRE_ESTRUTURA = [
    {"codigo": "1", "nome": "Receita com Vendas", "grupo": "receita_bruta", "tipo": "receita"},
    {"codigo": "2", "nome": "Impostos Sobre Vendas", "grupo": "deducoes_vendas", "tipo": "despesa"},
    {"codigo": "3", "nome": "Outras Deduções", "grupo": "deducoes_vendas", "tipo": "despesa"},
    {"codigo": "4", "nome": "Custos com Fornecedores", "grupo": "custos_variaveis", "tipo": "despesa"},
    {"codigo": "21", "nome": "Custos com Vendas", "grupo": "custos_variaveis", "tipo": "despesa"},
    {"codigo": "22", "nome": "Custos com Produção", "grupo": "custos_variaveis", "tipo": "despesa"},
    {"codigo": "5", "nome": "Gastos com Pessoal", "grupo": "custos_fixos", "tipo": "despesa"},
    {"codigo": "6", "nome": "Gastos com Ocupação", "grupo": "custos_fixos", "tipo": "despesa"},
    {"codigo": "7", "nome": "Gastos com Serviços de Terceiros", "grupo": "custos_fixos", "tipo": "despesa"},
    {"codigo": "16", "nome": "Gastos Operacionais", "grupo": "custos_fixos", "tipo": "despesa"},
    {"codigo": "17", "nome": "Gastos Financeiros", "grupo": "custos_fixos", "tipo": "despesa"},
    {"codigo": "18", "nome": "Gastos com Veículos", "grupo": "custos_fixos", "tipo": "despesa"},
    {"codigo": "19", "nome": "Despesas com Materiais e Equipamentos", "grupo": "custos_fixos", "tipo": "despesa"},
    {"codigo": "20", "nome": "Gastos Administrativos", "grupo": "custos_fixos", "tipo": "despesa"},
    {"codigo": "9", "nome": "Receitas não Operacionais", "grupo": "resultado_nao_operacional", "tipo": "receita"},
    {"codigo": "10", "nome": "Gastos não Operacionais", "grupo": "resultado_nao_operacional", "tipo": "despesa"},
    {"codigo": "12", "nome": "Investimentos", "grupo": "resultado_nao_operacional", "tipo": "despesa"},
]

@app.get("/api/dre/anual/{ano}")
async def get_dre_anual(ano: int, user_id: str = Depends(get_current_user)):
    """Retorna DRE anual completo no formato de planilha (Jan-Dez + Total)"""
    supabase = get_supabase()
    
    # Buscar todas as movimentações do ano
    data_inicio = f"{ano}-01-01"
    data_fim = f"{ano + 1}-01-01"
    
    movimentacoes = supabase.table("movimentacoes").select("*, plano_contas(*)").eq("user_id", user_id).gte("data", data_inicio).lt("data", data_fim).execute().data
    
    # Buscar plano de contas do usuário
    planos = supabase.table("plano_contas").select("*").eq("user_id", user_id).execute().data
    
    # Criar mapeamento de plano_contas_id para grupo DRE
    plano_to_grupo = {}
    for plano in planos:
        categoria = plano.get("categoria", "")
        if categoria:
            plano_to_grupo[plano["id"]] = categoria
    
    # Inicializar estrutura de dados mensais
    meses = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", 
             "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
    
    # Estrutura para armazenar valores por grupo e mês
    dados_por_grupo = {}
    for item in DRE_ESTRUTURA:
        dados_por_grupo[item["codigo"]] = {
            "nome": item["nome"],
            "grupo": item["grupo"],
            "tipo": item["tipo"],
            "meses": {m: 0.0 for m in meses},
            "total": 0.0
        }
    
    # Processar movimentações
    for mov in movimentacoes:
        plano_id = mov.get("plano_contas_id")
        grupo_dre = plano_to_grupo.get(plano_id, "")
        valor = mov["valor"]
        data = mov["data"]
        mes_idx = int(data.split("-")[1]) - 1
        mes_nome = meses[mes_idx]
        
        # Encontrar o código correspondente baseado no grupo
        for item in DRE_ESTRUTURA:
            if item["codigo"] == grupo_dre or item["nome"].lower() in mov.get("plano_contas", {}).get("nome", "").lower():
                dados_por_grupo[item["codigo"]]["meses"][mes_nome] += valor
                dados_por_grupo[item["codigo"]]["total"] += valor
                break
        else:
            # Se não encontrou, tentar mapear pelo tipo
            if mov["tipo"] == "entrada":
                dados_por_grupo["1"]["meses"][mes_nome] += valor
                dados_por_grupo["1"]["total"] += valor
            else:
                # Distribuir despesas não mapeadas em custos variáveis
                dados_por_grupo["4"]["meses"][mes_nome] += valor
                dados_por_grupo["4"]["total"] += valor
    
    # Calcular totais por grupo para cada mês
    def calcular_grupo(codigos, meses_dados):
        resultado = {m: 0.0 for m in meses}
        resultado["total"] = 0.0
        for codigo in codigos:
            for mes in meses:
                resultado[mes] += dados_por_grupo[codigo]["meses"][mes]
            resultado["total"] += dados_por_grupo[codigo]["total"]
        return resultado
    
    # Receita Bruta
    receita_bruta = calcular_grupo(["1"], meses)
    
    # Deduções
    deducoes = calcular_grupo(["2", "3"], meses)
    
    # Receita Líquida
    receita_liquida = {m: receita_bruta[m] - deducoes[m] for m in meses}
    receita_liquida["total"] = receita_bruta["total"] - deducoes["total"]
    
    # Custos Variáveis
    custos_variaveis = calcular_grupo(["4", "21", "22"], meses)
    
    # Margem de Contribuição
    margem_contribuicao = {m: receita_liquida[m] - custos_variaveis[m] for m in meses}
    margem_contribuicao["total"] = receita_liquida["total"] - custos_variaveis["total"]
    
    # % Margem de Contribuição
    margem_contribuicao_pct = {}
    for m in meses:
        margem_contribuicao_pct[m] = (margem_contribuicao[m] / receita_liquida[m] * 100) if receita_liquida[m] > 0 else 0
    margem_contribuicao_pct["total"] = (margem_contribuicao["total"] / receita_liquida["total"] * 100) if receita_liquida["total"] > 0 else 0
    
    # Custos Fixos
    custos_fixos = calcular_grupo(["5", "6", "7", "16", "17", "18", "19", "20"], meses)
    
    # Resultado Operacional
    resultado_operacional = {m: margem_contribuicao[m] - custos_fixos[m] for m in meses}
    resultado_operacional["total"] = margem_contribuicao["total"] - custos_fixos["total"]
    
    # Receitas não Operacionais
    receitas_nao_op = calcular_grupo(["9"], meses)
    
    # Gastos não Operacionais + Investimentos
    gastos_nao_op = calcular_grupo(["10", "12"], meses)
    
    # Resultado Não Operacional
    resultado_nao_operacional = {m: receitas_nao_op[m] - gastos_nao_op[m] for m in meses}
    resultado_nao_operacional["total"] = receitas_nao_op["total"] - gastos_nao_op["total"]
    
    # Lucro Líquido
    lucro_liquido = {m: resultado_operacional[m] + resultado_nao_operacional[m] for m in meses}
    lucro_liquido["total"] = resultado_operacional["total"] + resultado_nao_operacional["total"]
    
    # % Margem Líquida
    margem_liquida_pct = {}
    for m in meses:
        margem_liquida_pct[m] = (lucro_liquido[m] / receita_liquida[m] * 100) if receita_liquida[m] > 0 else 0
    margem_liquida_pct["total"] = (lucro_liquido["total"] / receita_liquida["total"] * 100) if receita_liquida["total"] > 0 else 0
    
    return {
        "ano": ano,
        "meses": meses,
        "linhas": dados_por_grupo,
        "totais": {
            "receita_bruta": receita_bruta,
            "deducoes_vendas": deducoes,
            "receita_liquida": receita_liquida,
            "custos_variaveis": custos_variaveis,
            "margem_contribuicao": margem_contribuicao,
            "margem_contribuicao_pct": margem_contribuicao_pct,
            "custos_fixos": custos_fixos,
            "resultado_operacional": resultado_operacional,
            "receitas_nao_operacionais": receitas_nao_op,
            "gastos_nao_operacionais": gastos_nao_op,
            "resultado_nao_operacional": resultado_nao_operacional,
            "lucro_liquido": lucro_liquido,
            "margem_liquida_pct": margem_liquida_pct
        }
    }

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

@app.post("/api/plano-contas/criar-padrao")
async def criar_plano_contas_padrao(user_id: str = Depends(get_current_user)):
    """Cria o plano de contas padrão para DRE com estrutura hierárquica"""
    supabase = get_supabase()
    
    planos_criados = []
    
    # Estrutura hierárquica padrão
    # categoria = "{categoria_dre}|{nivel}|{parent_id}"
    # Ex: "custos_fixos|2|" para subcategoria
    # Ex: "custos_fixos|3|{subcat_id}" para item
    
    estrutura_padrao = {
        "receita_bruta": [
            {"nome": "Receita com Vendas", "tipo": "receita", "itens": [
                "Vendas de Produtos", "Prestação de Serviços"
            ]}
        ],
        "deducoes_vendas": [
            {"nome": "Impostos Sobre Vendas", "tipo": "despesa", "itens": [
                "ICMS", "PIS/COFINS", "ISS"
            ]},
            {"nome": "Outras Deduções", "tipo": "despesa", "itens": [
                "Devoluções", "Descontos Concedidos"
            ]}
        ],
        "custos_variaveis": [
            {"nome": "Custos com Fornecedores", "tipo": "despesa", "itens": [
                "Matéria Prima", "Insumos"
            ]},
            {"nome": "Custos com Vendas", "tipo": "despesa", "itens": [
                "Comissões", "Frete de Vendas"
            ]},
            {"nome": "Custos com Produção", "tipo": "despesa", "itens": [
                "Mão de Obra Direta", "Energia Produção"
            ]}
        ],
        "custos_fixos": [
            {"nome": "Gastos com Pessoal", "tipo": "despesa", "itens": [
                "Folha Salarial", "Encargos Sociais", "Benefícios"
            ]},
            {"nome": "Gastos com Ocupação", "tipo": "despesa", "itens": [
                "Aluguel", "Condomínio", "IPTU"
            ]},
            {"nome": "Gastos com Serviços de Terceiros", "tipo": "despesa", "itens": [
                "Contabilidade", "Advocacia", "TI/Sistemas"
            ]},
            {"nome": "Gastos Operacionais", "tipo": "despesa", "itens": [
                "Material de Escritório", "Telefone/Internet"
            ]},
            {"nome": "Gastos Financeiros", "tipo": "despesa", "itens": [
                "Juros Bancários", "Tarifas Bancárias", "IOF"
            ]},
            {"nome": "Gastos com Veículos", "tipo": "despesa", "itens": [
                "Combustível", "Manutenção Veículos", "Seguro Veículos"
            ]},
            {"nome": "Despesas com Materiais e Equipamentos", "tipo": "despesa", "itens": [
                "Manutenção de Equipamentos", "Depreciação"
            ]},
            {"nome": "Gastos Administrativos", "tipo": "despesa", "itens": [
                "Viagens", "Representação"
            ]}
        ],
        "resultado_nao_operacional": [
            {"nome": "Receitas não Operacionais", "tipo": "receita", "itens": [
                "Rendimentos Financeiros", "Outras Receitas"
            ]},
            {"nome": "Gastos não Operacionais", "tipo": "despesa", "itens": [
                "Multas e Juros", "Perdas"
            ]},
            {"nome": "Investimentos", "tipo": "despesa", "itens": [
                "Aquisição de Ativos", "Melhorias"
            ]}
        ]
    }
    
    for categoria_id, subcategorias in estrutura_padrao.items():
        for subcat in subcategorias:
            # Verificar se subcategoria já existe
            categoria_code = f"{categoria_id}|2|"
            existing = supabase.table("plano_contas").select("*").eq("user_id", user_id).eq("nome", subcat["nome"]).eq("categoria", categoria_code).execute()
            
            if not existing.data:
                # Criar subcategoria (nível 2)
                subcat_id = str(uuid.uuid4())
                novo_subcat = {
                    "id": subcat_id,
                    "user_id": user_id,
                    "nome": subcat["nome"],
                    "tipo": subcat["tipo"],
                    "categoria": categoria_code,  # formato: "categoria_dre|nivel|parent_id"
                    "created_at": datetime.utcnow().isoformat()
                }
                result = supabase.table("plano_contas").insert(novo_subcat).execute()
                planos_criados.append(result.data[0])
                
                # Criar itens (nível 3)
                for item_nome in subcat.get("itens", []):
                    item_id = str(uuid.uuid4())
                    item_categoria = f"{categoria_id}|3|{subcat_id}"
                    novo_item = {
                        "id": item_id,
                        "user_id": user_id,
                        "nome": item_nome,
                        "tipo": subcat["tipo"],
                        "categoria": item_categoria,
                        "created_at": datetime.utcnow().isoformat()
                    }
                    result = supabase.table("plano_contas").insert(novo_item).execute()
                    planos_criados.append(result.data[0])
    
    return {
        "message": f"Plano de contas padrão criado com sucesso. {len(planos_criados)} contas criadas.",
        "planos_criados": planos_criados
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
