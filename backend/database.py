import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar .env do diretório backend (funciona local e no Vercel)
_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_dir, '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL e SUPABASE_KEY devem estar definidos no .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_supabase() -> Client:
    return supabase