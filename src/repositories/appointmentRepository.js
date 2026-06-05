import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const appointmentRepository = {
  async create({ patientId, doctorId = null, scheduledAt, reason, notes = null }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into appointments (id, patient_id, doctor_id, scheduled_at, reason, notes)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [id, patientId, doctorId, scheduledAt, reason, notes]
    );
    return rows[0];
  },

  async listForUser(user, client = pool) {
    const conditions = user.role === "Doctor" ? "doctor_id = $1" : user.role === "Patient" ? "patient_id = $1" : "true";
    const params = user.role === "Admin" ? [] : [user.id];
    const { rows } = await client.query(
      `select a.*, d.first_name as doctor_first_name, d.last_name as doctor_last_name,
              p.first_name as patient_first_name, p.last_name as patient_last_name,
              dp.specialization as doctor_specialization
       from appointments a
       join users d on d.id = a.doctor_id
       join users p on p.id = a.patient_id
       left join doctor_profiles dp on dp.user_id = a.doctor_id
       where ${conditions.replaceAll("doctor_id", "a.doctor_id").replaceAll("patient_id", "a.patient_id")} and a.deleted_at is null
       order by a.scheduled_at desc`,
      params
    );
    return rows;
  },

  async findById(id, client = pool) {
    const { rows } = await client.query("select * from appointments where id = $1 and deleted_at is null", [id]);
    return rows[0] || null;
  },

  async updateStatus({ id, status, user }, client = pool) {
    const params = [id, status];
    let ownership = "";
    if (user.role === "Patient") {
      params.push(user.id);
      ownership = ` and patient_id = $${params.length}`;
    }
    if (user.role === "Doctor") {
      params.push(user.id);
      ownership = ` and doctor_id = $${params.length}`;
    }
    const { rows } = await client.query(
      `update appointments set status = $2, updated_at = now()
       where id = $1 ${ownership} and deleted_at is null returning *`,
      params
    );
    return rows[0] || null;
  }
};
