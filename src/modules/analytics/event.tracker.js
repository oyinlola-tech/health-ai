import { pool } from "../../config/database.js";
import { createId } from "../../utils/uuid.js";
import { logger } from "../../utils/logger.js";

export const analyticsEvents = {
  LOGIN: "login",
  USER_REGISTERED: "user_registered",
  REPORT_UPLOAD: "report_upload",
  AI_ANALYSIS: "ai_analysis",
  AI_CHAT: "ai_chat",
  DOCTOR_BOOKING: "doctor_booking",
  PAYMENT_ATTEMPT: "payment_attempt",
  PAYMENT_SUCCESS: "payment_success",
  COUPON_APPLIED: "coupon_applied",
  SUBSCRIPTION_UPGRADE: "subscription_upgrade",
  PASSWORD_RESET_REQUEST: "password_reset_request"
};

function safeMetadata(metadata = {}) {
  return JSON.parse(
    JSON.stringify(metadata, (_key, value) => {
      if (typeof value === "string" && value.length > 1000) return `${value.slice(0, 1000)}...`;
      return value;
    })
  );
}

function analyticsUnavailable(error) {
  return (
    error?.code === "ER_NO_SUCH_TABLE" ||
    error?.code === "ECONNREFUSED" ||
    error?.code === "ETIMEDOUT" ||
    error?.code === "PROTOCOL_CONNECTION_LOST" ||
    String(error?.message || "").includes("user_events") ||
    String(error?.message || "").includes("user_sessions")
  );
}

export const eventTracker = {
  async startSession({ user, req = null, refreshTokenId = null, metadata = {} }, client = pool) {
    if (!user?.id) return null;
    if (!client?.query) return null;
    const id = createId();
    try {
      const { rows } = await client.query(
        `insert into user_sessions (id, user_id, refresh_token_id, ip_address, user_agent, metadata)
         values ($1, $2, $3, $4, $5, $6::json)
         returning *`,
        [
          id,
          user.id,
          refreshTokenId,
          req?.ip || null,
          req?.get?.("user-agent") || null,
          JSON.stringify(safeMetadata(metadata))
        ]
      );
      return rows[0] || { id, user_id: user.id };
    } catch (error) {
      if (analyticsUnavailable(error)) {
        logger.warn("User session analytics table is unavailable.", { module: "analytics" });
        return null;
      }
      throw error;
    }
  },

  async track({ userId = null, sessionId = null, eventType, entityType = null, entityId = null, req = null, metadata = {} }, client = pool) {
    if (!eventType) return null;
    if (!client?.query) return null;
    const id = createId();
    try {
      const { rows } = await client.query(
        `insert into user_events (id, user_id, session_id, event_type, entity_type, entity_id, ip_address, user_agent, metadata)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::json)
         returning *`,
        [
          id,
          userId,
          sessionId || null,
          String(eventType).slice(0, 80),
          entityType,
          entityId,
          req?.ip || null,
          req?.get?.("user-agent") || null,
          JSON.stringify(safeMetadata(metadata))
        ]
      );
      return rows[0] || { id, event_type: eventType };
    } catch (error) {
      if (analyticsUnavailable(error)) {
        logger.warn("User event analytics table is unavailable.", { module: "analytics", eventType });
        return null;
      }
      throw error;
    }
  },

  async countRecent({ eventType, minutes = 60 }, client = pool) {
    try {
      if (!client?.query) return 0;
      const { rows } = await client.query(
        "select count(*) as count from user_events where event_type = $1 and created_at >= date_sub(now(), interval $2 minute)",
        [eventType, minutes]
      );
      return Number(rows[0]?.count || 0);
    } catch (error) {
      if (analyticsUnavailable(error)) return 0;
      throw error;
    }
  }
};
