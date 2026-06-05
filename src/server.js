import http from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { verifyDatabaseConnection } from "./config/database.js";
import { validateStartupEnvironment } from "./config/startupValidation.js";
import { bootstrapDatabase } from "./database/bootstrap.js";
import { getHealthStatus } from "./services/healthCheckService.js";
import { registerSockets } from "./sockets/index.js";
import { logger } from "./utils/logger.js";

async function bootstrap() {
  for (const warning of validateStartupEnvironment()) {
    logger.warn(warning, { module: "startup" });
  }
  if (!env.SKIP_DB_STARTUP) {
    await bootstrapDatabase();
    await verifyDatabaseConnection();
    logger.info("MySQL database bootstrapped, seeded, and verified.", { module: "database" });
  }

  const app = createApp();
  const server = http.createServer(app);
  registerSockets(server);
  server.listen(env.PORT, async () => {
    const health = await getHealthStatus();
    logger.info(`${env.APP_NAME} listening.`, { module: "startup", port: env.PORT, environment: env.NODE_ENV, health });
  });
}

bootstrap().catch((error) => {
  logger.error("Application startup failed.", { module: "startup", message: error.message, stack: error.stack });
  process.exit(1);
});
