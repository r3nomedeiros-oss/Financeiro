import sys
import os

# Adicionar diretório backend ao path do Python
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Importar o app FastAPI do backend
from server import app
