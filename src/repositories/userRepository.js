import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

function mapUser(row) {
  if (!row) return null;
  const normalizedRole = String(row.role || "").toLowerCase();
  if (normalizedRole === "admin") row.role = "Admin";
  if (normalizedRole === "doctor") row.role = "Doctor";
  if (normalizedRole === "patient") row.role = "Patient";
  return row;
}

export const userRepository = {
  async createUser({ email, passwordHash, firstName, lastName, role = "Patient", status = "active", metadata = {} }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into users (id, email, password_hash, first_name, last_name, role, status, metadata)
       values ($1, lower($2), $3, $4, $5, $6, $7, $8)
       returning *`,
      [id, email, passwordHash, firstName, lastName, role, status, metadata]
    );
    return mapUser(rows[0]);
  },

  async findByEmail(email, client = pool) {
    const { rows } = await client.query("select * from users where email = lower($1) and deleted_at is null", [email]);
    return mapUser(rows[0]);
  },

  async findById(id, client = pool) {
    const { rows } = await client.query("select * from users where id = $1 and deleted_at is null", [id]);
    return mapUser(rows[0]);
  },

  async list({ role, limit = 50, offset = 0 } = {}, client = pool) {
    const params = [];
    let where = "where deleted_at is null";
    if (role) {
      params.push(role);
      where += ` and role = $${params.length}`;
    }
    params.push(limit, offset);
    const { rows } = await client.query(
      `select id, email, first_name, last_name, role, status, email_verified_at, consent_prompt_learning, created_at
       from users ${where} order by created_at desc limit $${params.length - 1} offset $${params.length}`,
      params
    );
    return rows;
  },

  async updateProfile(id, { firstName, lastName, consentPromptLearning, metadata = {} }, client = pool) {
    const { rows } = await client.query(
      `update users
       set first_name = coalesce($2, first_name),
           last_name = coalesce($3, last_name),
           consent_prompt_learning = coalesce($4, consent_prompt_learning),
           metadata = json_merge_patch(coalesce(metadata, json_object()), cast($5 as json)),
           updated_at = now()
       where id = $1 and deleted_at is null
       returning id, email, first_name, last_name, role, status, consent_prompt_learning, metadata, created_at`,
      [id, firstName, lastName, consentPromptLearning, metadata]
    );
    return mapUser(rows[0]);
  },

  async setPasswordReset(id, tokenHash, expiresAt, client = pool) {
    await client.query(
      "update users set password_reset_token_hash = $2, password_reset_expires_at = $3, updated_at = now() where id = $1",
      [id, tokenHash, expiresAt]
    );
  },

  async findByPasswordResetHash(tokenHash, client = pool) {
    const { rows } = await client.query(
      "select * from users where password_reset_token_hash = $1 and password_reset_expires_at > now() and deleted_at is null",
      [tokenHash]
    );
    return mapUser(rows[0]);
  },

  async updatePassword(id, passwordHash, client = pool) {
    await client.query(
      `update users
       set password_hash = $2,
           password_reset_token_hash = null,
           password_reset_expires_at = null,
           updated_at = now()
       where id = $1`,
      [id, passwordHash]
    );
  },

  async verifyEmail(id, client = pool) {
    const { rows } = await client.query(
      "update users set email_verified_at = coalesce(email_verified_at, now()), updated_at = now() where id = $1 returning *",
      [id]
    );
    return mapUser(rows[0]);
  },

  async createRefreshToken({ id, userId, tokenHash, expiresAt }, client = pool) {
    await client.query(
      "insert into refresh_tokens (id, user_id, token_hash, expires_at) values ($1, $2, $3, $4)",
      [id, userId, tokenHash, expiresAt]
    );
  },

  async findRefreshToken(id, tokenHash, client = pool) {
    const { rows } = await client.query(
      `select rt.*, u.email, u.role, u.status
       from refresh_tokens rt
       join users u on u.id = rt.user_id
       where rt.id = $1 and rt.token_hash = $2 and rt.revoked_at is null and rt.expires_at > now() and u.deleted_at is null`,
      [id, tokenHash]
    );
    return rows[0] || null;
  },

  async revokeRefreshToken(id, client = pool) {
    await client.query("update refresh_tokens set revoked_at = now() where id = $1 and revoked_at is null", [id]);
  },

  async revokeUserRefreshTokens(userId, client = pool) {
    await client.query("update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null", [userId]);
  },

  async createDoctorProfile({ userId, specialty, licenseNumber, bio, yearsExperience = 0, verificationStatus = "PENDING" }, client = pool) {
    await client.query(
      `insert into doctor_profiles (user_id, specialty, specialization, license_number, credentials_status, bio, years_experience, verification_status, accepting_patients, verified_at)
       values ($1, $2, $2, $3, lower($5), $4, $6, $5, $5 = 'VERIFIED', case when $5 = 'VERIFIED' then now() else null end)
       on duplicate key update
           specialty = values(specialty),
           specialization = values(specialization),
           license_number = values(license_number),
           bio = values(bio),
           years_experience = values(years_experience),
           verification_status = values(verification_status),
           accepting_patients = values(accepting_patients),
           updated_at = now()
       `,
      [userId, specialty, licenseNumber, bio, verificationStatus, yearsExperience]
    );
    const profile = await client.query("select * from doctor_profiles where user_id = $1", [userId]);
    return profile.rows[0];
  }
};
