import { fileURLToPath } from "node:url";
import { bootstrapDatabase } from "./bootstrap.js";
import { pool } from "./connection.js";
import { logger } from "../utils/logger.js";

export async function runMigrations() {
  await bootstrapDatabase();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(async () => {
      await pool.end();
    })
    .catch(async (error) => {
      logger.error("Migration failed.", { message: error.message });
      await pool.end();
      process.exit(1);
    });
}
