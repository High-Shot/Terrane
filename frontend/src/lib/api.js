import axios from "axios";

// Unset REACT_APP_BACKEND_URL means same-origin: nginx proxies /api to the backend.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;

// Cookie-based auth: the JWT lives in an httpOnly cookie set by the backend.
// withCredentials ensures the browser sends that cookie with every request.
export const api = axios.create({ baseURL: API, withCredentials: true });

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
