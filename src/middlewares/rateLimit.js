import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { errors } from "../utils/errors.js";

const abuseBans = new Map();

function ipRateKey(ip = "") {
  const value = String(ip || "unknown");
  if (!value.includes(":")) return value;
  return value.split(":").slice(0, 4).join(":");
}

function keyFor(req, scope) {
  return `${scope}:${req.user?.id || ipRateKey(req.ip)}`;
}

export function abuseBanGuard(scope = "global") {
  return (req, _res, next) => {
    const key = keyFor(req, scope);
    const bannedUntil = abuseBans.get(key) || 0;
    if (bannedUntil > Date.now()) return next(errors.forbidden("Too many requests. Try again later."));
    if (bannedUntil) abuseBans.delete(key);
    return next();
  };
}

function rememberAbuse(req, scope, retryAfterMs = 10 * 60 * 1000) {
  abuseBans.set(keyFor(req, scope), Date.now() + retryAfterMs);
}

function moduleLimit({ windowMs, max, scope }) {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => req.user?.id || ipRateKey(req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, _res, next) {
      rememberAbuse(req, scope);
      next(errors.forbidden("Rate limit exceeded. Try again later."));
    }
  });
}

export const apiRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false
});

export const appRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: Math.max(env.RATE_LIMIT_MAX * 5, 600),
  standardHeaders: true,
  legacyHeaders: false
});

export const publicReadRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: Math.max(env.RATE_LIMIT_MAX * 3, 300),
  standardHeaders: true,
  legacyHeaders: false
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

export const sensitiveAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

export const aiEndpointRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: env.AI_PER_MINUTE_REQUEST_LIMIT || 8,
  keyGenerator: (req) => req.user?.id || ipRateKey(req.ip),
  standardHeaders: true,
  legacyHeaders: false
});

export const paymentRateLimit = moduleLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  scope: "payment"
});

export const couponRateLimit = moduleLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  scope: "coupon"
});

export const webhookRateLimit = moduleLimit({
  windowMs: 60 * 1000,
  max: 120,
  scope: "payment-webhook"
});

export const bookingRateLimit = moduleLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  scope: "booking"
});

export const uploadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  keyGenerator: (req) => req.user?.id || ipRateKey(req.ip),
  standardHeaders: true,
  legacyHeaders: false
});
