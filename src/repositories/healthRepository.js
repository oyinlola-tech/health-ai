import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const healthRepository = {
  async createEntry({ patientId, category, title, value, recordedAt, metadata = {} }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into health_history_entries (id, patient_id, category, title, value, recorded_at, metadata)
       values ($1, $2, $3, $4, $5, coalesce($6, now()), $7)
       returning *`,
      [id, patientId, category, title, value, recordedAt, metadata]
    );
    return rows[0];
  },

  async listForPatient(patientId, client = pool) {
    const { rows } = await client.query(
      "select * from health_history_entries where patient_id = $1 and deleted_at is null order by recorded_at desc",
      [patientId]
    );
    return rows;
  }
};
