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

  async latestAnalysis(reportId, client = pool) {
    const { rows } = await client.query(
      `select response, model, created_at
       from ai_interactions
       where report_id = $1 and type = 'report_analysis'
       order by created_at desc
       limit 1`,
      [reportId]
    );
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

  async markExtractionStarted(id, client = pool) {
    const { rows } = await client.query(
      `update reports
       set extraction_status = 'processing',
           extraction_started_at = now(),
           extraction_completed_at = null,
           extraction_error = null,
           updated_at = now()
       where id = $1 and deleted_at is null
       returning *`,
      [id]
    );
    return rows[0] || null;
  },

  async saveExtractionResult(
    id,
    { extractedText, processingVersion, medicalEntities, labResults, analysisConfidence },
    client = pool
  ) {
    const { rows } = await client.query(
      `update reports
       set extracted_text = $2,
           extraction_status = 'completed',
           extraction_completed_at = now(),
           extraction_error = null,
           processing_version = $3,
           medical_entities_json = $4::jsonb,
           lab_results_json = $5::jsonb,
           analysis_confidence = $6,
           updated_at = now()
       where id = $1 and deleted_at is null
       returning *`,
      [id, extractedText, processingVersion, JSON.stringify(medicalEntities), JSON.stringify(labResults), analysisConfidence]
    );
    return rows[0] || null;
  },

  async saveExtractionFailure(id, extractionError, client = pool) {
    const { rows } = await client.query(
      `update reports
       set extraction_status = 'failed',
           extraction_completed_at = now(),
           extraction_error = $2,
           analysis_confidence = 0,
           updated_at = now()
       where id = $1 and deleted_at is null
       returning *`,
      [id, extractionError]
    );
    return rows[0] || null;
  },

  async processingMetrics(client = pool) {
    const { rows } = await client.query(
      `select
         count(*) filter (where extraction_status = 'completed')::int as reports_processed,
         count(*) filter (where extraction_status = 'failed')::int as failed_extractions,
         coalesce(round(avg(analysis_confidence) filter (where analysis_confidence is not null), 2), 0)::float as average_confidence,
         coalesce(round(avg(extract(epoch from (extraction_completed_at - extraction_started_at))) filter (
           where extraction_started_at is not null and extraction_completed_at is not null
         ), 2), 0)::float as average_processing_time_seconds,
         case when count(*) = 0 then 0
           else round(((count(*) filter (where extraction_status = 'failed'))::numeric / count(*)::numeric) * 100, 2)::float
         end as ocr_failure_rate
       from reports
       where deleted_at is null`
    );
    return rows[0];
  },

  async softDelete(id, client = pool) {
    await client.query("update reports set deleted_at = now(), updated_at = now() where id = $1", [id]);
  }
};
