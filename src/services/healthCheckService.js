import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { verifyDatabaseConnection } from "../config/database.js";
import { isSocketServerReady } from "../sockets/hub.js";

async function checkDatabase() {
  await verifyDatabaseConnection();
  return true;
}

async function withTimeout(check, timeoutMs = 3000) {
  let timeout;
  try {
    return await Promise.race([
      check(),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Health check timed out.")), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function checkStorage() {
  const uploadRoot = path.resolve(env.UPLOAD_ROOT);
  await fs.mkdir(uploadRoot, { recursive: true });
  await fs.access(uploadRoot);
  return true;
}

function checkAi() {
  return Boolean(env.GEMINI_API_KEY);
}

function checkRealtime() {
  return isSocketServerReady();
}

export async function getHealthStatus() {
  const results = await Promise.allSettled([withTimeout(checkDatabase), withTimeout(checkStorage)]);
  const services = {
    db: results[0].status === "fulfilled",
    ai: checkAi(),
    realtime: checkRealtime(),
    storage: results[1].status === "fulfilled"
  };
  const status = Object.values(services).every(Boolean) ? "healthy" : "degraded";

  return {
    status,
    services
  };
}
