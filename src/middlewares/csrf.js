import { env } from "../config/env.js";
import { randomToken, safeEqual, signValue } from "../utils/crypto.js";
import { errors } from "../utils/errors.js";
import lusca from "lusca";

const cookieName = "mx_csrf";
const csrfHeaderName = "X-CSRF-Token";
const webhookCsrfBypassPath = "/api/payments/opay/webhook";

function csrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax",
    secure: env.NODE_ENV === "production"
  };
}

function createCsrfToken() {
  const value = randomToken(24);
  return `${value}.${signValue(value, env.CSRF_SECRET)}`;
}

function verifyCsrfToken(token) {
  const [value, signature] = String(token || "").split(".");
  if (!value || !signature) return false;
  return safeEqual(signature, signValue(value, env.CSRF_SECRET));
}

function readValidCookieToken(req) {
  const token = req.cookies?.[cookieName];
  return verifyCsrfToken(token) ? token : null;
}

function setCsrfCookie(res, token) {
  res.cookie(cookieName, token, csrfCookieOptions());
}

function tokenForRequest(req) {
  return readValidCookieToken(req) || createCsrfToken();
}

const luscaCsrfProtection = lusca.csrf({
  key: "csrfToken",
  header: csrfHeaderName,
  cookie: {
    name: cookieName,
    options: csrfCookieOptions()
  },
  blocklist: [{ path: webhookCsrfBypassPath, type: "exact" }],
  impl: {
    create(req) {
      return {
        token: tokenForRequest(req),
        validate(request, token) {
          const cookieToken = readValidCookieToken(request);
          return Boolean(cookieToken && token && safeEqual(cookieToken, token));
        }
      };
    }
  }
});

export function issueCsrfToken(req, res) {
  const token = typeof req.csrfToken === "function" ? req.csrfToken() : createCsrfToken();
  setCsrfCookie(res, token);
  return token;
}

export function csrfProtection(req, res, next) {
  return luscaCsrfProtection(req, res, (error) => {
    if (error?.message?.startsWith("CSRF token")) {
      return next(errors.forbidden("Invalid CSRF token."));
    }
    return next(error);
  });
}
