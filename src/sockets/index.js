import { createSocketServer } from "../realtime/socketServer.js";

export function registerSockets(httpServer) {
  createSocketServer(httpServer);
  return { enabled: true };
}
