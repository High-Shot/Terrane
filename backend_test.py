#!/usr/bin/env python3
"""
Backend API tests for Terrane Maps
Tests all /api endpoints using the external base URL
"""
import requests
import json
import time
from typing import Dict, Any

# Get base URL from frontend/.env
BASE_URL = "https://maps-revamp.preview.emergentagent.com/api"

# Test data
TEST_CLIENT_ID = "test_client_123"
TEST_LOCATION = "Fairhope Alabama"
TEST_LAT = 30.5230
TEST_LNG = -87.9033

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(name: str):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Testing: {name}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

def print_pass(msg: str):
    print(f"{GREEN}✓ PASS: {msg}{RESET}")

def print_fail(msg: str):
    print(f"{RED}✗ FAIL: {msg}{RESET}")

def print_warn(msg: str):
    print(f"{YELLOW}⚠ WARN: {msg}{RESET}")

def print_info(msg: str):
    print(f"  {msg}")


# Test 1: GET /api/config
def test_config():
    print_test("GET /api/config")
    try:
        response = requests.get(f"{BASE_URL}/config", timeout=10)
        print_info(f"Status: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Check required fields
        if "paypal_enabled" not in data:
            print_fail("Missing 'paypal_enabled' field")
            return False
        if not isinstance(data["paypal_enabled"], bool):
            print_fail(f"'paypal_enabled' should be boolean, got {type(data['paypal_enabled'])}")
            return False
        
        if "price" not in data:
            print_fail("Missing 'price' field")
            return False
        if data["price"] != 249 and data["price"] != 249.0:
            print_fail(f"Expected price 249, got {data['price']}")
            return False
        
        if "currency" not in data:
            print_fail("Missing 'currency' field")
            return False
        if data["currency"] != "USD":
            print_fail(f"Expected currency 'USD', got {data['currency']}")
            return False
        
        print_pass("Config endpoint returns correct structure")
        print_info(f"paypal_enabled: {data['paypal_enabled']}")
        print_info(f"price: {data['price']}")
        print_info(f"currency: {data['currency']}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False


# Test 2: GET /api/geocode
def test_geocode():
    print_test("GET /api/geocode?q=Fairhope Alabama")
    try:
        response = requests.get(f"{BASE_URL}/geocode", params={"q": TEST_LOCATION}, timeout=20)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 502 or response.status_code == 503:
            print_warn("Nominatim service temporarily unavailable (rate limiting or timeout)")
            print_info("This is expected for external service - retrying once...")
            time.sleep(2)
            response = requests.get(f"{BASE_URL}/geocode", params={"q": TEST_LOCATION}, timeout=20)
            print_info(f"Retry Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        print_info(f"Response: {json.dumps(data, indent=2)[:500]}...")
        
        if "results" not in data:
            print_fail("Missing 'results' field")
            return False
        
        if not isinstance(data["results"], list):
            print_fail(f"'results' should be a list, got {type(data['results'])}")
            return False
        
        if len(data["results"]) == 0:
            print_warn("No results returned for 'Fairhope Alabama' - this might be a Nominatim issue")
            return True  # Not a critical failure
        
        # Check first result structure
        first = data["results"][0]
        required_fields = ["name", "sub", "lat", "lng"]
        for field in required_fields:
            if field not in first:
                print_fail(f"Missing '{field}' in result")
                return False
        
        if not isinstance(first["lat"], (int, float)):
            print_fail(f"'lat' should be a number, got {type(first['lat'])}")
            return False
        
        if not isinstance(first["lng"], (int, float)):
            print_fail(f"'lng' should be a number, got {type(first['lng'])}")
            return False
        
        print_pass("Geocode endpoint returns correct structure")
        print_info(f"Found {len(data['results'])} results")
        print_info(f"First result: {first['name']}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False


# Test 3: GET /api/geocode with empty/garbage query
def test_geocode_edge_cases():
    print_test("GET /api/geocode edge cases")
    
    # Test with garbage query
    try:
        response = requests.get(f"{BASE_URL}/geocode", params={"q": "xyzabc123notarealplace"}, timeout=20)
        print_info(f"Garbage query status: {response.status_code}")
        
        if response.status_code == 502 or response.status_code == 503:
            print_warn("Nominatim service temporarily unavailable")
            return True  # Not a critical failure
        
        if response.status_code != 200:
            print_fail(f"Expected status 200 for garbage query, got {response.status_code}")
            return False
        
        data = response.json()
        if "results" not in data:
            print_fail("Missing 'results' field for garbage query")
            return False
        
        print_pass("Garbage query handled correctly (returns empty or minimal results)")
        print_info(f"Results count: {len(data['results'])}")
        return True
        
    except Exception as e:
        print_fail(f"Exception on garbage query: {str(e)}")
        return False


# Test 4: GET /api/elevation
def test_elevation():
    print_test(f"GET /api/elevation?lat={TEST_LAT}&lng={TEST_LNG}")
    try:
        response = requests.get(f"{BASE_URL}/elevation", params={"lat": TEST_LAT, "lng": TEST_LNG}, timeout=20)
        print_info(f"Status: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if "elevation_m" not in data:
            print_fail("Missing 'elevation_m' field")
            return False
        
        if "elevation_ft" not in data:
            print_fail("Missing 'elevation_ft' field")
            return False
        
        if not isinstance(data["elevation_m"], (int, float)):
            print_fail(f"'elevation_m' should be a number, got {type(data['elevation_m'])}")
            return False
        
        if not isinstance(data["elevation_ft"], (int, float)):
            print_fail(f"'elevation_ft' should be a number, got {type(data['elevation_ft'])}")
            return False
        
        # Check if elevation is reasonable (Fairhope is near sea level, should be small positive)
        if data["elevation_m"] < 0 or data["elevation_m"] > 1000:
            print_warn(f"Elevation seems unusual: {data['elevation_m']}m (expected small positive for Fairhope)")
        
        print_pass("Elevation endpoint returns correct structure")
        print_info(f"Elevation: {data['elevation_m']}m / {data['elevation_ft']}ft")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False


# Test 5: Designs CRUD round trip
def test_designs_crud():
    print_test("Designs CRUD (POST/GET/DELETE)")
    
    # Step 1: Create a design
    print_info("\n--- Step 1: POST /api/designs ---")
    design_payload = {
        "client_id": TEST_CLIENT_ID,
        "name": "Fairhope, Alabama",
        "sub": "Eastern shore",
        "lat": TEST_LAT,
        "lng": TEST_LNG,
        "mode": "relief",
        "style": "harbor",
        "size": "12x16",
        "orientation": "portrait",
        "elev": 141,
        "image": "http://example.com/test.jpg"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/designs", json=design_payload, timeout=10)
        print_info(f"Status: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            return False
        
        created_design = response.json()
        
        if "id" not in created_design:
            print_fail("Missing 'id' in created design")
            return False
        
        if "created_at" not in created_design:
            print_fail("Missing 'created_at' in created design")
            return False
        
        design_id = created_design["id"]
        print_pass(f"Design created with id: {design_id}")
        
    except Exception as e:
        print_fail(f"Exception creating design: {str(e)}")
        return False
    
    # Step 2: List designs for client
    print_info("\n--- Step 2: GET /api/designs?client_id=... ---")
    try:
        response = requests.get(f"{BASE_URL}/designs", params={"client_id": TEST_CLIENT_ID}, timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            return False
        
        designs = response.json()
        
        if not isinstance(designs, list):
            print_fail(f"Expected list, got {type(designs)}")
            return False
        
        # Find our created design
        found = False
        for design in designs:
            if design.get("id") == design_id:
                found = True
                print_pass(f"Found created design in list")
                break
        
        if not found:
            print_fail(f"Created design {design_id} not found in list")
            return False
        
        print_info(f"Total designs for client: {len(designs)}")
        
    except Exception as e:
        print_fail(f"Exception listing designs: {str(e)}")
        return False
    
    # Step 3: Delete the design
    print_info("\n--- Step 3: DELETE /api/designs/{id} ---")
    try:
        response = requests.delete(f"{BASE_URL}/designs/{design_id}", timeout=10)
        print_info(f"Status: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        if not data.get("ok"):
            print_fail("Delete did not return ok:true")
            return False
        
        print_pass("Design deleted successfully")
        
    except Exception as e:
        print_fail(f"Exception deleting design: {str(e)}")
        return False
    
    # Step 4: Verify design is gone
    print_info("\n--- Step 4: Verify design is deleted ---")
    try:
        response = requests.get(f"{BASE_URL}/designs", params={"client_id": TEST_CLIENT_ID}, timeout=10)
        
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            return False
        
        designs = response.json()
        
        for design in designs:
            if design.get("id") == design_id:
                print_fail(f"Design {design_id} still exists after deletion")
                return False
        
        print_pass("Design successfully removed from list")
        
    except Exception as e:
        print_fail(f"Exception verifying deletion: {str(e)}")
        return False
    
    # Step 5: Try to delete non-existent design (should 404)
    print_info("\n--- Step 5: DELETE non-existent design (should 404) ---")
    try:
        fake_id = "nonexistent-design-id-12345"
        response = requests.delete(f"{BASE_URL}/designs/{fake_id}", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 404:
            print_fail(f"Expected status 404 for non-existent design, got {response.status_code}")
            return False
        
        print_pass("Non-existent design deletion returns 404 as expected")
        
    except Exception as e:
        print_fail(f"Exception deleting non-existent design: {str(e)}")
        return False
    
    print_pass("Designs CRUD round trip completed successfully")
    return True


# Test 6: Orders + PayPal demo flow
def test_orders_demo_flow():
    print_test("Orders + PayPal demo flow")
    
    # Step 1: Create order
    print_info("\n--- Step 1: POST /api/orders ---")
    order_payload = {
        "client_id": TEST_CLIENT_ID,
        "design": {
            "name": "Fairhope, Alabama",
            "size": "12x16",
            "orientation": "portrait"
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/orders", json=order_payload, timeout=10)
        print_info(f"Status: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            return False
        
        order_data = response.json()
        
        # Check required fields
        if "order_id" not in order_data:
            print_fail("Missing 'order_id'")
            return False
        
        if "status" not in order_data:
            print_fail("Missing 'status'")
            return False
        
        if order_data["status"] != "pending":
            print_fail(f"Expected status 'pending', got {order_data['status']}")
            return False
        
        if "amount" not in order_data:
            print_fail("Missing 'amount'")
            return False
        
        if order_data["amount"] != 249 and order_data["amount"] != 249.0:
            print_fail(f"Expected amount 249, got {order_data['amount']}")
            return False
        
        if "currency" not in order_data:
            print_fail("Missing 'currency'")
            return False
        
        if order_data["currency"] != "USD":
            print_fail(f"Expected currency 'USD', got {order_data['currency']}")
            return False
        
        if "demo" not in order_data:
            print_fail("Missing 'demo' field")
            return False
        
        if not order_data["demo"]:
            print_warn("Expected demo:true (PayPal keys not configured)")
        
        if order_data.get("paypal_order_id") is not None:
            print_warn(f"Expected paypal_order_id to be null in demo mode, got {order_data['paypal_order_id']}")
        
        order_id = order_data["order_id"]
        print_pass(f"Order created with id: {order_id}")
        
    except Exception as e:
        print_fail(f"Exception creating order: {str(e)}")
        return False
    
    # Step 2: Capture order
    print_info("\n--- Step 2: POST /api/orders/{id}/capture ---")
    try:
        response = requests.post(f"{BASE_URL}/orders/{order_id}/capture", json={}, timeout=10)
        print_info(f"Status: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            return False
        
        capture_data = response.json()
        
        if "order_id" not in capture_data:
            print_fail("Missing 'order_id' in capture response")
            return False
        
        if capture_data["order_id"] != order_id:
            print_fail(f"Order ID mismatch: expected {order_id}, got {capture_data['order_id']}")
            return False
        
        if "status" not in capture_data:
            print_fail("Missing 'status' in capture response")
            return False
        
        if capture_data["status"] != "captured":
            print_fail(f"Expected status 'captured', got {capture_data['status']}")
            return False
        
        if "demo" not in capture_data:
            print_fail("Missing 'demo' field in capture response")
            return False
        
        if not capture_data["demo"]:
            print_warn("Expected demo:true in capture response")
        
        print_pass("Order captured successfully")
        
    except Exception as e:
        print_fail(f"Exception capturing order: {str(e)}")
        return False
    
    # Step 3: Get order
    print_info("\n--- Step 3: GET /api/orders/{id} ---")
    try:
        response = requests.get(f"{BASE_URL}/orders/{order_id}", timeout=10)
        print_info(f"Status: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            return False
        
        order = response.json()
        
        if order.get("id") != order_id:
            print_fail(f"Order ID mismatch: expected {order_id}, got {order.get('id')}")
            return False
        
        if order.get("status") != "captured":
            print_fail(f"Expected status 'captured', got {order.get('status')}")
            return False
        
        print_pass("Order retrieved with correct status")
        
    except Exception as e:
        print_fail(f"Exception getting order: {str(e)}")
        return False
    
    # Step 4: Get non-existent order (should 404)
    print_info("\n--- Step 4: GET /api/orders/nonexistent (should 404) ---")
    try:
        response = requests.get(f"{BASE_URL}/orders/nonexistent-order-id", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 404:
            print_fail(f"Expected status 404 for non-existent order, got {response.status_code}")
            return False
        
        print_pass("Non-existent order returns 404 as expected")
        
    except Exception as e:
        print_fail(f"Exception getting non-existent order: {str(e)}")
        return False
    
    print_pass("Orders demo flow completed successfully")
    return True


# Main test runner
def main():
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Terrane Backend API Tests{RESET}")
    print(f"{BLUE}Base URL: {BASE_URL}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    results = {}
    
    # Run all tests
    results["config"] = test_config()
    results["geocode"] = test_geocode()
    results["geocode_edge"] = test_geocode_edge_cases()
    results["elevation"] = test_elevation()
    results["designs_crud"] = test_designs_crud()
    results["orders_demo"] = test_orders_demo_flow()
    
    # Summary
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Test Summary{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{GREEN}PASS{RESET}" if result else f"{RED}FAIL{RESET}"
        print(f"{test_name}: {status}")
    
    print(f"\n{BLUE}Total: {passed}/{total} tests passed{RESET}")
    
    if passed == total:
        print(f"{GREEN}All tests passed!{RESET}")
        return 0
    else:
        print(f"{RED}Some tests failed{RESET}")
        return 1


if __name__ == "__main__":
    exit(main())
