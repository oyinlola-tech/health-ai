/**
 * @file API communication and auth token helpers.
 * @module assets/js/api/client.js
 */

// -----------------------------------------------------------------------------
// API communication and auth token helpers.
// -----------------------------------------------------------------------------

const appConfig = {
  apiBaseUrl: "/api",
  csrfHeader: "x-csrf-token",
  accessTokenKey: "medexplain_access_token",
  requestTimeoutMs: 20000
};

function loadRealtimeClient() {
  if (window.medRealtime || document.querySelector('script[src="/assets/js/socket-client.js"]')) return;
  const script = document.createElement("script");
  script.src = "/assets/js/socket-client.js";
  script.defer = true;
  document.head.appendChild(script);
}

let csrfToken = null;

function getAccessToken() {
  return sessionStorage.getItem(appConfig.accessTokenKey);
}

function setAccessToken(token) {
  if (token) sessionStorage.setItem(appConfig.accessTokenKey, token);
}

function clearAccessToken() {
  sessionStorage.removeItem(appConfig.accessTokenKey);
}

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${appConfig.apiBaseUrl}/auth/csrf`, { credentials: "include" });
  const payload = await response.json();
  csrfToken = payload?.data?.csrfToken;
  return csrfToken;
}

async function refreshAccessToken() {
  const response = await fetch(`${appConfig.apiBaseUrl}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { [appConfig.csrfHeader]: await ensureCsrfToken() }
  });
  if (!response.ok) {
    clearAccessToken();
    return null;
  }
  const payload = await response.json();
  const token = payload?.data?.accessToken;
  setAccessToken(token);
  if (token) loadRealtimeClient();
  return token;
}

async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs || appConfig.requestTimeoutMs);
  headers.set("Accept", "application/json");
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set(appConfig.csrfHeader, await ensureCsrfToken());
  }

  let response;
  try {
    response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      ...options,
      method,
      credentials: "include",
      headers,
      signal: options.signal || controller.signal,
      body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (error) {
    if (error.name === "AbortError") throw Object.assign(new Error("The server took too long to respond."), { status: 408 });
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (response.status === 401 && token && !options.skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest(path, { ...options, skipRefresh: true });
  }

  const payload = await response.json().catch(() => ({
    success: false,
    error: { message: "The server returned an unreadable response." }
  }));

  if (!response.ok || payload.success === false) {
    const message = payload?.error?.message || "Request failed.";
    if (response.status === 401) handleUnauthorizedResponse();
    throw Object.assign(new Error(message), { status: response.status, payload });
  }

  return payload;
}

function handleUnauthorizedResponse() {
  clearAccessToken();
  const path = typeof normalizePath === "function" ? normalizePath(location.pathname) : location.pathname;
  if (typeof requiresSignedInUser === "function" && requiresSignedInUser(path)) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    window.location.assign(`/login?next=${next}`);
  }
}
