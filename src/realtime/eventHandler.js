import { consultationRepository } from "../repositories/consultationRepository.js";
import { realtimeRepository } from "../repositories/realtimeRepository.js";
import { decryptMessage, encryptMessage } from "../utils/messageCrypto.js";
import { logger } from "../utils/logger.js";
import { presenceManager } from "./presenceManager.js";
import { roomManager } from "./roomManager.js";

const messageRate = new Map();
const messageWindowMs = 10_000;
const maxMessagesPerWindow = 20;

function underMessageLimit(userId) {
  const now = Date.now();
  const bucket = messageRate.get(userId) || [];
  const recent = bucket.filter((timestamp) => now - timestamp < messageWindowMs);
  recent.push(now);
  messageRate.set(userId, recent);
  return recent.length <= maxMessagesPerWindow;
}

function emitAck(callback, payload) {
  if (typeof callback === "function") callback(payload);
}

export function registerEventHandlers(io, socket) {
  socket.on("join_appointment", async ({ appointmentId }, callback) => {
    try {
      await roomManager.joinAppointment(socket, appointmentId);
      emitAck(callback, { ok: true });
    } catch (error) {
      logger.warn("Socket appointment room denied.", { userId: socket.user.id, appointmentId });
      emitAck(callback, { ok: false, error: error.message });
    }
  });

  socket.on("join_chat", async ({ chatSessionId, consultationSessionId }, callback) => {
    try {
      if (chatSessionId) await roomManager.joinChat(socket, chatSessionId);
      if (consultationSessionId) await roomManager.joinConsultation(socket, consultationSessionId);
      emitAck(callback, { ok: true });
    } catch (error) {
      logger.warn("Socket chat room denied.", { userId: socket.user.id, chatSessionId, consultationSessionId });
      emitAck(callback, { ok: false, error: error.message });
    }
  });

  socket.on("message_send", async (payload, callback) => {
    try {
      if (!underMessageLimit(socket.user.id)) throw new Error("Message rate limit exceeded.");
      const sessionId = payload?.sessionId || payload?.consultationSessionId;
      const session = await consultationRepository.findForUser(sessionId, socket.user);
      if (!session) throw new Error("Consultation access denied.");
      const receiverId = socket.user.id === session.patient_id ? session.doctor_id : session.patient_id;
      const message = await consultationRepository.addMessage({
        sessionId,
        senderId: socket.user.id,
        recipientId: receiverId,
        content: payload.content,
        encryptedContent: encryptMessage(payload.content)
      });
      await realtimeRepository.upsertDeliveryStatus({ messageId: message.id, userId: receiverId, status: "DELIVERED" });
      io.to(`chat:${sessionId}`).emit("message_receive", { ...message, receiverId, timestamp: message.created_at });
      io.to(`user:${receiverId}`).emit("notification_push", { type: "NEW_MESSAGE", sessionId, senderId: socket.user.id });
      emitAck(callback, { ok: true, message });
    } catch (error) {
      logger.warn("Socket message_send rejected.", { userId: socket.user.id, message: error.message });
      emitAck(callback, { ok: false, error: error.message });
    }
  });

  socket.on("typing_start", async ({ sessionId }) => {
    const session = await consultationRepository.findForUser(sessionId, socket.user);
    if (session) socket.to(`chat:${sessionId}`).emit("typing_start", { sessionId, userId: socket.user.id });
  });

  socket.on("typing_stop", async ({ sessionId }) => {
    const session = await consultationRepository.findForUser(sessionId, socket.user);
    if (session) socket.to(`chat:${sessionId}`).emit("typing_stop", { sessionId, userId: socket.user.id });
  });

  socket.on("message_read", async ({ sessionId, messageId }) => {
    const session = await consultationRepository.findForUser(sessionId, socket.user);
    if (!session) return;
    await realtimeRepository.upsertDeliveryStatus({ messageId, userId: socket.user.id, status: "READ" });
    await consultationRepository.markRead({ sessionId, recipientId: socket.user.id });
    socket.to(`chat:${sessionId}`).emit("message_read", { sessionId, messageId, userId: socket.user.id });
  });

  socket.on("doctor_available", async () => {
    if (socket.user.role !== "Doctor") return;
    await presenceManager.setDoctorAvailability(socket.user, "AVAILABLE", socket.id);
    io.to("admin:global").emit("doctor_available", { doctorId: socket.user.id });
    io.to(`doctor:${socket.user.id}`).emit("doctor_available", { doctorId: socket.user.id });
  });

  socket.on("doctor_unavailable", async () => {
    if (socket.user.role !== "Doctor") return;
    await presenceManager.setDoctorAvailability(socket.user, "UNAVAILABLE", socket.id);
    io.to("admin:global").emit("doctor_unavailable", { doctorId: socket.user.id });
    io.to(`doctor:${socket.user.id}`).emit("doctor_unavailable", { doctorId: socket.user.id });
  });

  socket.on("notification_read", async ({ notificationId }) => {
    await realtimeRepository.markNotificationRead({ userId: socket.user.id, notificationId });
    socket.emit("notification_read", { notificationId });
  });

  socket.on("notification_clear", async () => {
    await realtimeRepository.clearNotifications(socket.user.id);
    socket.emit("notification_clear", { cleared: true });
  });

  socket.on("decrypt_history", async ({ sessionId }, callback) => {
    const session = await consultationRepository.findForUser(sessionId, socket.user);
    if (!session) return emitAck(callback, { ok: false, error: "Consultation access denied." });
    const messages = await consultationRepository.messages(sessionId);
    emitAck(callback, { ok: true, messages: messages.map((message) => ({ ...message, content: decryptMessage(message.encrypted_content) })) });
  });
}
