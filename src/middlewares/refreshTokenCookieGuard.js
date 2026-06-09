import { env, getAllowedOrigins } from "../config/env.js";
import { errors } from "../utils/errors.js";

const refreshCookieName = "mx_refresh";

function trustedOrigins() {
  return new Set([env.APP_URL, env.PUBLIC_APP_URL, ...getAllowedOrigins()].filter(Boolean).map((origin) => origin.replace(/\/$/, "")));
}

function hasInvalidBrowserOrigin(req) {
  const origin = req.get("Origin");
  if (!origin) return false;
  return !trustedOrigins().has(origin.replace(/\/$/, ""));
}

export function refreshTokenCookieGuard(req, _res, next) {
  if (hasInvalidBrowserOrigin(req)) {
    return next(errors.forbidden("Invalid request origin."));
  }
  if (!req.cookies?.[refreshCookieName]) {
    return next(errors.unauthorized("Refresh token cookie is required."));
  }
  return next();
}
