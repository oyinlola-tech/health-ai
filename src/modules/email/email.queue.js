import { pool } from "../../config/database.js";
import { createId } from "../../utils/uuid.js";
import { logger } from "../../utils/logger.js";

function missingTable(error) {
  return error?.code === "ER_NO_SUCH_TABLE" || String(error?.message || "").includes("email_queue");
}

export const emailQueue = {
  async enqueue({ to, subject, templateType, payload = {}, html, text }, client = pool) {
    const id = createId();
    try {
      const { rows } = await client.query(
        `insert into email_queue (id, recipient, subject, template_type, payload, html, text_body)
         values ($1, $2, $3, $4, $5::json, $6, $7)
         returning *`,
        [id, to, subject, templateType, JSON.stringify(payload), html, text]
      );
      return rows[0] || { id, recipient: to, status: "queued" };
    } catch (error) {
      if (missingTable(error)) {
        logger.warn("Email queue table is unavailable; sending without persistence.", { module: "email", to, subject });
        return null;
      }
      throw error;
    }
  },

  async markSent(id, client = pool) {
    if (!id) return null;
    const { rows } = await client.query(
      "update email_queue set status = 'sent', sent_at = now(), updated_at = now() where id = $1 returning *",
      [id]
    );
    return rows[0] || null;
  },

  async markFailed(id, error, client = pool) {
    if (!id) return null;
    const { rows } = await client.query(
      `update email_queue
       set attempts = attempts + 1,
           status = case when attempts + 1 >= 3 then 'failed' else 'queued' end,
           last_error = $2,
           scheduled_at = date_add(now(), interval 5 minute),
           updated_at = now()
       where id = $1
       returning *`,
      [id, String(error?.message || error).slice(0, 2000)]
    );
    return rows[0] || null;
  },

  async createEmailLog({ queueId = null, eventLogId = null, eventType = null, recipient, subject, templateType, status = "queued" }, client = pool) {
    const id = createId();
    try {
      const { rows } = await client.query(
        `insert into email_logs (id, email_queue_id, event_log_id, event_type, recipient, subject, template_type, status)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning *`,
        [id, queueId, eventLogId, eventType, recipient, subject, templateType, status]
      );
      return rows[0] || null;
    } catch (error) {
      if (missingTable(error) || String(error?.message || "").includes("email_logs")) return null;
      throw error;
    }
  },

  async markEmailLogSent(id, client = pool) {
    if (!id) return null;
    try {
      const { rows } = await client.query("update email_logs set status = 'sent', sent_at = now(), updated_at = now() where id = $1 returning *", [id]);
      return rows[0] || null;
    } catch (error) {
      if (missingTable(error) || String(error?.message || "").includes("email_logs")) return null;
      throw error;
    }
  },

  async markEmailLogFailed(id, error, client = pool) {
    if (!id) return null;
    try {
      const { rows } = await client.query(
        "update email_logs set status = 'failed', failure_reason = $2, updated_at = now() where id = $1 returning *",
        [id, String(error?.message || error).slice(0, 2000)]
      );
      return rows[0] || null;
    } catch (logError) {
      if (missingTable(logError) || String(logError?.message || "").includes("email_logs")) return null;
      throw logError;
    }
  }
};
