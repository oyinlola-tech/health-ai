import { executeStatements, id, json, text, timestamps } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists reports (
      id ${id} primary key,
      patient_id ${id} not null,
      uploaded_by ${id} not null,
      title varchar(255) not null,
      file_path varchar(700) not null,
      original_name varchar(255) not null,
      mime_type varchar(120) not null,
      size_bytes bigint not null default 0,
      status varchar(40) not null default 'uploaded',
      summary ${text} null,
      extracted_text ${text} null,
      extraction_status varchar(40) not null default 'pending',
      extraction_started_at datetime null,
      extraction_completed_at datetime null,
      extraction_error ${text} null,
      processing_version varchar(80) null,
      medical_entities_json ${json} null,
      lab_results_json ${json} null,
      analysis_confidence int null,
      ${timestamps()},
      index idx_reports_patient_created_active (patient_id, created_at),
      index idx_reports_uploaded_by_created_active (uploaded_by, created_at)
    )`,
    `create table if not exists health_history_entries (
      id ${id} primary key,
      patient_id ${id} not null,
      category varchar(80) not null,
      entry_type varchar(80) null,
      title varchar(255) not null,
      value ${text} null,
      recorded_at datetime not null default current_timestamp,
      metadata ${json} null,
      ${timestamps()},
      index idx_health_history_patient_recorded (patient_id, recorded_at)
    )`,
    `create table if not exists medical_notes (
      id ${id} primary key,
      patient_id ${id} not null,
      doctor_id ${id} null,
      note_type varchar(80) not null,
      body ${text} not null,
      metadata ${json} null,
      created_at datetime not null default current_timestamp
    )`
  ]);
}
