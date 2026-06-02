import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const auditRepository = {
  async create({ actorId, action, entityType, entityId, ipAddress, userAgent, metadata = {} }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into audit_logs (id, actor_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [id, actorId, action, entityType, entityId, ipAddress, userAgent, metadata]
    );
    return rows[0];
  },

  async list({ limit = 100, offset = 0 } = {}, client = pool) {
    const { rows } = await client.query(
      `select al.*, u.email as actor_email
       from audit_logs al
       left join users u on u.id = al.actor_id
       order by al.created_at desc
       limit $1 offset $2`,
      [limit, offset]
    );
    return rows;
  }
};
