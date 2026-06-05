import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const consultationRepository = {
  async createForAppointment(appointment, client = pool) {
    const id = createId();
    const roomKey = `consultation:${id}`;
    const { rows } = await client.query(
      `insert into consultation_sessions (id, appointment_id, patient_id, doctor_id, status, room_key, mode, scheduled_at)
       values ($1, $2, $3, $4, 'SCHEDULED', $5, 'CHAT', $6)
       on conflict (appointment_id) where appointment_id is not null do nothing
       returning *`,
      [id, appointment.id, appointment.patient_id, appointment.doctor_id, roomKey, appointment.scheduled_at]
    );
    if (rows[0]) return rows[0];
    const existing = await client.query("select * from consultation_sessions where appointment_id = $1", [appointment.id]);
    return existing.rows[0] || null;
  },

  async listForUser(user, client = pool) {
    const params = [user.id];
    const where = user.role === "Doctor" ? "cs.doctor_id = $1" : user.role === "Patient" ? "cs.patient_id = $1" : "true";
    const { rows } = await client.query(
      `select cs.*, a.reason, a.status as appointment_status,
              p.first_name as patient_first_name, p.last_name as patient_last_name,
              d.first_name as doctor_first_name, d.last_name as doctor_last_name
       from consultation_sessions cs
       join appointments a on a.id = cs.appointment_id
       join users p on p.id = cs.patient_id
       join users d on d.id = cs.doctor_id
       where ${where}
       order by cs.scheduled_at desc`,
      user.role === "Admin" ? [] : params
    );
    return rows;
  },

  async findForUser(id, user, client = pool) {
    const params = [id];
    let access = "";
    if (user.role === "Patient") {
      params.push(user.id);
      access = `and patient_id = $${params.length}`;
    }
    if (user.role === "Doctor") {
      params.push(user.id);
      access = `and doctor_id = $${params.length}`;
    }
    const { rows } = await client.query(`select * from consultation_sessions where id = $1 ${access}`, params);
    return rows[0] || null;
  },

  async addMessage({ sessionId, senderId, recipientId, content, encryptedContent }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into chat_messages (id, user_id, role, content, consultation_session_id, sender_id, recipient_id, encrypted_content)
       values ($1, $2, 'user', $3, $4, $5, $6, $7::jsonb)
       returning id, consultation_session_id, sender_id, recipient_id, created_at`,
      [id, senderId, "[encrypted consultation message]", sessionId, senderId, recipientId, JSON.stringify(encryptedContent)]
    );
    return { ...rows[0], content };
  },

  async messages(sessionId, client = pool) {
    const { rows } = await client.query(
      `select id, consultation_session_id, sender_id, recipient_id, encrypted_content, read_at, created_at
       from chat_messages
       where consultation_session_id = $1
       order by created_at asc`,
      [sessionId]
    );
    return rows;
  },

  async markRead({ sessionId, recipientId }, client = pool) {
    await client.query(
      `update chat_messages set read_at = coalesce(read_at, now())
       where consultation_session_id = $1 and recipient_id = $2`,
      [sessionId, recipientId]
    );
  }
};
