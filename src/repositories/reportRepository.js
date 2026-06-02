import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const reportRepository = {
  async create({ patientId, uploadedBy, title, filePath, originalName, mimeType, sizeBytes }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into reports (id, patient_id, uploaded_by, title, file_path, original_name, mime_type, size_bytes)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [id, patientId, uploadedBy, title, filePath, originalName, mimeType, sizeBytes]
    );
    return rows[0];
  },

  async listForUser(user, client = pool) {
    const isAdminOrDoctor = ["Admin", "Doctor"].includes(user.role);
    const sql = isAdminOrDoctor
      ? "select * from reports where deleted_at is null order by created_at desc"
      : "select * from reports where patient_id = $1 and deleted_at is null order by created_at desc";
    const { rows } = await client.query(sql, isAdminOrDoctor ? [] : [user.id]);
    return rows;
  },

  async findById(id, client = pool) {
    const { rows } = await client.query("select * from reports where id = $1 and deleted_at is null", [id]);
    return rows[0] || null;
  },

  async updateAnalysis(id, { status, summary, extractedText }, client = pool) {
    const { rows } = await client.query(
      `update reports
       set status = $2,
           summary = coalesce($3, summary),
           extracted_text = coalesce($4, extracted_text),
           updated_at = now()
       where id = $1 and deleted_at is null
       returning *`,
      [id, status, summary, extractedText]
    );
    return rows[0] || null;
  },

  async softDelete(id, client = pool) {
    await client.query("update reports set deleted_at = now(), updated_at = now() where id = $1", [id]);
  }
};
