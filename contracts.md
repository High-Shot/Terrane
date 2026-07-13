# Terrane — API Contracts & Integration Plan

## Overview
Frontend-only clone now uses mock.js. This backend replaces mocks with real data:
- Geocoding (OpenStreetMap Nominatim) — address/place -> coordinates
- Elevation (Open-Meteo, key-less) — lat/lng -> elevation
- Live map tiles (OSM + Esri hillshade) — rendered client-side via react-leaflet
- Designs persisted in MongoDB (anonymous via localStorage clientId)
- Orders + PayPal checkout (server-side create/capture; DEMO mode until keys provided)

No user auth (skipped per user). Email proof skipped; order stores a `proof_requested` flag.

## Environment
- Backend: MONGO_URL, DB_NAME (existing). PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_MODE (optional; demo mode if absent).
- Frontend: REACT_APP_BACKEND_URL (existing).

## Endpoints (all prefixed /api)

### Geocoding
GET /api/geocode?q=<string>
-> { results: [ { name, sub, lat, lng } ] }  (Nominatim, max 6)

### Elevation
GET /api/elevation?lat=<f>&lng=<f>
-> { elevation_m, elevation_ft }  (Open-Meteo)

### Designs
POST /api/designs  body: { client_id, name, sub, lat, lng, mode, style, size, orientation, elev, image }
-> Design { id, ...fields, created_at }
GET /api/designs?client_id=<id> -> [Design]
DELETE /api/designs/{id} -> { ok: true }

### Orders / PayPal
POST /api/orders  body: { client_id, design }  (design = full design object)
-> { order_id, paypal_order_id?, status, amount, currency, demo: bool, approve_url? }
POST /api/orders/{order_id}/capture  body: { paypal_order_id? }
-> { order_id, status: "paid"|"captured", demo }
GET /api/orders/{order_id} -> Order

PayPal: REST API. get OAuth token -> create order -> return id. Frontend uses @paypal/react-paypal-js
when PAYPAL_CLIENT_ID present; else demo button captures instantly. Capture verifies server-side.

## Frontend integration
- Replace mock geocode/elevation in Studio with API calls (debounced search, Find it).
- MapPreview.jsx: react-leaflet map; relief mode = Esri hillshade, streets = OSM; style tints via overlay.
- Save/My Designs -> /api/designs with clientId from localStorage (terrane_client_id, uuid).
- Order -> POST /api/orders, then PayPal capture (or demo).
- mock.js retained only for Home page static marketing content (acceptable — it's static copy, not data).

## Mocked -> Real
- SAMPLE_PLACES search -> Nominatim geocode
- random elevation -> Open-Meteo
- localStorage-only designs -> MongoDB (still keyed by anon clientId)
- toast-only order -> real Order records + PayPal (demo until keys)
