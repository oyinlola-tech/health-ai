import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

export async function seedDemoData() {
  if (!env.DEMO_MODE) return { seeded: false };
  logger.warn("DEMO_MODE is enabled, but synthetic database seeding is disabled by the data integrity policy.", {
    module: "database",
    demoMode: true
  });
  return { seeded: false, reason: "synthetic_data_disabled" };
}

