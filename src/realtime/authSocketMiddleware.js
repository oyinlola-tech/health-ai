import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/userRepository.js";
import { logger } from "../utils/logger.js";

export function authSocketMiddleware() {
  return async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");
      if (!token) return next(new Error("Authentication required."));
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        algorithms: ["HS256"]
      });
      if (payload.typ !== "access") throw new Error("Invalid access token type.");
      const user = await userRepository.findById(payload.sub);
      if (!user || user.deleted_at) return next(new Error("Invalid session."));
      socket.user = user;
      return next();
    } catch (error) {
      logger.warn("Rejected socket connection.", { message: error.message, socketId: socket.id });
      return next(new Error("Invalid session."));
    }
  };
}
