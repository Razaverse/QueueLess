const API_URL = process.env.NEXT_PUBLIC_API_URL;
const TOKEN_KEY = "queueless_auth_token";
const USER_KEY = "queueless_authenticated_user";

function requireApiUrl() {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return API_URL;
}

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

function jwtPayload(token) {
  try {
    return JSON.parse(window.atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function getSessionUser() {
  if (typeof window === "undefined") return null;
  const token = getToken();
  if (!token) return null;
  const payload = jwtPayload(token);
  // This is only a local, conservative expiry check for initial rendering.
  // The backend still verifies the signature and authorization on every API call.
  if (!payload || typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) {
    clearToken();
    return null;
  }
  try {
    const user = JSON.parse(window.sessionStorage.getItem(USER_KEY) ?? "null");
    if (user && typeof user.id === "string" && typeof user.name === "string" && typeof user.role === "string") return user;
  } catch {
    // Fall through to the tab's JWT payload below.
  }

  return typeof payload.userId === "string" && typeof payload.role === "string" ? { id: payload.userId, name: "", role: payload.role } : null;
}

export function saveSessionUser(user) {
  window.sessionStorage.setItem(USER_KEY, JSON.stringify({ id: user.id, name: user.name, role: user.role }));
}

export function clearToken() {
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const startedAt = typeof performance !== "undefined" ? performance.now() : 0;
  const response = await fetch(`${requireApiUrl()}${path}`, { ...options, headers });
  if (process.env.NEXT_PUBLIC_PERFORMANCE_LOGGING === "true" && typeof performance !== "undefined") {
    console.info(JSON.stringify({ type: "api_request", method: options.method ?? "GET", path, status: response.status, durationMs: Number((performance.now() - startedAt).toFixed(1)) }));
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("queueless-session-expired"));
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}
