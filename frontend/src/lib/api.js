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
