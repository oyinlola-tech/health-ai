import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { createId } from "../utils/uuid.js";

export function signAccessToken(user) {
  return jwt.sign(
    {
      role: user.role,
      email: user.email,
      typ: "access"
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: user.id,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithm: "HS256",
      expiresIn: env.JWT_ACCESS_TTL_SECONDS
    }
  );
}

export function signRefreshToken(user, tokenId = createId()) {
  const token = jwt.sign({ typ: "refresh" }, env.JWT_REFRESH_SECRET, {
    subject: user.id,
    jwtid: tokenId,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: "HS256",
    expiresIn: env.JWT_REFRESH_TTL_SECONDS
  });
  return { token, tokenId };
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: ["HS256"]
  });
  if (payload.typ !== "refresh") throw new Error("Invalid token type.");
  return payload;
}

export function signEmailVerificationToken(user) {
  return jwt.sign({ purpose: "email_verification" }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: "HS256",
    expiresIn: "24h"
  });
}

export function verifyEmailVerificationToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: ["HS256"]
  });
}
