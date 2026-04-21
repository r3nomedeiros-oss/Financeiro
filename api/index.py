"""
Entrypoint da função serverless da Vercel.
Importa o app FastAPI do backend/ e o expõe como handler ASGI.
"""
import sys
import os

# Adiciona o diretório /backend ao sys.path para permitir o import
# Em runtime da Vercel, os arquivos ficam em /var/task/
_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.normpath(os.path.join(_current_dir, '..', 'backend'))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

# Importar o app FastAPI (Vercel detecta automaticamente ASGI via var 'app')
from server import app  # noqa: E402, F401
