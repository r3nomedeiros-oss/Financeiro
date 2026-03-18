from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

# Auth Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    nome: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

# Conta Bancária Models
class ContaBancariaCreate(BaseModel):
    nome: str
    saldo_inicial: float

class ContaBancariaUpdate(BaseModel):
    nome: Optional[str] = None
    saldo_atual: Optional[float] = None

# Plano de Contas Models
class PlanoContasCreate(BaseModel):
    nome: str
    tipo: str  # 'receita' ou 'despesa'
    categoria: Optional[str] = None

class PlanoContasUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None
    categoria: Optional[str] = None

# Movimentação Models
class MovimentacaoCreate(BaseModel):
    data: str  # formato: YYYY-MM-DD
    tipo: str  # 'entrada' ou 'saida'
    plano_contas_id: str
    complemento: Optional[str] = None
    conta_bancaria_id: str
    valor: float

class MovimentacaoUpdate(BaseModel):
    data: Optional[str] = None
    tipo: Optional[str] = None
    plano_contas_id: Optional[str] = None
    complemento: Optional[str] = None
    conta_bancaria_id: Optional[str] = None
    valor: Optional[float] = None

# Planejamento Orçamentário Models
class PlanejamentoCreate(BaseModel):
    mes: int  # 1-12
    ano: int
    plano_contas_id: str
    valor_planejado: float

class PlanejamentoUpdate(BaseModel):
    valor_planejado: Optional[float] = None

# Dashboard Filters
class DashboardFilters(BaseModel):
    mes: Optional[int] = None
    ano: Optional[int] = None