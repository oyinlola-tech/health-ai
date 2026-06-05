import { executeStatements, id, text, timestamps } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists doctor_profiles (
      user_id ${id} primary key,
      specialty varchar(160) null,
      specialization varchar(160) null,
      license_number varchar(120) null,
      credentials_status varchar(40) not null default 'pending',
      bio ${text} null,
      years_experience int not null default 0,
      verification_status varchar(40) not null default 'PENDING',
      accepting_patients boolean not null default false,
      vacation_mode boolean not null default false,
      consultation_fee_cents int not null default 0,
      rating_average decimal(4,2) not null default 0,
      rating_count int not null default 0,
      verified_at datetime null,
      verified_by ${id} null,
      ${timestamps()},
      index idx_doctor_profiles_specialization (specialization),
      index idx_doctor_profiles_verification (verification_status),
      constraint fk_doctor_profiles_user foreign key (user_id) references users(id) on delete cascade
    )`,
    `create table if not exists doctor_jobs (
      id ${id} primary key,
      title varchar(180) not null,
      specialty varchar(160) null,
      specialization varchar(160) null,
      description ${text} null,
      requirements ${text} null,
      status varchar(40) not null default 'draft',
      created_by ${id} null,
      posted_by ${id} null,
      published_at datetime null,
      ${timestamps()}
    )`,
    `create table if not exists doctor_applications (
      id ${id} primary key,
      job_id ${id} null,
      email varchar(255) not null,
      first_name varchar(120) not null,
      last_name varchar(120) not null,
      phone varchar(80) null,
      cv_path varchar(500) null,
      license_document_path varchar(500) null,
      license_number varchar(120) null,
      medical_license_number varchar(120) null,
      documents_path varchar(500) null,
      specialization varchar(160) null,
      years_experience int not null default 0,
      status varchar(40) not null default 'PENDING',
      reviewed_by ${id} null,
      reviewed_at datetime null,
      created_doctor_id ${id} null,
      rejection_reason ${text} null,
      ${timestamps()},
      index idx_doctor_applications_status_created (status, created_at),
      index idx_doctor_applications_job (job_id)
    )`,
    `create table if not exists doctor_credentials (
      id ${id} primary key,
      application_id ${id} null,
      doctor_id ${id} null,
      license_number varchar(120) null,
      file_path varchar(500) null,
      original_name varchar(255) null,
      mime_type varchar(120) null,
      size_bytes bigint not null default 0,
      document_path varchar(500) null,
      status varchar(40) not null default 'PENDING',
      notes ${text} null,
      created_at datetime not null default current_timestamp
    )`,
    `create table if not exists doctor_verification_logs (
      id ${id} primary key,
      doctor_id ${id} not null,
      actor_id ${id} null,
      previous_status varchar(40) null,
      new_status varchar(40) not null,
      license_number varchar(120) null,
      notes ${text} null,
      created_at datetime not null default current_timestamp,
      index idx_doctor_verification_logs_doctor (doctor_id)
    )`,
    `create table if not exists doctors_availability (
      id ${id} primary key,
      doctor_id ${id} not null,
      day_of_week int not null,
      starts_at time not null,
      ends_at time not null,
      slot_minutes int not null default 30,
      is_active boolean not null default true,
      ${timestamps()},
      unique key uq_doctor_availability_slot (doctor_id, day_of_week, starts_at, ends_at),
      index idx_doctors_availability_doctor_active (doctor_id, day_of_week, is_active)
    )`,
    `create table if not exists doctor_availability (
      id ${id} primary key,
      doctor_id ${id} not null,
      available_date date not null,
      starts_at time not null,
      ends_at time not null,
      status varchar(40) not null default 'available',
      created_at datetime not null default current_timestamp,
      unique key uq_doctor_availability_date (doctor_id, available_date, starts_at, ends_at)
    )`,
    `create table if not exists doctor_unavailable_slots (
      id ${id} primary key,
      doctor_id ${id} not null,
      starts_at datetime not null,
      ends_at datetime not null,
      reason varchar(255) null,
      ${timestamps()},
      index idx_doctor_unavailable_slots_doctor (doctor_id, starts_at, ends_at)
    )`,
    `create table if not exists doctor_ratings (
      id ${id} primary key,
      doctor_id ${id} not null,
      patient_id ${id} not null,
      appointment_id ${id} null,
      rating int not null,
      review ${text} null,
      created_at datetime not null default current_timestamp,
      unique key uq_doctor_rating_appointment (appointment_id)
    )`
  ]);
}
