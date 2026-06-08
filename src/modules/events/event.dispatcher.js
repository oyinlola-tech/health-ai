import { pool } from "../../config/database.js";
import { emailMapper } from "../email/email.mapper.js";
import { createId } from "../../utils/uuid.js";
import { logger } from "../../utils/logger.js";

const sensitiveKeys = new Set(["password", "temporaryPassword", "token", "accessToken", "refreshToken", "secret", "apiKey", "authorization"]);
const maxIdempotencyKeyLength = 180;

function keyPart(value, maxLength = 80) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9:._-]/g, "-")
    .slice(0, maxLength);
}

function redactPayload(value) {
  if (Array.isArray(value)) return value.map(redactPayload);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      if (sensitiveKeys.has(key) || /password|token|secret|apikey|authorization/i.test(key)) return [key, "[redacted]"];
      return [key, redactPayload(child)];
    })
  );
}

export function eventKey(event) {
  if (event.idempotencyKey) return event.idempotencyKey;
  const entityId = event.entityId || event.payload?.entityId || null;
  const reference = event.payload?.reference || event.payload?.payment?.provider_reference || null;
  if (!entityId && !reference) return null;
  const subject = entityId
    ? ["entity", keyPart(event.entityType || "unknown", 40), keyPart(entityId, 60)]
    : ["reference", keyPart(reference, 80)];
  const key = [
    "event",
    keyPart(event.type, 60),
    keyPart(event.userId || event.payload?.user?.id || "system", 60),
    ...subject
  ].join(":");
  return key.length <= maxIdempotencyKeyLength ? key : key.slice(0, maxIdempotencyKeyLength);
}

async function insertEventLog(event, client = pool) {
  const id = createId();
  const idempotencyKey = eventKey(event);
  const payload = redactPayload(event.payload || {});
  const { rows } = await client.query(
    `insert into event_logs (id, type, user_id, idempotency_key, payload, status)
     values ($1, $2, $3, $4, $5::json, 'received')
     on duplicate key update id = id
     returning *`,
    [id, event.type, event.userId || event.payload?.user?.id || null, idempotencyKey, JSON.stringify(payload)]
  );
  return rows[0] || null;
}

async function markEventProcessed(eventLog, client = pool) {
  if (!eventLog?.id) return null;
  const { rows } = await client.query("update event_logs set status = 'processed', processed_at = now() where id = $1 returning *", [eventLog.id]);
  return rows[0] || null;
}

async function markEventFailed(eventLog, error, client = pool) {
  if (!eventLog?.id) return null;
  const { rows } = await client.query(
    "update event_logs set status = 'failed', error_message = $2, processed_at = now() where id = $1 returning *",
    [eventLog.id, String(error?.message || error).slice(0, 2000)]
  );
  return rows[0] || null;
}

export const eventDispatcher = {
  async dispatch(event, client = pool) {
    if (!event?.type) throw new Error("Event type is required.");
    const eventLog = await insertEventLog(event, client);
    if (!eventLog) return { duplicate: true };

    try {
      await emailMapper.handle(event, { eventLog, client });
      await markEventProcessed(eventLog, client);
      return { eventLog, processed: true };
    } catch (error) {
      await markEventFailed(eventLog, error, client).catch(() => null);
      logger.error("Event dispatch failed.", { module: "events", type: event.type, message: error.message });
      return { eventLog, processed: false, error };
    }
  }
};
