# Terrane Backend Security Hardening Todos

This document tracks critical security improvements needed before full production launch.

## Payment Flow Verification (CRITICAL — BLOCKING)

### Issue: `capture_order` doesn't verify PayPal amount

**Location:** `backend/server.py` in `capture_order()` endpoint

**Risk:** An attacker could:
1. Create an order for $249 in the frontend
2. Intercept/modify the order total to $0.01 before `capture_order` is called
3. Authorize payment for $0.01 on PayPal
4. `capture_order` calls PayPal.capture_payment() with the modified token
5. PayPal captures $0.01, order is fulfilled, customer gets map for pennies

**Expected behavior:**
- When `capture_order` receives a request, it must:
  1. Fetch the original order document from Mongo (source of truth)
  2. Fetch the PayPal authorization details from PayPal API
  3. Verify the authorized amount matches the order total (within $0.01 tolerance for exchange rates)
  4. Only then call `capture_payment()`
  5. Return error if amounts don't match

**Fix scope:**
```python
@api_router.post("/orders/{order_id}/capture")
async def capture_order(order_id: str, payload: CapturePayload, user=Depends(require_user)):
    # 1. Fetch order from DB
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # 2. Get authorization details from PayPal
    auth_details = await paypal_client.get_authorization(payload.authorization_id)
    
    # 3. Verify amount matches
    order_total_cents = int(order["total_usd"] * 100)
    auth_amount_cents = int(float(auth_details["amount"]["value"]) * 100)
    
    if abs(order_total_cents - auth_amount_cents) > 1:  # >$0.01 difference
        raise HTTPException(status_code=400, detail="Amount mismatch")
    
    # 4. Safe to capture
    capture = await paypal_client.capture_payment(payload.authorization_id)
    ...
```

**Testing:**
- Unit test: mock PayPal response with wrong amount, verify it raises HTTPException
- Integration test: create real PayPal authorization, modify order total, verify error

---

## Authentication & Rate Limiting (HIGH)

### Issue: No rate limiting on auth endpoints

**Affected endpoints:**
- `POST /login` — brute-force password attacks
- `POST /register` — account enumeration, spam
- `POST /contact` — spam
- `POST /events` — data exfiltration
- `POST /upload` — resource exhaustion

**Fix:** Applied in `backend/middleware.py` (see `rate_limit_middleware` and `LIMITERS`)

**Integration steps:**
1. Import `rate_limit_middleware` in `server.py`
2. Call in each route before processing:
   ```python
   @api_router.post("/login")
   async def login(req: Request, payload: LoginRequest):
       await rate_limit_middleware("login", req)
       # ... rest of login logic
   ```

**Testing:**
- Unit test: simulate 6 requests in 300s from same IP, verify 429 on 6th
- Manual test: curl -X POST /login 6 times rapidly, confirm 429

---

## CORS Configuration (MEDIUM)

### Issue: Verify CORS is not set to `*`

**Check:** Search `backend/server.py` for `CORSMiddleware` or `allow_origins`

**Expected:** Only frontend subdomains are allowed
```python
allow_origins=[
    "https://terranemaps.com",
    "https://www.terranemaps.com",
    "https://studio.terranemaps.com",
    "http://localhost:3000",  # dev only
]
```

**Fix:** Update if currently `["*"]`

---

## Input Validation (MEDIUM)

### Checklist
- [ ] All file uploads in `/upload` check file type (MIME) and size limits
- [ ] Contact form emails are validated with a regex before storing
- [ ] Order amounts are floats with .2 precision, not strings
- [ ] GPX file parsing catches malformed XML gracefully

---

## Secrets & Credentials (MEDIUM)

### Checklist
- [ ] No `.env` committed (verify `.gitignore` includes `.env`)
- [ ] All API keys in `backend/.env.example` are template-only (no real values)
- [ ] `PAYPAL_SECRET` never logged or printed
- [ ] Database connection string never appears in error messages

**Audit:**
```bash
git log -S "PAYPAL_SECRET" --name-only
git log -S "mongodb+srv" --name-only
```

---

## Dependency Security (LOW)

### Checklist
- [ ] Run `pip audit` monthly, fix flagged packages
- [ ] Pin critical packages (PayPal, MongoDB, FastAPI) to patch versions
- [ ] Update dev dependencies (`pytest`, `black`) quarterly

**Current status:**
- See `backend/requirements.txt` and `backend/requirements-dev.txt`

---

## Testing Roadmap

### Phase 1 (Before First Review)
- [x] Unit tests for `classify()`, pooled inventory, restock estimates (INTL)
- [ ] Unit test for PayPal amount verification logic
- [ ] Rate limiter unit tests

### Phase 2 (Before Production)
- [ ] Integration test: login with correct/incorrect password + rate limiting
- [ ] Integration test: PayPal auth → capture flow with amount mismatch
- [ ] Manual: test 429 response in browser
- [ ] Manual: PayPal sandbox payment end-to-end

### Phase 3 (Continuous)
- [ ] `pip audit` on CI
- [ ] OWASP dependency check on CI
- [ ] Quarterly penetration testing

---

## Launch Checklist

Before `terranemaps.com` goes live:
- [ ] All CRITICAL items fixed and tested
- [ ] Rate limiters deployed and monitored
- [ ] PayPal amount verification in place
- [ ] Secrets scanning enabled on main branch
- [ ] Sentry or similar error tracking configured
- [ ] Admin logs reviewed for suspicious activity

---

**Last updated:** 2026-09-11  
**Owner:** Security review
