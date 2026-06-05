import { executeStatements, id, json, text } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists consultation_sessions (
      id ${id} primary key,
      appointment_id ${id} null,
      patient_id ${id} not null,
      doctor_id ${id} not null,
      status varchar(40) not null default 'SCHEDULED',
      scheduled_at datetime null,
      room_key varchar(180) null,
      mode varchar(40) null,
      channel varchar(40) not null default 'CHAT',
      metadata ${json} null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_consultation_appointment (appointment_id),
      index idx_consultation_sessions_patient_created (patient_id, created_at),
      index idx_consultation_sessions_doctor_created (doctor_id, created_at)
    )`,
    `create table if not exists chat_sessions (
      id ${id} primary key,
      consultation_session_id ${id} null,
      appointment_id ${id} null,
      patient_id ${id} not null,
      doctor_id ${id} not null,
      status varchar(40) not null default 'ACTIVE',
      metadata ${json} null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_chat_consultation (consultation_session_id),
      index idx_chat_sessions_patient (patient_id),
      index idx_chat_sessions_doctor (doctor_id)
    )`,
    `create table if not exists chat_messages (
      id ${id} primary key,
      user_id ${id} null,
      consultation_session_id ${id} null,
      chat_session_id ${id} null,
      role varchar(40) null,
      sender_type varchar(40) not null default 'user',
      sender_id ${id} not null,
      recipient_id ${id} null,
      content ${text} null,
      encrypted_content ${json} null,
      metadata ${json} null,
      read_at datetime null,
      created_at datetime not null default current_timestamp,
      index idx_chat_messages_user (user_id, created_at),
      index idx_chat_messages_consultation (consultation_session_id, created_at),
      index idx_chat_messages_chat_session (chat_session_id, created_at)
    )`,
    `create table if not exists message_delivery_status (
      id ${id} primary key,
      message_id ${id} not null,
      user_id ${id} not null,
      socket_id varchar(180) null,
      status varchar(40) not null,
      delivered_at datetime null,
      read_at datetime null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_message_delivery (message_id, user_id)
    )`
  ]);
}
