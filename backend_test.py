#!/usr/bin/env python3
"""
Regression test for Terrane backend auth after switching from localStorage tokens to httpOnly cookies.
Tests cookie-based authentication, backward compatibility with Bearer tokens, and user-scoped data.
"""

import requests
import time
import uuid
import os
from pathlib import Path

# Base URL from frontend/.env
BASE_URL = "https://maps-revamp.preview.emergentagent.com/api"

# Generate unique identifiers for this test run
RUN_ID = str(uuid.uuid4())[:8]
UNIQUE_EMAIL = f"cookie_test_{RUN_ID}@terrane.com"
UNIQUE_CLIENT_ID = f"guest_ck_{RUN_ID}"

print(f"\n{'='*80}")
print(f"TERRANE COOKIE-BASED AUTH REGRESSION TEST")
print(f"{'='*80}")
print(f"Base URL: {BASE_URL}")
print(f"Test Email: {UNIQUE_EMAIL}")
print(f"Client ID: {UNIQUE_CLIENT_ID}")
print(f"{'='*80}\n")

# Test counters
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(name, passed, details=""):
    global tests_passed, tests_failed
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"   {details}")
    test_results.append({"name": name, "passed": passed, "details": details})
    if passed:
        tests_passed += 1
    else:
        tests_failed += 1

def check_cookie_attributes(response, cookie_name="terrane_token"):
    """Check if Set-Cookie header has HttpOnly and Secure attributes"""
    set_cookie = response.headers.get("Set-Cookie", "")
    has_cookie = cookie_name in set_cookie
    has_httponly = "HttpOnly" in set_cookie
    has_secure = "Secure" in set_cookie
    return has_cookie, has_httponly, has_secure, set_cookie

# Create a session (cookie jar) for testing
session = requests.Session()

print("\n" + "="*80)
print("TEST 1: REGISTER WITH COOKIE")
print("="*80)

try:
    payload = {
        "email": UNIQUE_EMAIL,
        "password": "secret123",
        "name": "Cookie User",
        "client_id": UNIQUE_CLIENT_ID
    }
    resp = session.post(f"{BASE_URL}/auth/register", json=payload)
    
    if resp.status_code == 200:
        data = resp.json()
        has_token = "token" in data
        has_user = "user" in data
        
        # Check Set-Cookie header
        has_cookie, has_httponly, has_secure, set_cookie_header = check_cookie_attributes(resp)
        
        if has_token and has_user and has_cookie and has_httponly and has_secure:
            log_test("Register returns token, user, and sets HttpOnly Secure cookie", True,
                    f"token present: {has_token}, user: {has_user}, cookie: {has_cookie}, HttpOnly: {has_httponly}, Secure: {has_secure}")
            # Store token for later header fallback test
            bearer_token = data["token"]
        else:
            log_test("Register returns token, user, and sets HttpOnly Secure cookie", False,
                    f"token: {has_token}, user: {has_user}, cookie: {has_cookie}, HttpOnly: {has_httponly}, Secure: {has_secure}")
            bearer_token = data.get("token", "")
    else:
        log_test("Register returns 200", False, f"Got {resp.status_code}: {resp.text}")
        bearer_token = ""
except Exception as e:
    log_test("Register endpoint", False, f"Exception: {e}")
    bearer_token = ""

# Test duplicate email -> 409
print("\n" + "-"*80)
print("TEST 1a: Duplicate email returns 409")
print("-"*80)
try:
    resp = session.post(f"{BASE_URL}/auth/register", json={
        "email": UNIQUE_EMAIL,
        "password": "secret123",
        "name": "Duplicate User",
        "client_id": f"guest_ck_{uuid.uuid4()}"
    })
    if resp.status_code == 409:
        log_test("Duplicate email returns 409", True)
    else:
        log_test("Duplicate email returns 409", False, f"Got {resp.status_code}")
except Exception as e:
    log_test("Duplicate email test", False, f"Exception: {e}")

# Test short password -> 400
print("\n" + "-"*80)
print("TEST 1b: Short password returns 400")
print("-"*80)
try:
    resp = session.post(f"{BASE_URL}/auth/register", json={
        "email": f"short_pw_{RUN_ID}@terrane.com",
        "password": "123",
        "name": "Short PW User",
        "client_id": f"guest_ck_{uuid.uuid4()}"
    })
    if resp.status_code == 400:
        log_test("Short password returns 400", True)
    else:
        log_test("Short password returns 400", False, f"Got {resp.status_code}")
except Exception as e:
    log_test("Short password test", False, f"Exception: {e}")

print("\n" + "="*80)
print("TEST 2: COOKIE-BASED SESSION (NO AUTHORIZATION HEADER)")
print("="*80)

# Test 2a: GET /auth/me with cookie (no header)
print("\n" + "-"*80)
print("TEST 2a: GET /auth/me with cookie only (no Authorization header)")
print("-"*80)
try:
    # Session already has cookie from register
    resp = session.get(f"{BASE_URL}/auth/me")
    if resp.status_code == 200:
        data = resp.json()
        if "email" in data and data["email"] == UNIQUE_EMAIL:
            log_test("GET /auth/me with cookie returns user", True, f"Email: {data['email']}")
        else:
            log_test("GET /auth/me with cookie returns user", False, f"Wrong user data: {data}")
    else:
        log_test("GET /auth/me with cookie", False, f"Got {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("GET /auth/me with cookie", False, f"Exception: {e}")

# Test 2b: GET /auth/me without cookie and without header -> 401
print("\n" + "-"*80)
print("TEST 2b: GET /auth/me with NO cookie and NO header returns 401")
print("-"*80)
try:
    # Create a new session without cookies
    no_auth_session = requests.Session()
    resp = no_auth_session.get(f"{BASE_URL}/auth/me")
    if resp.status_code == 401:
        log_test("GET /auth/me without auth returns 401", True)
    else:
        log_test("GET /auth/me without auth returns 401", False, f"Got {resp.status_code}")
except Exception as e:
    log_test("GET /auth/me without auth", False, f"Exception: {e}")

print("\n" + "="*80)
print("TEST 3: LOGIN SETS FRESH COOKIE")
print("="*80)

# Create a new session for login test
login_session = requests.Session()

try:
    payload = {
        "email": UNIQUE_EMAIL,
        "password": "secret123"
    }
    resp = login_session.post(f"{BASE_URL}/auth/login", json=payload)
    
    if resp.status_code == 200:
        data = resp.json()
        has_cookie, has_httponly, has_secure, _ = check_cookie_attributes(resp)
        
        if has_cookie and has_httponly and has_secure:
            log_test("Login sets fresh HttpOnly Secure cookie", True)
        else:
            log_test("Login sets fresh HttpOnly Secure cookie", False,
                    f"cookie: {has_cookie}, HttpOnly: {has_httponly}, Secure: {has_secure}")
    else:
        log_test("Login returns 200", False, f"Got {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("Login endpoint", False, f"Exception: {e}")

# Test wrong password -> 401
print("\n" + "-"*80)
print("TEST 3a: Wrong password returns 401")
print("-"*80)
try:
    resp = login_session.post(f"{BASE_URL}/auth/login", json={
        "email": UNIQUE_EMAIL,
        "password": "wrongpassword"
    })
    if resp.status_code == 401:
        log_test("Wrong password returns 401", True)
    else:
        log_test("Wrong password returns 401", False, f"Got {resp.status_code}")
except Exception as e:
    log_test("Wrong password test", False, f"Exception: {e}")

print("\n" + "="*80)
print("TEST 4: HEADER FALLBACK (BACKWARD COMPATIBILITY)")
print("="*80)

# Test with Authorization header and NO cookie
print("\n" + "-"*80)
print("TEST 4: GET /auth/me with Bearer token (no cookie)")
print("-"*80)
try:
    # Create a new session without cookies
    header_session = requests.Session()
    headers = {"Authorization": f"Bearer {bearer_token}"}
    resp = header_session.get(f"{BASE_URL}/auth/me", headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        if "email" in data and data["email"] == UNIQUE_EMAIL:
            log_test("GET /auth/me with Bearer token (no cookie) returns user", True,
                    f"Backward compatibility working")
        else:
            log_test("GET /auth/me with Bearer token", False, f"Wrong user: {data}")
    else:
        log_test("GET /auth/me with Bearer token", False, f"Got {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("GET /auth/me with Bearer token", False, f"Exception: {e}")

print("\n" + "="*80)
print("TEST 5: LOGOUT CLEARS COOKIE")
print("="*80)

try:
    # Use the session that has a cookie
    resp = session.post(f"{BASE_URL}/auth/logout")
    
    if resp.status_code == 200:
        # Check if Set-Cookie header clears the cookie (Max-Age=0 or expires in past)
        set_cookie = resp.headers.get("Set-Cookie", "")
        cookie_cleared = "Max-Age=0" in set_cookie or "expires=" in set_cookie.lower()
        
        if cookie_cleared:
            log_test("Logout clears cookie (Max-Age=0)", True)
        else:
            log_test("Logout clears cookie", False, f"Set-Cookie: {set_cookie}")
        
        # Now try to access /auth/me with the cleared cookie jar
        resp_after = session.get(f"{BASE_URL}/auth/me")
        if resp_after.status_code == 401:
            log_test("GET /auth/me after logout returns 401", True)
        else:
            log_test("GET /auth/me after logout returns 401", False,
                    f"Got {resp_after.status_code}")
    else:
        log_test("Logout returns 200", False, f"Got {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("Logout endpoint", False, f"Exception: {e}")

print("\n" + "="*80)
print("TEST 6: USER-SCOPED DATA VIA COOKIE")
print("="*80)

# Create a new unique client_id for this test
guest_client_id = f"guest_ck_{uuid.uuid4()}"
guest_email = f"guest_user_{RUN_ID}@terrane.com"

# 6a: Create guest design (no auth)
print("\n" + "-"*80)
print("TEST 6a: Create guest design without auth")
print("-"*80)
try:
    guest_session = requests.Session()
    design_payload = {
        "client_id": guest_client_id,
        "name": "Guest Place",
        "lat": 30.5,
        "lng": -87.9,
        "mode": "relief",
        "style": "harbor",
        "size": "12x16",
        "orientation": "portrait"
    }
    resp = guest_session.post(f"{BASE_URL}/designs", json=design_payload)
    
    if resp.status_code == 200:
        guest_design = resp.json()
        log_test("Create guest design without auth", True, f"Design ID: {guest_design.get('id')}")
        guest_design_id = guest_design.get("id")
    else:
        log_test("Create guest design", False, f"Got {resp.status_code}: {resp.text}")
        guest_design_id = None
except Exception as e:
    log_test("Create guest design", False, f"Exception: {e}")
    guest_design_id = None

# 6b: Register/login with same client_id (triggers migration)
print("\n" + "-"*80)
print("TEST 6b: Register with same client_id (triggers migration)")
print("-"*80)
try:
    auth_session = requests.Session()
    register_payload = {
        "email": guest_email,
        "password": "secret123",
        "name": "Guest Migrated User",
        "client_id": guest_client_id
    }
    resp = auth_session.post(f"{BASE_URL}/auth/register", json=register_payload)
    
    if resp.status_code == 200:
        log_test("Register with client_id for migration", True)
    else:
        log_test("Register with client_id", False, f"Got {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("Register with client_id", False, f"Exception: {e}")

# 6c: GET /designs using ONLY cookie (no client_id param, no header)
print("\n" + "-"*80)
print("TEST 6c: GET /designs with cookie only (should include migrated design)")
print("-"*80)
try:
    # auth_session now has cookie from register
    resp = auth_session.get(f"{BASE_URL}/designs")
    
    if resp.status_code == 200:
        designs = resp.json()
        has_guest_place = any(d.get("name") == "Guest Place" for d in designs)
        
        if has_guest_place:
            log_test("GET /designs via cookie includes migrated 'Guest Place'", True,
                    f"Found {len(designs)} design(s)")
        else:
            log_test("GET /designs via cookie includes migrated design", False,
                    f"'Guest Place' not found in {len(designs)} designs")
    else:
        log_test("GET /designs via cookie", False, f"Got {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("GET /designs via cookie", False, f"Exception: {e}")

# 6d: POST new design using ONLY cookie
print("\n" + "-"*80)
print("TEST 6d: POST new design using cookie only")
print("-"*80)
try:
    new_design_payload = {
        "client_id": guest_client_id,  # Still need client_id in payload per schema
        "name": "Owned via cookie",
        "lat": 31.0,
        "lng": -88.0,
        "mode": "relief",
        "style": "harbor",
        "size": "12x16",
        "orientation": "portrait"
    }
    resp = auth_session.post(f"{BASE_URL}/designs", json=new_design_payload)
    
    if resp.status_code == 200:
        new_design = resp.json()
        log_test("POST design via cookie", True, f"Design ID: {new_design.get('id')}")
        
        # Verify both designs are in the list
        resp_list = auth_session.get(f"{BASE_URL}/designs")
        if resp_list.status_code == 200:
            designs = resp_list.json()
            has_guest = any(d.get("name") == "Guest Place" for d in designs)
            has_owned = any(d.get("name") == "Owned via cookie" for d in designs)
            
            if has_guest and has_owned:
                log_test("GET /designs includes both migrated and new designs", True,
                        f"Total: {len(designs)} designs")
            else:
                log_test("GET /designs includes both designs", False,
                        f"Guest: {has_guest}, Owned: {has_owned}")
    else:
        log_test("POST design via cookie", False, f"Got {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("POST design via cookie", False, f"Exception: {e}")

print("\n" + "="*80)
print("TEST 7: GPX UPLOAD STILL WORKS")
print("="*80)

# Create a minimal valid GPX file
gpx_content = """<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Test Route</name>
    <trkseg>
      <trkpt lat="30.5" lon="-87.9"></trkpt>
      <trkpt lat="30.51" lon="-87.91"></trkpt>
      <trkpt lat="30.52" lon="-87.92"></trkpt>
    </trkseg>
  </trk>
</gpx>"""

gpx_client_id = f"guest_ck_{uuid.uuid4()}"

print("\n" + "-"*80)
print("TEST 7a: POST /routes/upload with valid GPX")
print("-"*80)
try:
    upload_session = requests.Session()
    files = {"file": ("test_route.gpx", gpx_content, "application/gpx+xml")}
    data = {"client_id": gpx_client_id}
    resp = upload_session.post(f"{BASE_URL}/routes/upload", files=files, data=data)
    
    if resp.status_code == 200:
        route = resp.json()
        has_fields = all(k in route for k in ["id", "points", "bounds", "center", "distance_km", "distance_mi"])
        
        if has_fields:
            log_test("POST /routes/upload returns complete route data", True,
                    f"Route ID: {route.get('id')}, Points: {len(route.get('points', []))}")
            route_id = route.get("id")
        else:
            log_test("POST /routes/upload returns complete data", False,
                    f"Missing fields in: {route.keys()}")
            route_id = route.get("id")
    else:
        log_test("POST /routes/upload", False, f"Got {resp.status_code}: {resp.text}")
        route_id = None
except Exception as e:
    log_test("POST /routes/upload", False, f"Exception: {e}")
    route_id = None

# 7b: GET route
if route_id:
    print("\n" + "-"*80)
    print("TEST 7b: GET /routes/{id}")
    print("-"*80)
    try:
        resp = upload_session.get(f"{BASE_URL}/routes/{route_id}")
        if resp.status_code == 200:
            log_test("GET /routes/{id} returns route", True)
        else:
            log_test("GET /routes/{id}", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("GET /routes/{id}", False, f"Exception: {e}")

    # 7c: DELETE route
    print("\n" + "-"*80)
    print("TEST 7c: DELETE /routes/{id}")
    print("-"*80)
    try:
        resp = upload_session.delete(f"{BASE_URL}/routes/{route_id}")
        if resp.status_code == 200:
            log_test("DELETE /routes/{id} returns 200", True)
            
            # Verify it's deleted
            resp_get = upload_session.get(f"{BASE_URL}/routes/{route_id}")
            if resp_get.status_code == 404:
                log_test("GET deleted route returns 404", True)
            else:
                log_test("GET deleted route returns 404", False, f"Got {resp_get.status_code}")
        else:
            log_test("DELETE /routes/{id}", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("DELETE /routes/{id}", False, f"Exception: {e}")

# Print summary
print("\n" + "="*80)
print("TEST SUMMARY")
print("="*80)
print(f"Total Tests: {tests_passed + tests_failed}")
print(f"✅ Passed: {tests_passed}")
print(f"❌ Failed: {tests_failed}")
print("="*80)

if tests_failed > 0:
    print("\nFAILED TESTS:")
    for result in test_results:
        if not result["passed"]:
            print(f"  ❌ {result['name']}")
            if result["details"]:
                print(f"     {result['details']}")

print("\n" + "="*80)
print("REGRESSION TEST COMPLETE")
print("="*80)

# Exit with appropriate code
exit(0 if tests_failed == 0 else 1)
