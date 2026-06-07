import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const legalRepository = {
  async upsertPolicy({ slug, title, body, version }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into legal_policies (id, slug, title, body, version)
       values ($1, $2, $3, $4, $5)
       on duplicate key update title = values(title), body = values(body), version = values(version), effective_at = now()
       returning *`,
      [id, slug, title, body, version]
    );
    if (rows[0]) return rows[0];
    const existing = await client.query("select * from legal_policies where slug = $1 limit 1", [slug]);
    return existing.rows[0];
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
  },

  async recordOperationalConsent({ userId, consentType, granted, ipAddress, userAgent, metadata = {} }, client = pool) {
    const id = createId();
    const action = granted ? "granted" : "revoked";
    const { rows } = await client.query(
      `insert into consent_records (id, user_id, consent_type, granted, action, ip_address, user_agent, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [id, userId, consentType, granted, action, ipAddress, userAgent, JSON.stringify(metadata)]
    );
    await client.query(
      `insert into consent_status (id, user_id, consent_type, granted, last_record_id, granted_at, revoked_at)
       values ($1, $2, $3, $4, $5, case when $4 then now() else null end, case when $4 then null else now() end)
       on duplicate key update
         granted = values(granted),
         last_record_id = values(last_record_id),
         granted_at = case when values(granted) then now() else granted_at end,
         revoked_at = case when values(granted) then null else now() end,
         updated_at = now()`,
      [createId(), userId, consentType, granted, id]
    );
    return rows[0];
  },

  async statusForUser(userId, client = pool) {
    const { rows } = await client.query("select consent_type, granted, granted_at, revoked_at, updated_at from consent_status where user_id = $1", [userId]);
    return rows;
  },

  async hasConsent(userId, consentType, client = pool) {
    const { rows } = await client.query(
      "select granted from consent_status where user_id = $1 and consent_type = $2 limit 1",
      [userId, consentType]
    );
    return Boolean(rows[0]?.granted);
  },

  async consentState(userId, consentType, client = pool) {
    const { rows } = await client.query(
      "select consent_type, granted, granted_at, revoked_at, updated_at from consent_status where user_id = $1 and consent_type = $2 limit 1",
      [userId, consentType]
    );
    return rows[0] || null;
  },

  async historyForUser(userId, client = pool) {
    const { rows } = await client.query(
      `select consent_type, granted, action, ip_address, user_agent, metadata, created_at
       from consent_records
       where user_id = $1
       order by created_at desc`,
      [userId]
    );
    return rows;
  }
};
