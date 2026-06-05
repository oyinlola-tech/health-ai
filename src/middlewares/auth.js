import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/userRepository.js";
import { errors } from "../utils/errors.js";

export async function authenticate(req, _res, next) {
  try {
    const header = req.get("Authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return next(errors.unauthorized());

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ["HS256"]
    });
    if (payload.typ !== "access") return next(errors.unauthorized("Invalid access token."));
    const user = await userRepository.findById(payload.sub);
    if (!user || user.deleted_at) return next(errors.unauthorized("User session is no longer valid."));

    req.user = user;
    return next();
  } catch {
    return next(errors.unauthorized("Invalid or expired access token."));
  }
}

export function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(errors.unauthorized());
    if (!roles.includes(req.user.role)) return next(errors.forbidden());
    return next();
  };
}

export function requireOwnership(getOwnerId) {
  return async (req, _res, next) => {
    const ownerId = await getOwnerId(req);
    if (req.user?.role === "Admin" || ownerId === req.user?.id) return next();
    return next(errors.forbidden("You can only access your own data."));
  };
}
