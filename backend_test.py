#!/usr/bin/env python3
"""
Comprehensive backend test suite for Terrane API
Tests JWT auth, user-scoped data, migration, and GPX routes
"""
import requests
import time
import sys
from pathlib import Path

# Read backend URL from frontend/.env
env_path = Path(__file__).parent / "frontend" / ".env"
BACKEND_URL = None
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BACKEND_URL = line.split("=", 1)[1].strip()
            break

if not BACKEND_URL:
    print("❌ ERROR: Could not read REACT_APP_BACKEND_URL from frontend/.env")
    sys.exit(1)

BASE_URL = f"{BACKEND_URL}/api"
print(f"🔗 Testing backend at: {BASE_URL}\n")

# Generate unique identifiers for this test run
TIMESTAMP = str(int(time.time()))
UNIQUE_EMAIL = f"test_{TIMESTAMP}@terrane.com"
UNIQUE_CLIENT_ID = f"guest_abc_{TIMESTAMP}"
PASSWORD = "secret123"
SHORT_PASSWORD = "123"

# Test results tracking
tests_passed = 0
tests_failed = 0
failed_tests = []

def test(name, func):
    """Run a test and track results"""
    global tests_passed, tests_failed, failed_tests
    try:
        print(f"🧪 {name}")
        func()
        print(f"   ✅ PASSED\n")
        tests_passed += 1
    except AssertionError as e:
        print(f"   ❌ FAILED: {e}\n")
        tests_failed += 1
        failed_tests.append({"name": name, "error": str(e)})
    except Exception as e:
        print(f"   ❌ ERROR: {e}\n")
        tests_failed += 1
        failed_tests.append({"name": name, "error": f"Exception: {e}"})

# Shared state for tests
state = {
    "token": None,
    "user_id": None,
    "guest_design_id": None,
    "user_design_id": None,
    "route_id": None,
}

# ==================== AUTH TESTS ====================

def test_register_success():
    """Register a new user with valid credentials"""
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": UNIQUE_EMAIL,
        "password": PASSWORD,
        "name": "Test User",
        "client_id": UNIQUE_CLIENT_ID
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "token" in data, "Response missing 'token'"
    assert "user" in data, "Response missing 'user'"
    assert data["user"]["email"] == UNIQUE_EMAIL.lower(), f"Email mismatch: {data['user']['email']}"
    assert data["user"]["name"] == "Test User", f"Name mismatch: {data['user']['name']}"
    assert "id" in data["user"], "User missing 'id'"
    assert "created_at" in data["user"], "User missing 'created_at'"
    state["token"] = data["token"]
    state["user_id"] = data["user"]["id"]
    print(f"   📝 Registered user: {data['user']['email']} (ID: {state['user_id']})")

def test_register_duplicate_email():
    """Registering with duplicate email should return 409"""
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": UNIQUE_EMAIL,
        "password": PASSWORD,
        "name": "Duplicate User"
    })
    assert resp.status_code == 409, f"Expected 409 for duplicate email, got {resp.status_code}: {resp.text}"
    print(f"   📝 Correctly rejected duplicate email with 409")

def test_register_short_password():
    """Registering with password < 6 chars should return 400"""
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": f"short_{TIMESTAMP}@terrane.com",
        "password": SHORT_PASSWORD,
        "name": "Short Pass User"
    })
    assert resp.status_code == 400, f"Expected 400 for short password, got {resp.status_code}: {resp.text}"
    print(f"   📝 Correctly rejected short password with 400")

def test_login_success():
    """Login with correct credentials"""
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": UNIQUE_EMAIL,
        "password": PASSWORD,
        "client_id": UNIQUE_CLIENT_ID
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "token" in data, "Response missing 'token'"
    assert "user" in data, "Response missing 'user'"
    assert data["user"]["email"] == UNIQUE_EMAIL.lower(), f"Email mismatch: {data['user']['email']}"
    print(f"   📝 Login successful for {data['user']['email']}")

def test_login_wrong_password():
    """Login with wrong password should return 401"""
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": UNIQUE_EMAIL,
        "password": "wrongpassword123"
    })
    assert resp.status_code == 401, f"Expected 401 for wrong password, got {resp.status_code}: {resp.text}"
    print(f"   📝 Correctly rejected wrong password with 401")

def test_login_nonexistent_email():
    """Login with non-existent email should return 401"""
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": f"nonexistent_{TIMESTAMP}@terrane.com",
        "password": PASSWORD
    })
    assert resp.status_code == 401, f"Expected 401 for non-existent email, got {resp.status_code}: {resp.text}"
    print(f"   📝 Correctly rejected non-existent email with 401")

def test_me_with_token():
    """GET /auth/me with valid Bearer token"""
    assert state["token"], "No token available for test"
    resp = requests.get(f"{BASE_URL}/auth/me", headers={
        "Authorization": f"Bearer {state['token']}"
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["email"] == UNIQUE_EMAIL.lower(), f"Email mismatch: {data['email']}"
    assert data["id"] == state["user_id"], f"User ID mismatch: {data['id']}"
    print(f"   📝 /auth/me returned user: {data['email']}")

def test_me_without_token():
    """GET /auth/me without Authorization header should return 401"""
    resp = requests.get(f"{BASE_URL}/auth/me")
    assert resp.status_code == 401, f"Expected 401 without token, got {resp.status_code}: {resp.text}"
    print(f"   📝 Correctly rejected request without token with 401")

def test_me_with_garbage_token():
    """GET /auth/me with invalid token should return 401"""
    resp = requests.get(f"{BASE_URL}/auth/me", headers={
        "Authorization": "Bearer garbage_invalid_token_12345"
    })
    assert resp.status_code == 401, f"Expected 401 with garbage token, got {resp.status_code}: {resp.text}"
    print(f"   📝 Correctly rejected garbage token with 401")

# ==================== MIGRATION & USER-SCOPED DESIGNS ====================

def test_create_guest_design():
    """Create a design as a guest (no auth header)"""
    # Use a NEW unique client_id for migration test
    migration_client_id = f"guest_migration_{TIMESTAMP}"
    resp = requests.post(f"{BASE_URL}/designs", json={
        "client_id": migration_client_id,
        "name": "Guest Place",
        "lat": 30.5,
        "lng": -87.9,
        "mode": "relief",
        "style": "harbor",
        "size": "12x16",
        "orientation": "portrait"
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["name"] == "Guest Place", f"Name mismatch: {data['name']}"
    assert "id" in data, "Design missing 'id'"
    state["guest_design_id"] = data["id"]
    state["migration_client_id"] = migration_client_id
    print(f"   📝 Created guest design: {data['name']} (ID: {state['guest_design_id']})")

def test_register_new_user_with_migration():
    """Register a NEW user with the guest client_id to trigger migration"""
    migration_email = f"migration_{TIMESTAMP}@terrane.com"
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": migration_email,
        "password": PASSWORD,
        "name": "Migration User",
        "client_id": state["migration_client_id"]
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "token" in data, "Response missing 'token'"
    state["migration_token"] = data["token"]
    state["migration_user_id"] = data["user"]["id"]
    print(f"   📝 Registered migration user: {data['user']['email']} (ID: {state['migration_user_id']})")

def test_migrated_design_in_user_list():
    """GET /designs with Bearer token should include the migrated guest design"""
    assert state["migration_token"], "No migration token available"
    resp = requests.get(f"{BASE_URL}/designs", headers={
        "Authorization": f"Bearer {state['migration_token']}"
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    designs = resp.json()
    assert isinstance(designs, list), f"Expected list, got {type(designs)}"
    design_ids = [d["id"] for d in designs]
    assert state["guest_design_id"] in design_ids, f"Guest design {state['guest_design_id']} not found in user's designs: {design_ids}"
    print(f"   📝 Migrated design found in user's list: {state['guest_design_id']}")

def test_create_user_design():
    """Create a design with Bearer token (user-owned)"""
    assert state["migration_token"], "No migration token available"
    resp = requests.post(f"{BASE_URL}/designs", json={
        "client_id": state["migration_client_id"],  # client_id still required in schema
        "name": "Owned Place",
        "lat": 31.0,
        "lng": -88.0,
        "mode": "relief",
        "style": "harbor",
        "size": "12x16",
        "orientation": "portrait"
    }, headers={
        "Authorization": f"Bearer {state['migration_token']}"
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["name"] == "Owned Place", f"Name mismatch: {data['name']}"
    state["user_design_id"] = data["id"]
    print(f"   📝 Created user design: {data['name']} (ID: {state['user_design_id']})")

def test_user_designs_list_includes_both():
    """GET /designs with Bearer token should include both migrated and new designs"""
    assert state["migration_token"], "No migration token available"
    resp = requests.get(f"{BASE_URL}/designs", headers={
        "Authorization": f"Bearer {state['migration_token']}"
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    designs = resp.json()
    design_ids = [d["id"] for d in designs]
    assert state["guest_design_id"] in design_ids, f"Guest design not in list: {design_ids}"
    assert state["user_design_id"] in design_ids, f"User design not in list: {design_ids}"
    print(f"   📝 User's designs list includes both migrated and new designs ({len(designs)} total)")

def test_guest_client_id_isolation():
    """GET /designs with a different client_id (no token) should NOT include user's designs"""
    other_client_id = f"guest_other_{TIMESTAMP}"
    resp = requests.get(f"{BASE_URL}/designs", params={"client_id": other_client_id})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    designs = resp.json()
    design_ids = [d["id"] for d in designs]
    assert state["guest_design_id"] not in design_ids, f"Guest design should not be in other client's list: {design_ids}"
    assert state["user_design_id"] not in design_ids, f"User design should not be in other client's list: {design_ids}"
    print(f"   📝 Other client_id correctly isolated (returned {len(designs)} designs)")

# ==================== GPX ROUTES TESTS ====================

def test_upload_valid_gpx():
    """Upload a valid GPX file"""
    gpx_content = """<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Test Route</name>
    <trkseg>
      <trkpt lat="30.5" lon="-87.9"></trkpt>
      <trkpt lat="30.51" lon="-87.91"></trkpt>
      <trkpt lat="30.52" lon="-87.92"></trkpt>
      <trkpt lat="30.53" lon="-87.93"></trkpt>
      <trkpt lat="30.54" lon="-87.94"></trkpt>
    </trkseg>
  </trk>
</gpx>"""
    
    files = {"file": ("test_route.gpx", gpx_content, "application/gpx+xml")}
    data = {"client_id": UNIQUE_CLIENT_ID}
    
    resp = requests.post(f"{BASE_URL}/routes/upload", files=files, data=data)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    route = resp.json()
    assert "id" in route, "Route missing 'id'"
    assert "name" in route, "Route missing 'name'"
    assert "points" in route, "Route missing 'points'"
    assert isinstance(route["points"], list), "Points should be a list"
    assert len(route["points"]) > 0, "Points list should not be empty"
    assert "point_count" in route, "Route missing 'point_count'"
    assert "bounds" in route, "Route missing 'bounds'"
    assert "center" in route, "Route missing 'center'"
    assert "distance_km" in route, "Route missing 'distance_km'"
    assert "distance_mi" in route, "Route missing 'distance_mi'"
    state["route_id"] = route["id"]
    print(f"   📝 Uploaded GPX route: {route['name']} (ID: {state['route_id']}, {route['point_count']} points, {route['distance_km']} km)")

def test_upload_non_gpx_file():
    """Upload a non-GPX file should return 400"""
    files = {"file": ("test.txt", "This is not a GPX file", "text/plain")}
    data = {"client_id": UNIQUE_CLIENT_ID}
    
    resp = requests.post(f"{BASE_URL}/routes/upload", files=files, data=data)
    assert resp.status_code == 400, f"Expected 400 for non-GPX file, got {resp.status_code}: {resp.text}"
    print(f"   📝 Correctly rejected non-GPX file with 400")

def test_get_route():
    """GET /routes/{id} should return the route"""
    assert state["route_id"], "No route_id available"
    resp = requests.get(f"{BASE_URL}/routes/{state['route_id']}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    route = resp.json()
    assert route["id"] == state["route_id"], f"Route ID mismatch: {route['id']}"
    assert "points" in route, "Route missing 'points'"
    print(f"   📝 Retrieved route: {route['name']} ({route['point_count']} points)")

def test_delete_route():
    """DELETE /routes/{id} should delete the route"""
    assert state["route_id"], "No route_id available"
    resp = requests.delete(f"{BASE_URL}/routes/{state['route_id']}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data.get("ok") is True, f"Expected ok:true, got {data}"
    print(f"   📝 Deleted route: {state['route_id']}")

def test_get_deleted_route():
    """GET /routes/{id} after deletion should return 404"""
    assert state["route_id"], "No route_id available"
    resp = requests.get(f"{BASE_URL}/routes/{state['route_id']}")
    assert resp.status_code == 404, f"Expected 404 for deleted route, got {resp.status_code}: {resp.text}"
    print(f"   📝 Correctly returned 404 for deleted route")

# ==================== RUN ALL TESTS ====================

if __name__ == "__main__":
    print("=" * 70)
    print("🚀 TERRANE BACKEND TEST SUITE - JWT AUTH & USER-SCOPED DATA")
    print("=" * 70)
    print(f"📧 Test email: {UNIQUE_EMAIL}")
    print(f"🆔 Test client_id: {UNIQUE_CLIENT_ID}")
    print("=" * 70)
    print()
    
    # Auth tests
    print("🔐 AUTHENTICATION TESTS")
    print("-" * 70)
    test("Register new user", test_register_success)
    test("Register duplicate email (409)", test_register_duplicate_email)
    test("Register short password (400)", test_register_short_password)
    test("Login with correct credentials", test_login_success)
    test("Login with wrong password (401)", test_login_wrong_password)
    test("Login with non-existent email (401)", test_login_nonexistent_email)
    test("GET /auth/me with valid token", test_me_with_token)
    test("GET /auth/me without token (401)", test_me_without_token)
    test("GET /auth/me with garbage token (401)", test_me_with_garbage_token)
    print()
    
    # Migration & user-scoped designs
    print("🔄 MIGRATION & USER-SCOPED DESIGNS")
    print("-" * 70)
    test("Create design as guest", test_create_guest_design)
    test("Register new user with guest client_id", test_register_new_user_with_migration)
    test("Migrated design in user's list", test_migrated_design_in_user_list)
    test("Create design with Bearer token", test_create_user_design)
    test("User's list includes both designs", test_user_designs_list_includes_both)
    test("Guest client_id isolation", test_guest_client_id_isolation)
    print()
    
    # GPX routes
    print("📍 GPX ROUTES STORAGE")
    print("-" * 70)
    test("Upload valid GPX file", test_upload_valid_gpx)
    test("Upload non-GPX file (400)", test_upload_non_gpx_file)
    test("GET /routes/{id}", test_get_route)
    test("DELETE /routes/{id}", test_delete_route)
    test("GET deleted route (404)", test_get_deleted_route)
    print()
    
    # Summary
    print("=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print(f"📈 Total:  {tests_passed + tests_failed}")
    print("=" * 70)
    
    if failed_tests:
        print("\n❌ FAILED TESTS:")
        for ft in failed_tests:
            print(f"  • {ft['name']}")
            print(f"    {ft['error']}")
        sys.exit(1)
    else:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
