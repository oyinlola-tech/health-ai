import { appConfig } from "./config.js";
import { clearAccessToken, getAccessToken, setAccessToken } from "./auth.js";

let csrfToken = null;

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${appConfig.apiBaseUrl}/auth/csrf`, {
    credentials: "include"
  });
  const payload = await response.json();
  csrfToken = payload?.data?.csrfToken;
  return csrfToken;
}

async function refreshAccessToken() {
  const response = await fetch(`${appConfig.apiBaseUrl}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      [appConfig.csrfHeader]: await ensureCsrfToken()
    }
  });
  if (!response.ok) {
    clearAccessToken();
    return null;
  }
  const payload = await response.json();
  const token = payload?.data?.accessToken;
  setAccessToken(token);
  return token;
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set(appConfig.csrfHeader, await ensureCsrfToken());
  }

  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...options,
    method,
    credentials: "include",
    headers,
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 401 && !options.skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest(path, { ...options, skipRefresh: true });
    }
  }

  const payload = await response.json().catch(() => ({
    success: false,
    error: { message: "The server returned an unreadable response." }
  }));

  if (!response.ok || payload.success === false) {
    const message = payload?.error?.message || "Request failed.";
    throw Object.assign(new Error(message), { status: response.status, payload });
  }

  return payload;
}
