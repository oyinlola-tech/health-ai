import mysql from "mysql2/promise";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { pool } from "./connection.js";
import { migrations } from "./migrations/index.js";
import { seedAdminUser } from "./seeds/admin.js";
import { seedSystemData } from "./seeds/systemData.js";

function assertSafeDatabaseName(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error("DB_NAME may only contain letters, numbers, and underscores.");
  }
}

async function createServerConnection() {
  return mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: false
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectWithRetry(factory, { retries = env.DB_CONNECTION_RETRIES, delayMs = env.DB_CONNECTION_RETRY_MS } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      logger.warn("MySQL connection failed; retrying.", { attempt: attempt + 1, retries, message: error.message });
      if (delayMs) await wait(delayMs);
    }
  }
  throw lastError;
}

export async function ensureDatabaseExists() {
  assertSafeDatabaseName(env.DB_NAME);
  const connection = await connectWithRetry(createServerConnection);
  try {
    await connection.execute(
      `create database if not exists \`${env.DB_NAME}\` character set utf8mb4 collate utf8mb4_unicode_ci`
    );
    logger.info("Database bootstrap checked database.", { database: env.DB_NAME });
  } finally {
    await connection.end();
  }
}

async function ensureMigrationTable(connection) {
  await connection.execute(`
    create table if not exists schema_migrations (
      id varchar(120) primary key,
      applied_at datetime not null default current_timestamp
    )
  `);
}

export async function runJavaScriptMigrations(connection = pool.raw, migrationList = migrations) {
  await ensureMigrationTable(connection);
  for (const [name, up] of migrationList) {
    const [existing] = await connection.execute("select id from schema_migrations where id = ? limit 1", [name]);
    if (existing.length) continue;
    await connection.beginTransaction();
    try {
      await up(connection);
      await connection.execute("insert into schema_migrations (id) values (?)", [name]);
      await connection.commit();
      logger.info("JavaScript migration applied.", { migration: name });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
}

export async function bootstrapDatabase() {
  await ensureDatabaseExists();
  const connection = await pool.raw.getConnection();
  try {
    await runJavaScriptMigrations(connection);
    await seedSystemData(connection);
    await seedAdminUser(connection);
  } finally {
    connection.release();
  }
}
