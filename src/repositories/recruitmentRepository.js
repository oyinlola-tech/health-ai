import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const recruitmentRepository = {
  async createJob({ createdBy, title, description, specialty, status = "draft" }, client = pool) {
    const id = createId();
    const publishedAt = status === "published" ? new Date() : null;
    const { rows } = await client.query(
      `insert into doctor_jobs (id, created_by, title, description, specialty, status, published_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [id, createdBy, title, description, specialty, status, publishedAt]
    );
    return rows[0];
  },

  async publishJob({ id }, client = pool) {
    const { rows } = await client.query(
      "update doctor_jobs set status = 'published', published_at = now(), updated_at = now() where id = $1 and deleted_at is null returning *",
      [id]
    );
    return rows[0] || null;
  },

  async listJobs({ includeDrafts = false } = {}, client = pool) {
    const sql = includeDrafts
      ? "select * from doctor_jobs where deleted_at is null order by created_at desc"
      : "select * from doctor_jobs where status = 'published' and deleted_at is null order by published_at desc";
    const { rows } = await client.query(sql);
    return rows;
  },

  async createApplication({ jobId = null, email, firstName, lastName, phone, cvPath, medicalLicenseNumber, specialization, yearsExperience }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into doctor_applications (
         id, job_id, email, first_name, last_name, phone, cv_path,
         medical_license_number, specialization, years_experience, documents_path, status
       )
       values ($1, $2, lower($3), $4, $5, $6, $7, $8, $9, $10, $7, 'PENDING')
       returning *`,
      [id, jobId, email, firstName, lastName, phone, cvPath, medicalLicenseNumber, specialization, yearsExperience]
    );
    return rows[0];
  },

  async addCredential({ applicationId, doctorId = null, filePath, originalName, mimeType, sizeBytes }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into doctor_credentials (id, application_id, doctor_id, file_path, original_name, mime_type, size_bytes)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [id, applicationId, doctorId, filePath, originalName, mimeType, sizeBytes]
    );
    return rows[0];
  },

  async listApplications(client = pool) {
    const { rows } = await client.query(
      `select da.*, dj.title as job_title
       from doctor_applications da
       left join doctor_jobs dj on dj.id = da.job_id
       order by da.created_at desc`
    );
    return rows;
  },

  async findApplication(id, client = pool) {
    const { rows } = await client.query("select * from doctor_applications where id = $1", [id]);
    return rows[0] || null;
  },

  async reviewApplication({ id, status, reviewedBy, createdDoctorId = null, rejectionReason = null }, client = pool) {
    const { rows } = await client.query(
      `update doctor_applications
       set status = $2, reviewed_by = $3, reviewed_at = now(), created_doctor_id = coalesce($4, created_doctor_id), rejection_reason = coalesce($5, rejection_reason), updated_at = now()
       where id = $1
       returning *`,
      [id, status, reviewedBy, createdDoctorId, rejectionReason]
    );
    return rows[0] || null;
  }
};
