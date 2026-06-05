let io = null;

export function setSocketServer(server) {
  io = server;
}

export const socketHub = {
  toUser(userId, event, payload) {
    io?.to(`user:${userId}`).emit(event, payload);
  },

  toConsultation(sessionId, event, payload) {
    io?.to(`consultation:${sessionId}`).emit(event, payload);
  },

  toDoctors(event, payload) {
    io?.to("role:Doctor").emit(event, payload);
  }
};
