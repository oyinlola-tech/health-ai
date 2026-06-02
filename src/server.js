import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { verifyDatabaseConnection } from "./config/database.js";
import { runMigrations } from "./database/migrate.js";
import { logger } from "./utils/logger.js";

async function bootstrap() {
  if (!env.SKIP_DB_STARTUP) {
    await verifyDatabaseConnection();
    await runMigrations();
    logger.info("Database connection verified and migrations applied.");
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`${env.APP_NAME} listening.`, { port: env.PORT, environment: env.NODE_ENV });
  });
}

bootstrap().catch((error) => {
  logger.error("Application startup failed.", { message: error.message, stack: error.stack });
  process.exit(1);
});
