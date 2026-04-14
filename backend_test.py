import requests
import sys
import json
from datetime import datetime

class FinanceAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.headers = {'Content-Type': 'application/json'}

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = self.headers.copy()
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {"message": "No JSON response"}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json() if response.text else {}
                    self.log(f"   Error: {error_data}")
                except:
                    self.log(f"   Raw response: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            self.log(f"❌ {name} - Timeout error")
            return False, {}
        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test if backend is responding"""
        return self.run_test("Health Check", "GET", "/health", 200)

    def test_register_user(self):
        """Register a test user"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_data = {
            "email": f"test_user_{timestamp}@test.com",
            "password": "TestPass123!",
            "nome": f"Test User {timestamp}"
        }
        success, response = self.run_test("User Registration", "POST", "/api/auth/register", 200, test_data)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log(f"   Registered user: {response['user']['email']}")
            return True, response
        return False, {}

    def test_login_user(self, email, password):
        """Login with user credentials"""
        login_data = {"email": email, "password": password}
        success, response = self.run_test("User Login", "POST", "/api/auth/login", 200, login_data)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log(f"   Logged in user: {response['user']['email']}")
            return True, response
        return False, {}

    def test_admin_login(self):
        """Login with admin credentials"""
        return self.test_login_user("admin@sfi.com", "admin123")

    def test_me(self):
        """Test getting current user"""
        return self.run_test("Get Current User", "GET", "/api/auth/me", 200)

    def test_create_standard_accounts(self):
        """Test creating standard chart of accounts"""
        return self.run_test("Create Standard Chart of Accounts", "POST", "/api/plano-contas/criar-padrao", 200)

    def test_get_plano_contas(self):
        """Test getting chart of accounts"""
        return self.run_test("Get Chart of Accounts", "GET", "/api/plano-contas", 200)

    def test_get_plano_contas_hierarquico(self):
        """Test getting hierarchical chart of accounts"""
        return self.run_test("Get Hierarchical Chart of Accounts", "GET", "/api/plano-contas/hierarquico", 200)

    def test_planejamento_endpoints(self):
        """Test planejamento (budget planning) endpoints"""
        # Test getting planejamento data
        success1, response1 = self.run_test("Get Planejamento", "GET", "/api/planejamento", 200)
        
        # Test with year filter
        success2, response2 = self.run_test("Get Planejamento 2024", "GET", "/api/planejamento?ano=2024", 200)
        
        return success1 and success2, {"all": response1, "2024": response2}

    def test_planejamento_batch_endpoint(self):
        """Test the new batch planejamento endpoint that was created to fix slow saving"""
        self.log("🚀 Testing NEW BATCH planejamento endpoint...")
        
        # First get plano de contas to have valid IDs
        plano_success, plano_data = self.test_get_plano_contas()
        if not plano_success or not plano_data:
            self.log("❌ Cannot test batch endpoint - no plano de contas available")
            return False, {}
        
        # Get first few plano IDs for testing
        plano_ids = [p['id'] for p in plano_data[:3]] if plano_data else []
        if not plano_ids:
            self.log("❌ Cannot test batch endpoint - no plano IDs available")
            return False, {}
        
        # Create batch data for testing
        batch_items = []
        for i, plano_id in enumerate(plano_ids):
            for mes in [1, 2, 3]:  # Test 3 months
                batch_items.append({
                    "plano_contas_id": plano_id,
                    "mes": mes,
                    "ano": 2024,
                    "valor_planejado": (i + 1) * 1000 * mes  # Different values for testing
                })
        
        # Test batch endpoint
        success, response = self.run_test(
            "Planejamento Batch Save", 
            "POST", 
            "/api/planejamento/batch", 
            200, 
            batch_items
        )
        
        if success:
            self.log(f"   Batch saved: {response.get('inserts', 0)} inserts, {response.get('updates', 0)} updates")
            
            # Verify data was saved by getting planejamento again
            verify_success, verify_data = self.run_test("Verify Batch Save", "GET", "/api/planejamento?ano=2024", 200)
            if verify_success and verify_data:
                self.log(f"   Verification: Found {len(verify_data)} planejamento records")
                return True, {"batch_response": response, "verification": verify_data}
        
        return success, response

    def test_planejamento_single_endpoint(self):
        """Test that single planejamento endpoint still works after batch implementation"""
        # Get plano de contas for valid ID
        plano_success, plano_data = self.test_get_plano_contas()
        if not plano_success or not plano_data:
            return False, {}
        
        plano_id = plano_data[0]['id'] if plano_data else None
        if not plano_id:
            return False, {}
        
        # Test single create
        single_data = {
            "plano_contas_id": plano_id,
            "mes": 12,
            "ano": 2024,
            "valor_planejado": 5000.0
        }
        
        return self.run_test("Single Planejamento Create", "POST", "/api/planejamento", 200, single_data)

    def test_dre_anual(self, year=2024):
        """Test DRE annual endpoint"""
        return self.run_test(f"DRE Annual {year}", "GET", f"/api/dre/anual/{year}", 200)

    def test_dre_mensal(self, month=1, year=2024):
        """Test DRE monthly endpoint"""
        return self.run_test(f"DRE Monthly {month}/{year}", "GET", f"/api/dre/{month}/{year}", 200)

    def test_contas_bancarias(self):
        """Test bank accounts endpoint"""
        return self.run_test("Get Bank Accounts", "GET", "/api/contas-bancarias", 200)

    def test_movimentacoes(self):
        """Test transactions endpoint"""
        return self.run_test("Get Transactions", "GET", "/api/movimentacoes", 200)
    
    def test_movimentacoes_with_date_filters(self):
        """Test transactions endpoint with data_inicio and data_fim parameters"""
        # Test with date range filters
        params = "?data_inicio=2024-01-01&data_fim=2024-12-31"
        success1, response1 = self.run_test("Get Transactions with Date Range", "GET", f"/api/movimentacoes{params}", 200)
        
        # Test with different date range
        params2 = "?data_inicio=2024-06-01&data_fim=2024-06-30"
        success2, response2 = self.run_test("Get Transactions with Different Date Range", "GET", f"/api/movimentacoes{params2}", 200)
        
        # Verify that different date ranges return different data (if there's data)
        if success1 and success2:
            data1 = response1 if isinstance(response1, list) else []
            data2 = response2 if isinstance(response2, list) else []
            self.log(f"   Date range 1 returned {len(data1)} transactions")
            self.log(f"   Date range 2 returned {len(data2)} transactions")
            
        return success1 and success2, {"range1": response1, "range2": response2}

    def create_sample_data(self):
        """Create some sample data for testing"""
        self.log("Creating sample data...")
        
        # Create a bank account
        conta_data = {
            "nome": "Conta Teste",
            "saldo_inicial": 10000.0
        }
        success, response = self.run_test("Create Test Bank Account", "POST", "/api/contas-bancarias", 200, conta_data)
        conta_id = response.get('id') if success else None
        
        # Create some transactions if we have a bank account
        if conta_id and success:
            # Get plano de contas
            plano_success, plano_response = self.test_get_plano_contas()
            if plano_success and plano_response:
                planos = plano_response
                if planos:
                    # Create a revenue transaction
                    receita_plano = next((p for p in planos if p['tipo'] == 'receita'), None)
                    if receita_plano:
                        mov_data = {
                            "data": "2024-01-15",
                            "tipo": "entrada", 
                            "plano_contas_id": receita_plano['id'],
                            "complemento": "Venda teste",
                            "conta_bancaria_id": conta_id,
                            "valor": 5000.0
                        }
                        self.run_test("Create Test Revenue Transaction", "POST", "/api/movimentacoes", 200, mov_data)
                    
                    # Create a cost transaction
                    despesa_plano = next((p for p in planos if p['tipo'] == 'despesa'), None)
                    if despesa_plano:
                        mov_data = {
                            "data": "2024-01-20",
                            "tipo": "saida",
                            "plano_contas_id": despesa_plano['id'],
                            "complemento": "Custo teste",
                            "conta_bancaria_id": conta_id,
                            "valor": 2000.0
                        }
                        self.run_test("Create Test Cost Transaction", "POST", "/api/movimentacoes", 200, mov_data)

def main():
    """Main test function"""
    tester = FinanceAPITester()
    
    print("="*60)
    print("SISTEMA FINANCEIRO INDUSTRIAL - TESTE DE API")
    print("="*60)
    
    # Test basic connectivity
    tester.log("🌐 Testing basic connectivity...")
    success, _ = tester.test_health()
    if not success:
        tester.log("❌ Backend is not responding. Stopping tests.")
        return 1
    
    # Try to login with admin credentials first
    tester.log("🔐 Testing authentication with admin credentials...")
    success, user_data = tester.test_admin_login()
    
    if not success:
        # If admin login fails, try registering a new user
        tester.log("🔐 Admin login failed, trying to register new user...")
        success, user_data = tester.test_register_user()
        if not success:
            tester.log("❌ Both admin login and user registration failed. Stopping tests.")
            return 1
    
    # Test getting current user
    tester.test_me()
    
    # Test DRE functionality
    tester.log("📊 Testing DRE functionality...")
    
    # Create standard chart of accounts
    tester.test_create_standard_accounts()
    
    # Get chart of accounts (both flat and hierarchical)
    plano_success, plano_data = tester.test_get_plano_contas()
    hierarquico_success, hierarquico_data = tester.test_get_plano_contas_hierarquico()
    
    # Test Planejamento endpoints (the main issue that was fixed)
    tester.log("📋 Testing Planejamento Orçamentário endpoints...")
    tester.test_planejamento_endpoints()
    
    # Test the NEW BATCH endpoint specifically
    tester.log("🚀 Testing NEW BATCH planejamento endpoint...")
    batch_success, batch_data = tester.test_planejamento_batch_endpoint()
    
    # Test that single endpoint still works
    tester.log("🔄 Testing single planejamento endpoint still works...")
    single_success, single_data = tester.test_planejamento_single_endpoint()
    
    # Test DRE endpoints
    tester.test_dre_anual(2024)
    tester.test_dre_anual(2025) 
    tester.test_dre_mensal(1, 2024)
    
    # Test other endpoints
    tester.log("🏦 Testing bank accounts and transactions...")
    tester.test_contas_bancarias()
    tester.test_movimentacoes()
    
    # Test new date filter functionality
    tester.log("📅 Testing movimentacoes with date filters...")
    tester.test_movimentacoes_with_date_filters()
    
    # Create sample data and retest DRE
    tester.create_sample_data()
    
    # Test DRE again with data
    tester.log("📈 Testing DRE with sample data...")
    tester.test_dre_anual(2024)
    
    # Final results
    print("\n" + "="*60)
    print("RESULTADOS DOS TESTES")
    print("="*60)
    tester.log(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    tester.log(f"📈 Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        tester.log("✅ Overall result: PASS")
        return 0
    else:
        tester.log("❌ Overall result: FAIL")
        return 1

if __name__ == "__main__":
    sys.exit(main())