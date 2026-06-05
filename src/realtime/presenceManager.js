import { realtimeRepository } from "../repositories/realtimeRepository.js";

const onlineUsers = new Map();
const doctorAvailability = new Map();

export const presenceManager = {
  async markConnected(user, socketId) {
    onlineUsers.set(user.id, { socketId, role: user.role, lastSeenAt: new Date().toISOString() });
    if (user.role === "Doctor") doctorAvailability.set(user.id, "ONLINE");
    await realtimeRepository.recordPresence({ user, status: "ONLINE", socketId });
  },

  async markDisconnected(user, socketId) {
    onlineUsers.delete(user.id);
    if (user.role === "Doctor") doctorAvailability.set(user.id, "OFFLINE");
    await realtimeRepository.recordPresence({ user, status: "OFFLINE", socketId });
  },

  async setDoctorAvailability(user, status, socketId) {
    const normalized = status === "AVAILABLE" ? "AVAILABLE" : "UNAVAILABLE";
    doctorAvailability.set(user.id, normalized);
    await realtimeRepository.recordPresence({ user, status: normalized, socketId });
    return normalized;
  },

  isOnline(userId) {
    return onlineUsers.has(userId);
  },

  doctorStatus(doctorId) {
    return doctorAvailability.get(doctorId) || "OFFLINE";
  },

  snapshot() {
    return {
      usersOnline: onlineUsers.size,
      doctors: Object.fromEntries(doctorAvailability.entries())
    };
  }
};
