import { appConfig } from "./config.js";

/**
 * Browser auth/session storage. The access token is short-lived and kept in
 * sessionStorage; refresh tokens are httpOnly cookies controlled by the API.
 */
export function getAccessToken() {
  return sessionStorage.getItem(appConfig.accessTokenKey);
}

export function setAccessToken(token) {
  if (token) sessionStorage.setItem(appConfig.accessTokenKey, token);
}

export function clearAccessToken() {
  sessionStorage.removeItem(appConfig.accessTokenKey);
}

export function requireSession(redirectTo = "/login") {
  if (!getAccessToken()) {
    window.location.assign(redirectTo);
  }
}
