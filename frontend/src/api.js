const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = (
  configuredApiBase ||
  (import.meta.env.DEV ? "http://127.0.0.1:8001" : window.location.origin)
).replace(/\/+$/, "");

export function apiUrl(path) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

export function websocketUrl(path) {
  const websocketBase = API_BASE_URL.replace(/^http/i, "ws");
  return `${websocketBase}/${path.replace(/^\/+/, "")}`;
}
