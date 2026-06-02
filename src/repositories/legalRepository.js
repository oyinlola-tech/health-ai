import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const legalRepository = {
  async upsertPolicy({ slug, title, body, version }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into legal_policies (id, slug, title, body, version)
       values ($1, $2, $3, $4, $5)
       on conflict (slug) do update
       set title = excluded.title, body = excluded.body, version = excluded.version, effective_at = now()
       returning *`,
      [id, slug, title, body, version]
    );
    return rows[0];
  },

  async listPolicies(client = pool) {
    const { rows } = await client.query("select * from legal_policies order by slug");
    return rows;
  },

  async recordConsent({ userId, policySlug, policyVersion, accepted, ipAddress, userAgent }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into legal_consents (id, user_id, policy_slug, policy_version, accepted, ip_address, user_agent)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [id, userId, policySlug, policyVersion, accepted, ipAddress, userAgent]
    );
    return rows[0];
  }
};
