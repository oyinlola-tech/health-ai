import mysql from "mysql2/promise";
import { env } from "../config/env.js";

function normalizeParam(value) {
  if (value === undefined) return null;
  if (value && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
        try {
          row[key] = JSON.parse(value);
        } catch {
          // Keep non-JSON strings unchanged.
        }
      }
    }
    return row;
  });
}

function stripPostgresCasts(sql) {
  return sql
    .replace(/::jsonb/gi, "")
    .replace(/::json/gi, "")
    .replace(/::timestamptz/gi, "")
    .replace(/::timestamp/gi, "")
    .replace(/::date/gi, "")
    .replace(/::integer/gi, "")
    .replace(/::int/gi, "")
    .replace(/::float/gi, "")
    .replace(/::numeric/gi, "")
    .replace(/::text/gi, "");
}

function normalizeSyntax(sql) {
  return stripPostgresCasts(sql)
    .replace(/count\(\*\)\s+filter\s*\(\s*where\s+([^)]+)\)/gi, "sum(case when $1 then 1 else 0 end)")
    .replace(/\btrue\b/g, "1")
    .replace(/\bfalse\b/g, "0")
    .replace(/date_trunc\('day',\s*created_at\)/gi, "date(created_at)")
    .replace(/date_trunc\('month',\s*now\(\)\)/gi, "date_format(current_date, '%Y-%m-01')")
    .replace(/date_trunc\('day',\s*now\(\)\)/gi, "current_date")
    .replace(/now\(\)\s*-\s*interval\s*'30 days'/gi, "date_sub(now(), interval 30 day)")
    .replace(/now\(\)\s*\+\s*interval\s*'1 year'/gi, "date_add(now(), interval 1 year)")
    .replace(/now\(\)\s*\+\s*interval\s*'1 month'/gi, "date_add(now(), interval 1 month)")
    .replace(/on conflict\s*\([^)]+\)(?:\s+where\s+[^)]+)?\s+do nothing/gi, "on duplicate key update id = id")
    .replace(/on conflict\s*\([^)]+\)\s*do update\s*set/gi, "on duplicate key update")
    .replace(/excluded\.([a-z0-9_]+)/gi, "values($1)")
    .replace(/\b[a-z0-9_]+\.(requests|input_tokens|output_tokens|cost_ngn|cache_hits|blocked_requests|used_count|metadata)\b/gi, "$1")
    .replace(/metadata\s*=\s*metadata\s*\|\|\s*values\(metadata\)/gi, "metadata = json_merge_patch(coalesce(metadata, json_object()), coalesce(values(metadata), json_object()))")
    .replace(/date_format\(current_date, '%Y-%m-01'\)\s*\+\s*interval\s*'1 month - 1 day'/gi, "last_day(current_date)")
    .replace(/date_format\(current_date, '%Y-%m-01'\)\s*\+\s*interval\s*'1 month'/gi, "date_add(date_format(current_date, '%Y-%m-01'), interval 1 month)")
    .replace(/\$(\d+)/g, "?")
    .replace(/\(\?\s*\|\|\s*' seconds'\)/gi, "interval ? second")
    .replace(/\(\?\s*\|\|\s*' minutes'\)/gi, "interval ? minute");
}

function extractReturning(sql) {
  const match = sql.match(/\s+returning\s+([\s\S]+)$/i);
  if (!match) return { sql, returning: null };
  return {
    sql: sql.slice(0, match.index).trim(),
    returning: match[1].trim()
  };
}

function tableFromMutation(sql) {
  return sql.match(/^\s*insert\s+into\s+`?([a-z0-9_]+)`?/i)?.[1] || sql.match(/^\s*update\s+`?([a-z0-9_]+)`?/i)?.[1] || null;
}

function selectColumns(returning) {
  if (!returning || returning === "*") return "*";
  return returning
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

async function selectReturning(connection, table, returning, params, originalSql) {
  if (!table || !params.length) return [];
  const columns = selectColumns(returning);
  const firstParam = params[0];
  const selectors = [`select ${columns} from ${table} where id = ? limit 1`];
  const selectorParams = [[firstParam]];

  if (/where\s+provider_reference\s*=\s*\$1/i.test(originalSql)) {
    selectors.push(`select ${columns} from ${table} where provider_reference = ? limit 1`);
    selectorParams.push([firstParam]);
  }
  if (/where\s+user_id\s*=\s*\$1/i.test(originalSql)) {
    selectors.push(`select ${columns} from ${table} where user_id = ? limit 1`);
    selectorParams.push([firstParam]);
  }

  for (let index = 0; index < selectors.length; index += 1) {
    const [rows] = await connection.execute(selectors[index], selectorParams[index]);
    if (rows.length) return normalizeRows(rows);
  }
  return [];
}

function createPgLikeClient(connection) {
  return {
    async query(sql, params = []) {
      const normalizedParams = params.map(normalizeParam);
      const command = String(sql).trim().toLowerCase();
      if (command === "begin") {
        await connection.beginTransaction();
        return { rows: [], rowCount: 0 };
      }
      if (command === "commit") {
        await connection.commit();
        return { rows: [], rowCount: 0 };
      }
      if (command === "rollback") {
        await connection.rollback();
        return { rows: [], rowCount: 0 };
      }

      const { sql: withoutReturning, returning } = extractReturning(sql);
      const mysqlSql = normalizeSyntax(withoutReturning);
      const [result] = await connection.execute(mysqlSql, normalizedParams);
      if (Array.isArray(result)) {
        return { rows: normalizeRows(result), rowCount: result.length };
      }
      if (returning) {
        const rows = await selectReturning(connection, tableFromMutation(withoutReturning), returning, normalizedParams, sql);
        return { rows, rowCount: rows.length };
      }
      return { rows: [], rowCount: result.affectedRows || 0 };
    },
    release() {
      connection.release?.();
    }
  };
}

export function createPool(config = {}) {
  const mysqlPool = mysql.createPool({
    host: config.host || env.DB_HOST,
    port: config.port || env.DB_PORT,
    user: config.user || env.DB_USER,
    password: config.password ?? env.DB_PASSWORD,
    database: config.database || env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
    multipleStatements: false,
    charset: "utf8mb4"
  });

  return {
    async query(sql, params = []) {
      const connection = await mysqlPool.getConnection();
      try {
        return await createPgLikeClient(connection).query(sql, params);
      } finally {
        connection.release();
      }
    },
    async execute(sql, params = []) {
      return mysqlPool.execute(sql, params.map(normalizeParam));
    },
    async getConnection() {
      const connection = await mysqlPool.getConnection();
      return createPgLikeClient(connection);
    },
    async end() {
      await mysqlPool.end();
    },
    raw: mysqlPool
  };
}

export const pool = createPool();

export async function verifyDatabaseConnection() {
  await pool.query("select 1 as ok");
}

export async function withTransaction(callback) {
  const client = await pool.getConnection();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
