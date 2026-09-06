const API_URL = process.env.NEXT_PUBLIC_API_URL;
const TOKEN_KEY = "queueless_auth_token";

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

export function clearToken() {
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${requireApiUrl()}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}
