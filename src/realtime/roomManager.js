import { realtimeRepository } from "../repositories/realtimeRepository.js";

export const roomManager = {
  baseRoomsFor(user) {
    const rooms = [`user:${user.id}`];
    if (user.role === "Doctor") rooms.push(`doctor:${user.id}`);
    if (user.role === "Admin") rooms.push("admin:global");
    return rooms;
  },

  async joinAppointment(socket, appointmentId) {
    const appointment = await realtimeRepository.findAppointmentAccess({ appointmentId, user: socket.user });
    if (!appointment) throw new Error("Appointment room access denied.");
    await socket.join(`appointment:${appointmentId}`);
    return appointment;
  },

  async joinChat(socket, chatSessionId) {
    const session = await realtimeRepository.findChatSessionAccess({ chatSessionId, user: socket.user });
    if (!session) throw new Error("Chat room access denied.");
    await socket.join(`chat:${chatSessionId}`);
    return session;
  },

  async joinConsultation(socket, sessionId) {
    const session = await realtimeRepository.findConsultationAccess({ sessionId, user: socket.user });
    if (!session) throw new Error("Consultation room access denied.");
    await socket.join(`chat:${sessionId}`);
    await socket.join(`appointment:${session.appointment_id}`);
    return session;
  }
};
