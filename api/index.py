import sys
import os

# Adicionar diretório backend ao path do Python
# Em Vercel, os arquivos ficam em /var/task/
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Importar o app FastAPI do backend
from server import app

# Vercel detecta automaticamente o objeto 'app' como ASGI handler
