# Terrane

Custom 3D-printed terrain maps of the places that matter — [terranemaps.com](https://terranemaps.com).

Design a map in the studio (search any place, tune the frame style/size/orientation, overlay a GPX route), save designs to your account, and order a print.

## Stack

- **Frontend** — React (Create React App + craco), Tailwind CSS, shadcn/radix UI, Leaflet maps. Lives in `frontend/`.
- **Backend** — FastAPI + MongoDB (motor), JWT auth via httpOnly cookies, PayPal checkout. Lives in `backend/`, entrypoint `server:app`.
- **Serving** — nginx serves the built SPA and reverse-proxies `/api` to the backend on the same origin.

## Local development

Backend (needs a running MongoDB):

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
MONGO_URL=mongodb://localhost:27017 DB_NAME=terrane uvicorn server:app --reload --port 8001
```

Frontend:

```bash
cd frontend
yarn install
REACT_APP_BACKEND_URL=http://localhost:8001 yarn start
```

Without PayPal credentials the order flow runs in demo mode (no real payments).

## Deployment

See [DEPLOY.md](DEPLOY.md) — Docker Compose (frontend + backend + MongoDB) behind Cloudflare. Copy `.env.example` to `backend/.env` and fill in the secrets first.
