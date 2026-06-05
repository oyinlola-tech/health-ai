import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const realtimeRepository = {
  async findAppointmentAccess({ appointmentId, user }, client = pool) {
    const { rows } = await client.query(
      `select * from appointments
       where id = $1
         and deleted_at is null
         and ($2 = 'Admin' or patient_id = $3 or doctor_id = $3)`,
      [appointmentId, user.role, user.id]
    );
    return rows[0] || null;
  },

  async findChatSessionAccess({ chatSessionId, user }, client = pool) {
    const { rows } = await client.query(
      `select * from chat_sessions
       where id = $1
         and ($2 = 'Admin' or patient_id = $3 or doctor_id = $3)`,
      [chatSessionId, user.role, user.id]
    );
    return rows[0] || null;
  },

  async findConsultationAccess({ sessionId, user }, client = pool) {
    const { rows } = await client.query(
      `select * from consultation_sessions
       where id = $1
         and ($2 = 'Admin' or patient_id = $3 or doctor_id = $3)`,
      [sessionId, user.role, user.id]
    );
    return rows[0] || null;
  },

  async ensureChatSessionForConsultation(session, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into chat_sessions (id, consultation_session_id, appointment_id, patient_id, doctor_id)
       values ($1, $2, $3, $4, $5)
       on conflict do nothing
       returning *`,
      [id, session.id, session.appointment_id, session.patient_id, session.doctor_id]
    );
    if (rows[0]) return rows[0];
    const existing = await client.query("select * from chat_sessions where consultation_session_id = $1", [session.id]);
    return existing.rows[0] || null;
  },

  async recordPresence({ user, status, socketId, metadata = {} }, client = pool) {
    const { rows } = await client.query(
      `insert into presence_logs (id, user_id, role, status, socket_id, metadata)
       values ($1, $2, $3, $4, $5, $6::jsonb)
       returning *`,
      [createId(), user.id, user.role, status, socketId, JSON.stringify(metadata)]
    );
    return rows[0];
  },

  async recordNotificationEvent({ notificationId = null, userId, eventType, payload = {}, delivered = false }, client = pool) {
    const { rows } = await client.query(
      `insert into notification_events (id, notification_id, user_id, event_type, payload, delivered_at)
       values ($1, $2, $3, $4, $5::jsonb, case when $6 then now() else null end)
       returning *`,
      [createId(), notificationId, userId, eventType, JSON.stringify(payload), delivered]
    );
    return rows[0];
  },

  async markNotificationRead({ userId, notificationId = null }, client = pool) {
    const params = [userId];
    const filter = notificationId ? "and notification_id = $2" : "";
    if (notificationId) params.push(notificationId);
    await client.query(`update notification_events set read_at = coalesce(read_at, now()) where user_id = $1 ${filter}`, params);
  },

  async clearNotifications(userId, client = pool) {
    await client.query("update notification_events set cleared_at = coalesce(cleared_at, now()) where user_id = $1", [userId]);
  },

  async upsertDeliveryStatus({ messageId, userId, status }, client = pool) {
    const { rows } = await client.query(
      `insert into message_delivery_status (id, message_id, user_id, status, delivered_at, read_at)
       values ($1, $2, $3, $4, case when $4 in ('DELIVERED', 'READ') then now() else null end, case when $4 = 'READ' then now() else null end)
       on conflict (message_id, user_id) do update
       set status = excluded.status,
           delivered_at = coalesce(message_delivery_status.delivered_at, excluded.delivered_at),
           read_at = coalesce(message_delivery_status.read_at, excluded.read_at)
       returning *`,
      [createId(), messageId, userId, status]
    );
    return rows[0];
  }
};
