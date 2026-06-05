let io = null;

export function setSocketServer(server) {
  io = server;
}

export function isSocketServerReady() {
  return Boolean(io);
}

export const socketHub = {
  toUser(userId, event, payload) {
    io?.to(`user:${userId}`).emit(event, payload);
  },

  toDoctor(doctorId, event, payload) {
    io?.to(`doctor:${doctorId}`).emit(event, payload);
  },

  toAppointment(appointmentId, event, payload) {
    io?.to(`appointment:${appointmentId}`).emit(event, payload);
  },

  toConsultation(sessionId, event, payload) {
    io?.to(`chat:${sessionId}`).emit(event, payload);
  },

  toDoctors(event, payload) {
    io?.to("role:Doctor").emit(event, payload);
  },

  toAdmins(event, payload) {
    io?.to("admin:global").emit(event, payload);
  }
};
