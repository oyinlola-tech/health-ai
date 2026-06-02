import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { createId } from "../utils/uuid.js";

export function signAccessToken(user) {
  return jwt.sign(
    {
      role: user.role,
      email: user.email
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: user.id,
      expiresIn: env.JWT_ACCESS_TTL_SECONDS
    }
  );
}

export function signRefreshToken(user, tokenId = createId()) {
  const token = jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: user.id,
    jwtid: tokenId,
    expiresIn: env.JWT_REFRESH_TTL_SECONDS
  });
  return { token, tokenId };
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

export function signEmailVerificationToken(user) {
  return jwt.sign({ purpose: "email_verification" }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: "24h"
  });
}

export function verifyEmailVerificationToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}
