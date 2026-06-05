import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { createId } from "../../utils/uuid.js";

const demoPasswordPlaceholder = "demo-account-disabled";

async function findUserByEmail(connection, email) {
  const [rows] = await connection.execute("select id from users where email = lower(?) and deleted_at is null limit 1", [email]);
  return rows[0] || null;
}

async function ensureUser(connection, { email, firstName, lastName, role }) {
  const existing = await findUserByEmail(connection, email);
  if (existing) return existing.id;

  const id = createId();
  const passwordHash = await bcrypt.hash(`${demoPasswordPlaceholder}-${id}`, 12);
  await connection.execute(
    `insert into users (id, email, password_hash, first_name, last_name, role, status, metadata, email_verified_at)
     values (?, lower(?), ?, ?, ?, ?, 'active', json_object('demoMode', true), now())`,
    [id, email, passwordHash, firstName, lastName, role]
  );
  return id;
}

async function ensureDemoReportFile() {
  const reportsDir = path.join(env.UPLOAD_ROOT, "reports");
  await fs.mkdir(reportsDir, { recursive: true });
  const filePath = path.join(reportsDir, "demo-lab-report.pdf");
  const pdf = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n";
  await fs.writeFile(filePath, pdf, { flag: "wx" }).catch((error) => {
    if (error.code !== "EEXIST") throw error;
  });
  return filePath.replaceAll("\\", "/");
}

export async function seedDemoData(connection) {
  if (!env.DEMO_MODE) return { seeded: false };

  const patientId = await ensureUser(connection, {
    email: "demo.patient@medexplain.local",
    firstName: "Demo",
    lastName: "Patient",
    role: "Patient"
  });
  const doctorId = await ensureUser(connection, {
    email: "demo.doctor@medexplain.local",
    firstName: "Demo",
    lastName: "Doctor",
    role: "Doctor"
  });

  await connection.execute(
    `insert into doctor_profiles (
       user_id, specialty, specialization, license_number, credentials_status, bio,
       years_experience, verification_status, accepting_patients, verified_at, metadata
     )
     values (?, 'Internal Medicine', 'Internal Medicine', 'DEMO-LICENSE', 'verified',
       'Demo clinician profile for local judging walkthroughs.', 8, 'VERIFIED', true, now(), json_object('demoMode', true))
     on duplicate key update user_id = user_id`,
    [doctorId]
  );

  const reportPath = await ensureDemoReportFile();
  const [reports] = await connection.execute("select id from reports where patient_id = ? and title = 'Demo Complete Blood Count' limit 1", [patientId]);
  const reportId = reports[0]?.id || createId();
  if (!reports.length) {
    await connection.execute(
      `insert into reports (
         id, patient_id, uploaded_by, title, file_path, original_name, mime_type, size_bytes,
         status, summary, extracted_text, extraction_status, extraction_completed_at,
         processing_version, medical_entities_json, lab_results_json, analysis_confidence
       )
       values (?, ?, ?, 'Demo Complete Blood Count', ?, 'demo-lab-report.pdf', 'application/pdf', 86,
         'analyzed', 'Demo report ready for judging walkthrough.',
         'Hemoglobin 13.8 g/dL. White blood cells 6.1 x10^9/L. Platelets 240 x10^9/L.',
         'completed', now(), ?, json_object('demoMode', true),
         json_array(json_object('testName', 'Hemoglobin', 'value', 13.8, 'unit', 'g/dL', 'flag', 'NORMAL')),
         96)`,
      [reportId, patientId, patientId, reportPath, env.REPORT_PROCESSING_VERSION]
    );
  }

  const [appointments] = await connection.execute(
    "select id from appointments where patient_id = ? and doctor_id = ? and reason = 'Demo consultation' limit 1",
    [patientId, doctorId]
  );
  const appointmentId = appointments[0]?.id || createId();
  if (!appointments.length) {
    await connection.execute(
      `insert into appointments (id, patient_id, doctor_id, report_id, scheduled_at, duration_minutes, status, reason, metadata)
       values (?, ?, ?, ?, date_add(now(), interval 1 day), 30, 'CONFIRMED', 'Demo consultation', json_object('demoMode', true))`,
      [appointmentId, patientId, doctorId, reportId]
    );
  }

  const [sessions] = await connection.execute("select id from consultation_sessions where appointment_id = ? limit 1", [appointmentId]);
  const consultationId = sessions[0]?.id || createId();
  if (!sessions.length) {
    await connection.execute(
      `insert into consultation_sessions (id, appointment_id, patient_id, doctor_id, status, scheduled_at, room_key, mode, channel, metadata)
       values (?, ?, ?, ?, 'SCHEDULED', date_add(now(), interval 1 day), ?, 'CHAT', 'CHAT', json_object('demoMode', true))`,
      [consultationId, appointmentId, patientId, doctorId, `consultation:${consultationId}`]
    );
    await connection.execute(
      `insert into chat_sessions (id, consultation_session_id, appointment_id, patient_id, doctor_id, metadata)
       values (?, ?, ?, ?, ?, json_object('demoMode', true))`,
      [createId(), consultationId, appointmentId, patientId, doctorId]
    );
    await connection.execute(
      `insert into chat_messages (id, user_id, consultation_session_id, role, sender_type, sender_id, recipient_id, content, metadata)
       values (?, ?, ?, 'user', 'patient', ?, ?, 'I would like help understanding my lab report.', json_object('demoMode', true))`,
      [createId(), patientId, consultationId, patientId, doctorId]
    );
  }

  const [interactions] = await connection.execute("select id from ai_interactions where user_id = ? and report_id = ? and type = 'demo_report_analysis' limit 1", [
    patientId,
    reportId
  ]);
  if (!interactions.length) {
    await connection.execute(
      `insert into ai_interactions (id, user_id, report_id, type, prompt, response, model, used_for_learning)
       values (?, ?, ?, 'demo_report_analysis', ?, ?, ?, false)`,
      [
        createId(),
        patientId,
        reportId,
        JSON.stringify({ demoMode: true, note: "Synthetic prompt omitted." }),
        JSON.stringify({ summary: "Demo AI explanation available for judging walkthrough.", urgencyLevel: "LOW" }),
        env.GEMINI_FLASH_MODEL
      ]
    );
    await connection.execute(
      `insert into ai_usage_logs (
         id, user_id, endpoint, feature_type, tokens_used, prompt_tokens, response_tokens,
         model_used, request_id, status, metadata
       )
       values (?, ?, 'demo.seed', 'report_analysis', 240, 160, 80, ?, ?, 'completed', json_object('demoMode', true))`,
      [createId(), patientId, env.GEMINI_FLASH_MODEL, createId()]
    );
  }

  logger.info("Demo data seed checked.", { module: "database", demoMode: true });
  return { seeded: true };
}

