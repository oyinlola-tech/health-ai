import { executeStatements, id, json, text } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists medical_dataset_sources (
      id ${id} primary key,
      source_key varchar(191) not null,
      dataset_name varchar(500) not null,
      dataset_author varchar(255) null,
      dataset_url varchar(900) not null,
      kaggle_ref varchar(255) not null,
      category varchar(120) not null,
      license varchar(255) null,
      download_date datetime null,
      raw_path varchar(900) null,
      extracted_path varchar(900) null,
      processed_path varchar(900) null,
      size_bytes bigint not null default 0,
      row_count int not null default 0,
      import_status varchar(80) not null default 'pending',
      quality_report ${json} null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_medical_dataset_sources_key (source_key),
      index idx_medical_dataset_sources_category (category)
    )`,
    `create table if not exists medical_conditions (
      id ${id} primary key,
      name varchar(255) not null,
      category varchar(120) not null,
      description ${text} null,
      source_id ${id} null,
      metadata ${json} null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_medical_conditions_name_category (name, category),
      index idx_medical_conditions_source (source_id)
    )`,
    `create table if not exists medical_symptoms (
      id ${id} primary key,
      name varchar(255) not null,
      normalized_name varchar(255) not null,
      condition_id ${id} null,
      source_id ${id} null,
      metadata ${json} null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_medical_symptoms_name_source (normalized_name, source_id),
      index idx_medical_symptoms_condition (condition_id)
    )`,
    `create table if not exists disease_risk_factors (
      id ${id} primary key,
      condition_id ${id} null,
      source_id ${id} not null,
      row_hash char(64) not null,
      factors ${json} not null,
      outcome_label varchar(255) null,
      outcome_value varchar(255) null,
      metadata ${json} null,
      created_at datetime not null default current_timestamp,
      unique key uq_disease_risk_factors_row (source_id, row_hash),
      index idx_disease_risk_factors_condition (condition_id)
    )`,
    `create table if not exists lab_reference_ranges (
      id ${id} primary key,
      source_id ${id} not null,
      test_name varchar(255) not null,
      standard_name varchar(120) not null,
      unit varchar(80) null,
      observed_min decimal(18,6) null,
      observed_max decimal(18,6) null,
      observed_mean decimal(18,6) null,
      sample_count int not null default 0,
      metadata ${json} null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_lab_reference_ranges_source_test (source_id, standard_name),
      index idx_lab_reference_ranges_standard (standard_name)
    )`,
    `create table if not exists lab_test_explanations (
      id ${id} primary key,
      standard_name varchar(120) not null,
      display_name varchar(255) not null,
      explanation ${text} not null,
      aliases ${json} null,
      source_id ${id} null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_lab_test_explanations_standard (standard_name)
    )`
  ]);
}
