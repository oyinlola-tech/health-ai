import { executeStatements, id, json, text, timestamps } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists appointments (
      id ${id} primary key,
      patient_id ${id} not null,
      doctor_id ${id} not null,
      report_id ${id} null,
      scheduled_at datetime not null,
      duration_minutes int not null default 30,
      status varchar(40) not null default 'PENDING',
      reason ${text} null,
      notes ${text} null,
      metadata ${json} null,
      ${timestamps()},
      index idx_appointments_patient_scheduled_active (patient_id, scheduled_at),
      index idx_appointments_doctor_scheduled_desc_active (doctor_id, scheduled_at),
      index idx_appointments_patient_doctor_status (patient_id, doctor_id, status)
    )`
  ]);
}
