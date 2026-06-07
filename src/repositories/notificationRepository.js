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
    const notifications = await client.query("select *, 'in_app' as source, type as category from notifications where user_id = $1", [userId]);
    let centerRows = [];
    try {
      const center = await client.query("select *, 'email' as source from notification_center where user_id = $1", [userId]);
      centerRows = center.rows;
    } catch (error) {
      if (error?.code !== "ER_NO_SUCH_TABLE" && !String(error?.message || "").includes("notification_center")) throw error;
    }
    return [...notifications.rows, ...centerRows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async markRead({ id, userId }, client = pool) {
    const { rows } = await client.query(
      "update notifications set read_at = coalesce(read_at, now()) where id = $1 and user_id = $2 returning *",
      [id, userId]
    );
    if (rows[0]) return rows[0];
    try {
      const center = await client.query(
        "update notification_center set read_at = coalesce(read_at, now()) where id = $1 and user_id = $2 returning *",
        [id, userId]
      );
      return center.rows[0] || null;
    } catch (error) {
      if (error?.code === "ER_NO_SUCH_TABLE" || String(error?.message || "").includes("notification_center")) return null;
      throw error;
    }
  }
};
