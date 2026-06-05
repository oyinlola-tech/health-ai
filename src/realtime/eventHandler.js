import { z } from "zod";
import { consultationRepository } from "../repositories/consultationRepository.js";
import { realtimeRepository } from "../repositories/realtimeRepository.js";
import { decryptMessage, encryptMessage } from "../utils/messageCrypto.js";
import { logger } from "../utils/logger.js";
import { presenceManager } from "./presenceManager.js";
import { roomManager } from "./roomManager.js";

const messageRate = new Map();
const messageWindowMs = 10_000;
const maxMessagesPerWindow = 20;
const idSchema = z.string().uuid();
const joinAppointmentSchema = z.object({ appointmentId: idSchema }).strict();
const joinChatSchema = z
  .object({
    chatSessionId: idSchema.optional(),
    consultationSessionId: idSchema.optional()
  })
  .strict()
  .refine((value) => value.chatSessionId || value.consultationSessionId, "A chat or consultation session id is required.");
const messageSendSchema = z
  .object({
    sessionId: idSchema.optional(),
    consultationSessionId: idSchema.optional(),
    content: z.string().trim().min(1).max(4000)
  })
  .strict()
  .refine((value) => value.sessionId || value.consultationSessionId, "A consultation session id is required.");
const messageReadSchema = z.object({ sessionId: idSchema, messageId: idSchema }).strict();
const notificationReadSchema = z.object({ notificationId: idSchema }).strict();

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
  socket.on("join_appointment", async (payload, callback) => {
    try {
      const { appointmentId } = joinAppointmentSchema.parse(payload);
      await roomManager.joinAppointment(socket, appointmentId);
      emitAck(callback, { ok: true });
    } catch (error) {
      logger.warn("Socket appointment room denied.", { userId: socket.user.id, appointmentId: payload?.appointmentId });
      emitAck(callback, { ok: false, error: error.message });
    }
  });

  socket.on("join_chat", async (payload, callback) => {
    try {
      const { chatSessionId, consultationSessionId } = joinChatSchema.parse(payload);
      if (chatSessionId) await roomManager.joinChat(socket, chatSessionId);
      if (consultationSessionId) await roomManager.joinConsultation(socket, consultationSessionId);
      emitAck(callback, { ok: true });
    } catch (error) {
      logger.warn("Socket chat room denied.", { userId: socket.user.id, chatSessionId: payload?.chatSessionId, consultationSessionId: payload?.consultationSessionId });
      emitAck(callback, { ok: false, error: error.message });
    }
  });

  socket.on("message_send", async (payload, callback) => {
    try {
      const parsed = messageSendSchema.parse(payload);
      if (!underMessageLimit(socket.user.id)) throw new Error("Message rate limit exceeded.");
      const sessionId = parsed.sessionId || parsed.consultationSessionId;
      const session = await consultationRepository.findForUser(sessionId, socket.user);
      if (!session) throw new Error("Consultation access denied.");
      const receiverId = socket.user.id === session.patient_id ? session.doctor_id : session.patient_id;
      const message = await consultationRepository.addMessage({
        sessionId,
        senderId: socket.user.id,
        recipientId: receiverId,
        content: parsed.content,
        encryptedContent: encryptMessage(parsed.content)
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

  socket.on("typing_start", async (payload) => {
    try {
      const { sessionId } = z.object({ sessionId: idSchema }).strict().parse(payload);
      const session = await consultationRepository.findForUser(sessionId, socket.user);
      if (session) socket.to(`chat:${sessionId}`).emit("typing_start", { sessionId, userId: socket.user.id });
    } catch (error) {
      logger.warn("Socket typing_start rejected.", { userId: socket.user.id, message: error.message });
    }
  });

  socket.on("typing_stop", async (payload) => {
    try {
      const { sessionId } = z.object({ sessionId: idSchema }).strict().parse(payload);
      const session = await consultationRepository.findForUser(sessionId, socket.user);
      if (session) socket.to(`chat:${sessionId}`).emit("typing_stop", { sessionId, userId: socket.user.id });
    } catch (error) {
      logger.warn("Socket typing_stop rejected.", { userId: socket.user.id, message: error.message });
    }
  });

  socket.on("message_read", async (payload) => {
    try {
      const { sessionId, messageId } = messageReadSchema.parse(payload);
      const session = await consultationRepository.findForUser(sessionId, socket.user);
      if (!session) return;
      await realtimeRepository.upsertDeliveryStatus({ messageId, userId: socket.user.id, status: "READ" });
      await consultationRepository.markRead({ sessionId, recipientId: socket.user.id });
      socket.to(`chat:${sessionId}`).emit("message_read", { sessionId, messageId, userId: socket.user.id });
    } catch (error) {
      logger.warn("Socket message_read rejected.", { userId: socket.user.id, message: error.message });
    }
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

  socket.on("notification_read", async (payload) => {
    try {
      const { notificationId } = notificationReadSchema.parse(payload);
      await realtimeRepository.markNotificationRead({ userId: socket.user.id, notificationId });
      socket.emit("notification_read", { notificationId });
    } catch (error) {
      logger.warn("Socket notification_read rejected.", { userId: socket.user.id, message: error.message });
    }
  });

  socket.on("notification_clear", async () => {
    await realtimeRepository.clearNotifications(socket.user.id);
    socket.emit("notification_clear", { cleared: true });
  });

  socket.on("decrypt_history", async (payload, callback) => {
    try {
      const { sessionId } = z.object({ sessionId: idSchema }).strict().parse(payload);
      const session = await consultationRepository.findForUser(sessionId, socket.user);
      if (!session) return emitAck(callback, { ok: false, error: "Consultation access denied." });
      const messages = await consultationRepository.messages(sessionId);
      emitAck(callback, { ok: true, messages: messages.map((message) => ({ ...message, content: decryptMessage(message.encrypted_content) })) });
    } catch (error) {
      logger.warn("Socket decrypt_history rejected.", { userId: socket.user.id, message: error.message });
      emitAck(callback, { ok: false, error: "Invalid chat history request." });
    }
  });
}
