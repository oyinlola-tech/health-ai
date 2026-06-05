import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

function searchWhere({ q, specialization, availableOnly, minRating } = {}) {
  const params = [];
  const clauses = ["lower(u.role) = 'doctor'", "u.deleted_at is null", "dp.verification_status = 'VERIFIED'", "dp.accepting_patients = true"];
  if (q) {
    params.push(`%${q}%`);
    clauses.push(`(concat(u.first_name, ' ', u.last_name) like $${params.length} or dp.specialization like $${params.length})`);
  }
  if (specialization) {
    params.push(`%${specialization}%`);
    clauses.push(`dp.specialization like $${params.length}`);
  }
  if (minRating !== undefined) {
    params.push(Number(minRating));
    clauses.push(`dp.rating_average >= $${params.length}`);
  }
  if (availableOnly === "true" || availableOnly === true) clauses.push("exists (select 1 from doctors_availability da where da.doctor_id = u.id and da.is_active = true)");
  return { where: clauses.join(" and "), params };
}

export const doctorRepository = {
  async directory(filters = {}, client = pool) {
    const { where, params } = searchWhere(filters);
    const { rows } = await client.query(
      `select u.id, u.first_name, u.last_name, dp.specialty, dp.specialization, dp.years_experience,
              dp.verification_status, dp.accepting_patients, dp.vacation_mode, dp.consultation_fee_cents,
              dp.rating_average, dp.rating_count,
              exists (select 1 from doctors_availability da where da.doctor_id = u.id and da.is_active = true) as has_availability
       from users u
       join doctor_profiles dp on dp.user_id = u.id
       where ${where}
       order by dp.rating_average desc, u.first_name asc`,
      params
    );
    return rows;
  },

  async profile(id, { includeUnverified = false } = {}, client = pool) {
    const params = [id];
    const verificationClause = includeUnverified ? "" : "and dp.verification_status = 'VERIFIED' and dp.accepting_patients = true";
    const { rows } = await client.query(
      `select u.id, u.email, u.first_name, u.last_name, u.status,
              dp.specialty, dp.specialization, dp.years_experience, dp.license_number,
              dp.verification_status, dp.accepting_patients, dp.vacation_mode, dp.consultation_fee_cents,
              dp.rating_average, dp.rating_count, dp.bio, dp.verified_at
       from users u
       join doctor_profiles dp on dp.user_id = u.id
       where u.id = $1 and lower(u.role) = 'doctor' and u.deleted_at is null ${verificationClause}`,
      params
    );
    return rows[0] || null;
  },

  async updateProfile({ doctorId, specialization, yearsExperience, bio, consultationFeeCents, acceptingPatients, vacationMode }, client = pool) {
    const { rows } = await client.query(
      `update doctor_profiles
       set specialization = coalesce($2, specialization),
           specialty = coalesce($2, specialty),
           years_experience = coalesce($3, years_experience),
           bio = coalesce($4, bio),
           consultation_fee_cents = coalesce($5, consultation_fee_cents),
           accepting_patients = coalesce($6, accepting_patients),
           vacation_mode = coalesce($7, vacation_mode),
           updated_at = now()
       where user_id = $1
       returning *`,
      [doctorId, specialization, yearsExperience, bio, consultationFeeCents, acceptingPatients, vacationMode]
    );
    return rows[0] || null;
  },

  async setVerification({ doctorId, actorId, status, notes = null }, client = pool) {
    const existing = await this.profile(doctorId, { includeUnverified: true }, client);
    const { rows } = await client.query(
      `update doctor_profiles
       set verification_status = $2,
           credentials_status = lower($2),
           accepting_patients = case when $2 = 'VERIFIED' then true when $2 = 'SUSPENDED' then false else accepting_patients end,
           verified_at = case when $2 = 'VERIFIED' then now() else verified_at end,
           verified_by = case when $2 = 'VERIFIED' then $3 else verified_by end,
           updated_at = now()
       where user_id = $1
       returning *`,
      [doctorId, status, actorId]
    );
    await client.query(
      `insert into doctor_verification_logs (id, doctor_id, actor_id, previous_status, new_status, license_number, notes)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [createId(), doctorId, actorId, existing?.verification_status || null, status, existing?.license_number || null, notes]
    );
    return rows[0] || null;
  },

  async listAvailability(doctorId, client = pool) {
    const { rows } = await client.query(
      `select * from doctors_availability where doctor_id = $1 and is_active = true order by day_of_week, starts_at`,
      [doctorId]
    );
    return rows;
  },

  async upsertAvailability({ doctorId, dayOfWeek, startsAt, endsAt, slotMinutes = 30 }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into doctors_availability (id, doctor_id, day_of_week, starts_at, ends_at, slot_minutes)
       values ($1, $2, $3, $4, $5, $6)
       on duplicate key update slot_minutes = values(slot_minutes), is_active = true, updated_at = now()
       returning *`,
      [id, doctorId, dayOfWeek, startsAt, endsAt, slotMinutes]
    );
    if (rows[0]) return rows[0];
    const existing = await client.query(
      "select * from doctors_availability where doctor_id = $1 and day_of_week = $2 and starts_at = $3 and ends_at = $4 limit 1",
      [doctorId, dayOfWeek, startsAt, endsAt]
    );
    return existing.rows[0];
  },

  async addUnavailableSlot({ doctorId, startsAt, endsAt, reason = null }, client = pool) {
    const { rows } = await client.query(
      `insert into doctor_unavailable_slots (id, doctor_id, starts_at, ends_at, reason)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [createId(), doctorId, startsAt, endsAt, reason]
    );
    return rows[0];
  },

  async isSlotAvailable({ doctorId, scheduledAt, durationMinutes = 30 }, client = pool) {
    const scheduled = new Date(scheduledAt);
    const end = new Date(scheduled.getTime() + durationMinutes * 60 * 1000);
    const jsDay = scheduled.getDay();
    const startTime = scheduled.toTimeString().slice(0, 8);
    const endTime = end.toTimeString().slice(0, 8);
    const { rows } = await client.query(
      `select
         dp.verification_status = 'VERIFIED' and dp.accepting_patients = true and dp.vacation_mode = false as verified_and_accepting,
         exists (
           select 1 from doctors_availability da
           where da.doctor_id = $1
             and da.is_active = true
             and da.day_of_week = $4
             and $5 >= da.starts_at
             and $6 <= da.ends_at
         ) as within_working_hours,
         not exists (
           select 1 from doctor_unavailable_slots dus
           where dus.doctor_id = $1
             and dus.starts_at < $3
             and dus.ends_at > $2
         ) as not_unavailable,
         not exists (
           select 1 from appointments a
           where a.doctor_id = $1
             and a.deleted_at is null
             and a.status in ('PENDING', 'CONFIRMED')
             and a.scheduled_at < $3
             and date_add(a.scheduled_at, interval a.duration_minutes minute) > $2
         ) as not_booked
       from doctor_profiles dp
       where dp.user_id = $1`,
      [doctorId, scheduled, end, jsDay, startTime, endTime]
    );
    const row = rows[0];
    return Boolean(row?.verified_and_accepting && row.within_working_hours && row.not_unavailable && row.not_booked);
  }
};
