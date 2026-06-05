import { Server } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { setSocketServer } from "../sockets/hub.js";
import { authSocketMiddleware } from "./authSocketMiddleware.js";
import { registerEventHandlers } from "./eventHandler.js";
import { presenceManager } from "./presenceManager.js";
import { roomManager } from "./roomManager.js";

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.PUBLIC_APP_URL,
      credentials: true
    },
    transports: ["websocket", "polling"]
  });

  io.use(authSocketMiddleware());

  io.on("connection", async (socket) => {
    for (const room of roomManager.baseRoomsFor(socket.user)) socket.join(room);
    await presenceManager.markConnected(socket.user, socket.id);
    socket.emit("user_connected", { userId: socket.user.id });
    socket.broadcast.to("admin:global").emit("user_connected", { userId: socket.user.id, role: socket.user.role });
    if (socket.user.role === "Doctor") socket.broadcast.emit("doctor_online", { doctorId: socket.user.id });

    registerEventHandlers(io, socket);

    socket.on("disconnect", async () => {
      await presenceManager.markDisconnected(socket.user, socket.id);
      socket.broadcast.to("admin:global").emit("user_disconnected", { userId: socket.user.id, role: socket.user.role });
      if (socket.user.role === "Doctor") socket.broadcast.emit("doctor_offline", { doctorId: socket.user.id });
      logger.info("Socket disconnected.", { socketId: socket.id, userId: socket.user.id });
    });
  });

  setSocketServer(io);
  return io;
}
