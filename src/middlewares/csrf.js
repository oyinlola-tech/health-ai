import { env } from "../config/env.js";
import { randomToken, safeEqual, signValue } from "../utils/crypto.js";
import { errors } from "../utils/errors.js";

const cookieName = "mx_csrf";
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function createCsrfToken() {
  const value = randomToken(24);
  return `${value}.${signValue(value, env.CSRF_SECRET)}`;
}

function verifyCsrfToken(token) {
  const [value, signature] = String(token || "").split(".");
  if (!value || !signature) return false;
  return safeEqual(signature, signValue(value, env.CSRF_SECRET));
}

export function issueCsrfToken(_req, res) {
  const token = createCsrfToken();
  res.cookie(cookieName, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: env.NODE_ENV === "production"
  });
  return token;
}

export function csrfProtection(req, _res, next) {
  if (req.originalUrl === "/api/payments/opay/webhook") return next();
  if (!unsafeMethods.has(req.method)) return next();
  const cookieToken = req.cookies?.[cookieName];
  const headerToken = req.get("X-CSRF-Token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken || !verifyCsrfToken(cookieToken)) {
    return next(errors.forbidden("Invalid CSRF token."));
  }
  return next();
}
