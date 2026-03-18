#!/usr/bin/env python3
"""
DRE System - Focused API Testing
Tests specifically the hierarchical DRE functionality
"""

import requests
import json

# Get auth token first
def get_auth_token():
    login_data = {"email": "teste_dre2@email.com", "password": "Teste123!"}
    response = requests.post("http://localhost:8001/api/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json()['access_token']
    return None

def test_endpoint(name, method, url, headers=None, data=None):
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers)
        elif method == 'POST':
            response = requests.post(url, headers=headers, json=data)
        
        print(f"{name}: {response.status_code}")
        if response.status_code != 200 and response.status_code != 201:
            print(f"  ERROR: {response.text}")
        elif response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, dict):
                    print(f"  SUCCESS: Response has {len(data)} keys")
                elif isinstance(data, list):
                    print(f"  SUCCESS: Response has {len(data)} items")
                else:
                    print(f"  SUCCESS: {str(data)[:100]}")
            except:
                print(f"  SUCCESS: Non-JSON response")
        return response.status_code
    except Exception as e:
        print(f"{name}: ERROR - {str(e)}")
        return 0

def main():
    print("=== DRE System API Testing ===")
    
    # Get token
    token = get_auth_token()
    if not token:
        print("❌ Login failed")
        return
    
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # Test key DRE endpoints
    endpoints = [
        ("Login", "GET", "http://localhost:8001/api/auth/me"),
        ("DRE Categories", "GET", "http://localhost:8001/api/categorias-dre"),
        ("Plano Contas List", "GET", "http://localhost:8001/api/plano-contas"),
        ("Plano Contas Hierarchical", "GET", "http://localhost:8001/api/plano-contas/hierarquico"),
        ("DRE Annual 2024", "GET", "http://localhost:8001/api/dre/anual/2024"),
        ("Bank Accounts", "GET", "http://localhost:8001/api/contas-bancarias"),
    ]
    
    working_endpoints = []
    failing_endpoints = []
    
    for name, method, url in endpoints:
        status = test_endpoint(name, method, url, headers)
        if status in [200, 201]:
            working_endpoints.append(name)
        else:
            failing_endpoints.append((name, status))
    
    print("\n=== SUMMARY ===")
    print("✅ Working endpoints:")
    for ep in working_endpoints:
        print(f"  - {ep}")
    
    print("\n❌ Failing endpoints:")
    for ep, status in failing_endpoints:
        print(f"  - {ep} (status: {status})")

if __name__ == "__main__":
    main()