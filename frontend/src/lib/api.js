import axios from "axios";

// Unset REACT_APP_BACKEND_URL means same-origin: nginx proxies /api to the backend.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;

// Cookie-based auth: the JWT lives in an httpOnly cookie set by the backend.
// withCredentials ensures the browser sends that cookie with every request.
export const api = axios.create({ baseURL: API, withCredentials: true });

// Static hosts with an SPA fallback (e.g. Cloudflare Pages) answer unknown
// paths — including /api/* when no backend is attached — with index.html and
// HTTP 200. Treat any HTML reply as a failed request so callers hit their
// normal error handling instead of rendering an HTML string as data.
api.interceptors.response.use((response) => {
  const type = String(response.headers?.["content-type"] || "");
  if (type.includes("text/html")) {
    return Promise.reject(new Error("API unavailable: got HTML instead of JSON"));
  }
  return response;
});

// Anonymous client id (non-sensitive guest identifier) persisted in browser
export function getClientId() {
  let id = localStorage.getItem("terrane_client_id");
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("terrane_client_id", id);
  }
  return id;
}

// Upload a GPX file with progress. Returns parsed route doc.
export async function uploadRoute(file, clientId, onProgress) {
  const form = new FormData();
  form.append("client_id", clientId);
  form.append("file", file);
  const { data } = await api.post("/routes/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

export async function fetchRoute(routeId) {
  const { data } = await api.get(`/routes/${routeId}`);
  return data;
}

// Submit a build request (intent capture — no upfront payment).
export async function submitBuildRequest(payload) {
  const { data } = await api.post('/build-requests', payload);
  return data;
}

// Send a contact-form message. Persisted server-side and emailed best-effort.
export async function submitContact(payload) {
  const { data } = await api.post('/contact', payload);
  return data;
}

// ---------------------------------------------------------------------------
// Backend-optional lookups. The backend proxies Nominatim/Photon/open-meteo;
// when it's unreachable (e.g. a static-hosted preview with no API attached),
// we call the same public CORS-enabled services directly from the browser so
// search and elevation keep working. Backend stays the primary path.
// ---------------------------------------------------------------------------

async function geocodeNominatimDirect(q) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '6');
  url.searchParams.set('addressdetails', '1');
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`nominatim ${r.status}`);
  const data = await r.json();
  return data
    .map((item) => {
      const parts = String(item.display_name || '').split(',').map((s) => s.trim());
      const name = parts.length > 1 ? parts.slice(0, 2).join(', ') : (parts[0] || '');
      const sub = parts.length > 2 ? parts.slice(2, 4).join(', ') : (item.type || '');
      const lat = parseFloat(item.lat), lng = parseFloat(item.lon);
      return Number.isFinite(lat) && Number.isFinite(lng) && name ? { name, sub, lat, lng } : null;
    })
    .filter(Boolean);
}

async function geocodePhotonDirect(q) {
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '6');
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`photon ${r.status}`);
  const data = await r.json();
  return (data.features || [])
    .map((f) => {
      const p = f.properties || {};
      const [lng, lat] = (f.geometry && f.geometry.coordinates) || [];
      if (lat == null || lng == null) return null;
      const name = p.name || p.city || p.street || 'Location';
      const sub = [p.city !== name ? p.city : null, p.state, p.country].filter(Boolean).join(', ');
      return { name, sub, lat: parseFloat(lat), lng: parseFloat(lng) };
    })
    .filter(Boolean);
}

// Search places: backend first, then direct browser geocoding as fallback.
export async function searchPlaces(q) {
  try {
    const { data } = await api.get('/geocode', { params: { q } });
    return data.results || [];
  } catch {
    try {
      const results = await geocodeNominatimDirect(q);
      if (results.length) return results;
    } catch { /* fall through to photon */ }
    try {
      return await geocodePhotonDirect(q);
    } catch {
      return null; // null = every path failed (offline), distinct from [] = no matches
    }
  }
}

// Elevation in feet: backend first, then open-meteo directly.
export async function fetchElevationFt(lat, lng) {
  try {
    const { data } = await api.get('/elevation', { params: { lat, lng } });
    return data.elevation_ft;
  } catch {
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
    if (!r.ok) throw new Error(`elevation ${r.status}`);
    const data = await r.json();
    const m = (data.elevation && data.elevation[0]) || 0;
    return Math.round(m * 3.28084);
  }
}
