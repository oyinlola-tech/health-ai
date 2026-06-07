import crypto from "node:crypto";
import { env } from "../config/env.js";

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function signValue(value, secret) {
  // This signs random CSRF/session tokens only; user passwords are hashed with bcrypt in authService.js.
  // codeql[js/insufficient-password-hash]
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function tokenDigest(value) {
  return signValue(value, env.COOKIE_SECRET);
}
