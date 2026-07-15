# Deploying Terrane on your own infrastructure (Cloudflare in front)

This app is a React frontend + FastAPI backend + MongoDB. The frontend calls the API
at `/api` on the **same origin**, and nginx reverse-proxies `/api` to the backend — so
you only expose one web port and front it with Cloudflare for HTTPS.

> Hosting it on a spare computer at home instead of a rented server? See
> [LAPTOP-SETUP.md](LAPTOP-SETUP.md) — same stack, fronted by a free Cloudflare
> Tunnel (no port forwarding, home IP stays hidden).

## Option A — Docker Compose (recommended, turnkey)

```bash
# 1. Provide secrets
cp .env.example backend/.env
#    edit backend/.env: set JWT_SECRET (openssl rand -hex 32),
#    PAYPAL_CLIENT_ID/SECRET, PAYPAL_MODE=live
#    (MONGO_URL/DB_NAME are auto-set by compose to the bundled mongo service)

# 2. Build & run
docker compose up -d --build

# 3. Verify
curl http://localhost/api/config      # -> {"paypal_enabled": true, ...}
# open http://<server-ip>/ in a browser
```

Data/persistence:
- MongoDB data → `mongo_data` volume
- Uploaded GPX files → `uploads_data` volume (survives redeploys)

## Cloudflare
1. DNS: add an **A record** for your domain pointing to the server's public IP
   (proxy/orange-cloud ON is fine).
2. SSL/TLS mode: **Full (strict)** (or Full). Cloudflare terminates HTTPS; the origin
   serves the app on port 80.
3. Because auth uses `SameSite=None; Secure` cookies, HTTPS (via Cloudflare) is required
   in production — which you get automatically.

## Option B — Manual (no Docker)

**Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# set env vars (MONGO_URL, DB_NAME, JWT_SECRET, PAYPAL_*), then:
uvicorn server:app --host 0.0.0.0 --port 8001
```

**Frontend**
```bash
cd frontend
yarn install
REACT_APP_BACKEND_URL="" yarn build   # empty => same-origin /api
# serve ./build with nginx using frontend/nginx.conf as a template
```

**Nginx** (host-level): use `frontend/nginx.conf` — it serves the SPA and proxies
`/api/` to `http://127.0.0.1:8001` (adjust the upstream host/port for a non-Docker setup).

## Important notes for this app
- `REACT_APP_BACKEND_URL` must be **empty** (same-origin) or your bare domain **without** `/api`.
  The frontend appends `/api` itself; using `https://domain/api` would call `/api/api/...`.
- Backend entrypoint is `server:app` (not `main:app`).
- `PAYPAL_MODE=live` processes **real** payments. Use sandbox creds to test first.
- Never commit `backend/.env` / `frontend/.env` (already gitignored).
