import { env } from "./env.js";

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function productionSecretIsWeak(value) {
  return !hasValue(value) || String(value).startsWith("replace-with-") || String(value).startsWith("development-");
}

export function validateStartupEnvironment() {
  const missing = [];
  const weak = [];

  for (const key of ["DB_HOST", "DB_USER", "DB_NAME", "ADMIN_EMAIL", "ADMIN_PASSWORD", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
    if (!hasValue(env[key])) missing.push(key);
  }

  if (env.NODE_ENV === "production") {
    for (const key of ["COOKIE_SECRET", "CSRF_SECRET", "MESSAGE_ENCRYPTION_SECRET"]) {
      if (!hasValue(env[key])) missing.push(key);
    }
    for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "COOKIE_SECRET", "CSRF_SECRET", "MESSAGE_ENCRYPTION_SECRET"]) {
      if (productionSecretIsWeak(env[key])) weak.push(key);
    }
    if (!env.DEMO_MODE) {
      for (const key of ["GEMINI_API_KEY", "OPAY_MERCHANT_ID", "OPAY_PUBLIC_KEY", "OPAY_SECRET_KEY", "OPAY_WEBHOOK_SECRET"]) {
        if (!hasValue(env[key])) missing.push(key);
      }
    }
  }

  if (missing.length || weak.length) {
    const parts = [];
    if (missing.length) parts.push(`Missing required environment variables: ${[...new Set(missing)].join(", ")}`);
    if (weak.length) parts.push(`Production secrets must be replaced: ${[...new Set(weak)].join(", ")}`);
    throw new Error(parts.join(". "));
  }

  const warnings = [];
  if (env.NODE_ENV !== "production") {
    for (const key of ["GEMINI_API_KEY", "OPAY_MERCHANT_ID", "OPAY_PUBLIC_KEY", "OPAY_SECRET_KEY"]) {
      if (!hasValue(env[key])) warnings.push(`${key} is not set; related live integrations are unavailable outside DEMO_MODE.`);
    }
  }
  return warnings;
}
