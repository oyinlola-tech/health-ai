import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/userRepository.js";
import { consultationRepository } from "../repositories/consultationRepository.js";
import { setSocketServer } from "./hub.js";

export function registerSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.PUBLIC_APP_URL,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required."));
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
      const user = await userRepository.findById(payload.sub);
      if (!user || user.deleted_at) return next(new Error("Invalid session."));
      socket.user = user;
      return next();
    } catch {
      return next(new Error("Invalid session."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.join(`role:${socket.user.role}`);

    socket.on("consultation:join", async ({ sessionId }) => {
      const session = await consultationRepository.findForUser(sessionId, socket.user);
      if (session) socket.join(`consultation:${sessionId}`);
    });

    socket.on("consultation:typing", async ({ sessionId, isTyping }) => {
      const session = await consultationRepository.findForUser(sessionId, socket.user);
      if (session) socket.to(`consultation:${sessionId}`).emit("consultation.typing", { sessionId, userId: socket.user.id, isTyping: Boolean(isTyping) });
    });
  });

  setSocketServer(io);
  return { enabled: true };
}
