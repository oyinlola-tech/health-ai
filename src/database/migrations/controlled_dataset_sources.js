import { executeStatements, id, json } from "./helpers.js";

async function addIndexIfMissing(connection, tableName, indexName, expression) {
  const [rows] = await connection.execute(
    `select 1
     from information_schema.statistics
     where table_schema = database()
       and table_name = ?
       and index_name = ?
     limit 1`,
    [tableName, indexName]
  );
  if (rows.length) return;
  await connection.execute(`alter table ${tableName} add index ${indexName} (${expression})`);
}

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists dataset_sources (
      id ${id} primary key,
      source_key varchar(191) not null,
      dataset_name varchar(500) not null,
      dataset_author varchar(255) null,
      dataset_url varchar(900) not null,
      kaggle_ref varchar(255) not null,
      category varchar(120) not null,
      license varchar(255) null,
      download_date datetime null,
      dataset_size_bytes bigint not null default 0,
      row_count int not null default 0,
      purpose_category varchar(160) not null,
      quality_report ${json} null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_dataset_sources_key (source_key),
      index idx_dataset_sources_category (category),
      index idx_dataset_sources_kaggle_ref (kaggle_ref)
    )`
  ]);
  await addIndexIfMissing(connection, "lab_reference_ranges", "idx_lab_reference_ranges_test_name", "test_name");
  await addIndexIfMissing(connection, "lab_test_explanations", "idx_lab_test_explanations_display_name", "display_name");
}
