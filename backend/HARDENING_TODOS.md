# Terrane Backend Security Hardening Todos

This document tracks critical security improvements needed before full production launch.

## Payment Flow Verification (CRITICAL — ✅ DONE, PR #10)

### Issue: `capture_order` doesn't verify PayPal amount

**Status: fixed.** The real hole turned out to be worse than the amount check.
`capture_order` also trusted `body.paypal_order_id`, so a caller could point a
$249 order at a $1 PayPal order of their own — no interception needed. It now
captures only the id stored at create time, sums the `COMPLETED` captures in
the PayPal response, and parks the order at `review` **without running
fulfillment** on any amount or currency mismatch. Also fixed alongside it:
capture is no longer unauthenticated, is idempotent, and no longer marks a real
order captured when the PayPal credentials go missing.

The sketch below is kept for context; the shipped shape differs in two ways.
The endpoint uses `get_optional_user` rather than `require_user` (guest
checkout has no account, so the buyer is proven by `client_id`), and it
verifies the capture response rather than a separate authorization fetch,
because orders are created with `intent: CAPTURE` and never authorized first.

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

## Authentication & Rate Limiting (HIGH — ✅ DONE, PR #10)

### Issue: No rate limiting on auth endpoints

**Affected endpoints:** all five are now limited.
- `POST /login` — brute-force password attacks
- `POST /register` — account enumeration, spam
- `POST /contact` — spam
- `POST /events` — data exfiltration
- `POST /upload` — resource exhaustion

**Fix:** `backend/ratelimit.py`, wired as a FastAPI dependency on each route.
The limits are the ones this document specified, carried over verbatim
(`RL_*` in `server.py`), plus a second per-email limit on login that the
original spec did not have — the per-IP limit alone does nothing against a
botnet spreading a guessing run for one inbox across many addresses.

`backend/middleware.py` was deleted in the same PR. It had never been imported
by `server.py`, so nothing was enforced, and its `get_client_ip` read the
**leftmost** `X-Forwarded-For` entry, which is caller-supplied — a spoofed
header would have sidestepped every limit. The replacement skips exactly
`TRUSTED_PROXY_COUNT` hops from the right instead.

⚠️ **`TRUSTED_PROXY_COUNT` must be set to 2 if Cloudflare sits in front of
nginx.** It defaults to 1 (the bare compose stack). Left at 1 behind
Cloudflare, every visitor is counted as a single Cloudflare IP and real users
start getting 429s. See `.env.example`.

**Note on scale:** counters are in-process, which is correct for the single
uvicorn process the compose stack runs (no `--workers`). Moving to multiple
workers or replicas means each holds its own counters and the effective limit
multiplies — that needs a shared store (Redis).

**Testing:** covered by `backend/tests/test_rate_limit_endpoints.py` (429 with
`Retry-After` on each endpoint, per-IP isolation, per-email isolation) and
`test_security.py` (window logic, `X-Forwarded-For` parsing).

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
- [x] Unit test for PayPal amount verification logic — `test_security.py`
- [x] Rate limiter unit tests — `test_security.py`

### Phase 2 (Before Production)
- [x] Integration test: login with correct/incorrect password + rate limiting — `test_rate_limit_endpoints.py`
- [x] Integration test: capture flow with amount mismatch — `test_capture_endpoint.py` (stubbed PayPal, fake DB)
- [ ] Manual: test 429 response in browser
- [ ] Manual: PayPal sandbox payment end-to-end — **do this before the next backend deploy.** Capture now requires `client_id`; an old frontend against the new backend gets a 403 on every capture, so deploy the frontend first.

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

**Last updated:** 2026-09-13  
**Owner:** Security review

### Still open after PR #10
- `GET /api/orders/{id}` is unauthenticated and returns the full order document
  to anyone holding the UUID.
- `DELETE /api/routes/{id}` had no ownership check at all and would delete any
  route for any caller. Fixed in PR #10, noted here because it was not on this
  list and is the same class of hole — worth a sweep of the remaining handlers.
- CRA / `react-scripts` is unmaintained and propped up by a `resolutions` block
  patching vulnerable transitive deps. A Vite migration is the real fix.
- lodash `4.18.1` was flagged as a supply-chain anomaly in the org-wide audit.
  It is not: `4.18.1` is the official `latest` on npm, published 2026-04-01.
  No action needed.
