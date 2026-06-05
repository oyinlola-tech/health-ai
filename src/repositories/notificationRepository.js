import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";
import { realtimeRepository } from "./realtimeRepository.js";
import { socketHub } from "../sockets/hub.js";

export const notificationRepository = {
  async create({ userId, type, title, body }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      "insert into notifications (id, user_id, type, title, body) values ($1, $2, $3, $4, $5) returning *",
      [id, userId, type, title, body]
    );
    await realtimeRepository.recordNotificationEvent(
      {
        notificationId: rows[0].id,
        userId,
        eventType: "notification_push",
        payload: { type, title, body },
        delivered: true
      },
      client
    );
    socketHub.toUser(userId, "notification_push", { notification: rows[0] });
    return rows[0];
  },

  async listForUser(userId, client = pool) {
    const { rows } = await client.query("select * from notifications where user_id = $1 order by created_at desc", [userId]);
    return rows;
  },

  async markRead({ id, userId }, client = pool) {
    const { rows } = await client.query(
      "update notifications set read_at = coalesce(read_at, now()) where id = $1 and user_id = $2 returning *",
      [id, userId]
    );
    return rows[0] || null;
  }
};
