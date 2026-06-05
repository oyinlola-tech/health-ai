import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .default(false)
  .transform((value) => value === true || value === "true");

const developmentSecrets = new Set([
  "development-access-secret-change-before-production",
  "development-refresh-secret-change-before-production",
  "development-cookie-secret-change-before-production",
  "development-csrf-secret-change-before-production"
]);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    APP_NAME: z.string().default("MedExplain AI"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/medexplain_ai"),
    DATABASE_SSL: booleanFromEnv,
    SKIP_DB_STARTUP: booleanFromEnv,
    JWT_ACCESS_SECRET: z.string().min(16).default("development-access-secret-change-before-production"),
    JWT_REFRESH_SECRET: z.string().min(16).default("development-refresh-secret-change-before-production"),
    JWT_ISSUER: z.string().default("medexplain-ai"),
    JWT_AUDIENCE: z.string().default("medexplain-ai-users"),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(2592000),
    COOKIE_SECRET: z.string().min(16).default("development-cookie-secret-change-before-production"),
    CSRF_SECRET: z.string().min(16).default("development-csrf-secret-change-before-production"),
    CORS_ORIGINS: z.string().default("http://localhost:3000"),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    GEMINI_API_KEY: z.string().optional().default(""),
    GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
    GEMINI_FLASH_MODEL: z.string().default("gemini-1.5-flash"),
    GEMINI_PRO_MODEL: z.string().default("gemini-1.5-pro"),
    GEMINI_EMBEDDING_MODEL: z.string().default("text-embedding-004"),
    AI_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
    AI_CACHE_MAX_ITEMS: z.coerce.number().int().positive().default(500),
    AI_DAILY_USER_BUDGET_CENTS: z.coerce.number().int().nonnegative().default(250),
    AI_DAILY_GLOBAL_BUDGET_CENTS: z.coerce.number().int().nonnegative().default(10000),
    AI_MONTHLY_SYSTEM_BUDGET_USD: z.coerce.number().nonnegative().default(100),
    AI_FREE_MONTHLY_BUDGET_USD: z.coerce.number().nonnegative().default(1),
    AI_PREMIUM_MONTHLY_BUDGET_USD: z.coerce.number().nonnegative().default(25),
    AI_FEATURE_REPORT_MONTHLY_BUDGET_USD: z.coerce.number().nonnegative().default(60),
    AI_FEATURE_CHAT_MONTHLY_BUDGET_USD: z.coerce.number().nonnegative().default(25),
    AI_FEATURE_DOCTOR_ASSIST_MONTHLY_BUDGET_USD: z.coerce.number().nonnegative().default(20),
    AI_FREE_DAILY_REQUEST_LIMIT: z.coerce.number().int().nonnegative().default(20),
    AI_PREMIUM_DAILY_REQUEST_LIMIT: z.coerce.number().int().nonnegative().default(250),
    AI_PER_MINUTE_REQUEST_LIMIT: z.coerce.number().int().nonnegative().default(8),
    AI_BURST_PER_MINUTE: z.coerce.number().int().nonnegative().default(5),
    AI_MAX_PROMPT_CHARS: z.coerce.number().int().positive().default(28000),
    AI_MAX_CONTEXT_CHARS: z.coerce.number().int().positive().default(12000),
    AI_NGN_PER_USD: z.coerce.number().nonnegative().default(0),
    AI_FLASH_COST_PER_1K_TOKENS_CENTS: z.coerce.number().nonnegative().default(0.02),
    AI_PRO_COST_PER_1K_TOKENS_CENTS: z.coerce.number().nonnegative().default(1.25),
    AI_EMBEDDING_COST_PER_1K_TOKENS_CENTS: z.coerce.number().nonnegative().default(0.01),
    RAG_RETRIEVAL_LIMIT: z.coerce.number().int().positive().max(20).default(5),
    RAG_MAX_CONTEXT_CHARS: z.coerce.number().int().positive().default(6000),
    SMTP_HOST: z.string().optional().default(""),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: booleanFromEnv,
    SMTP_USER: z.string().optional().default(""),
    SMTP_PASS: z.string().optional().default(""),
    SMTP_FROM: z.string().default("MedExplain AI <no-reply@medexplain.local>"),
    UPLOAD_ROOT: z.string().default("uploads"),
    MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10485760),
    ALLOWED_UPLOAD_MIME_TYPES: z.string().default("application/pdf,image/png,image/jpeg,image/webp"),
    REPORT_EXTRACTION_CONFIDENCE_THRESHOLD: z.coerce.number().int().min(0).max(100).default(65),
    REPORT_PROCESSING_VERSION: z.string().default("report-pipeline-v1"),
    OCR_LANGUAGE: z.string().default("eng"),
    PAYMENT_PROVIDER: z.string().default("opay"),
    PAYMENT_PUBLIC_KEY: z.string().optional().default(""),
    PAYMENT_SECRET_KEY: z.string().optional().default(""),
    OPAY_BASE_URL: z.string().url().default("https://testapi.opaycheckout.com"),
    OPAY_MERCHANT_ID: z.string().optional().default(""),
    OPAY_PUBLIC_KEY: z.string().optional().default(""),
    OPAY_SECRET_KEY: z.string().optional().default(""),
    OPAY_WEBHOOK_SECRET: z.string().optional().default(""),
    OPAY_COUNTRY: z.string().default("NG"),
    OPAY_CURRENCY: z.string().default("NGN"),
    PREMIUM_MONTHLY_PRICE_CENTS: z.coerce.number().int().positive().default(500000),
    PREMIUM_ANNUAL_PRICE_CENTS: z.coerce.number().int().positive().default(5000000),
    FREE_REPORT_ANALYSIS_LIMIT: z.coerce.number().int().nonnegative().default(3),
    FREE_AI_CHAT_LIMIT: z.coerce.number().int().nonnegative().default(10),
    MESSAGE_ENCRYPTION_SECRET: z.string().min(16).default("development-message-secret-change-before-production")
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;

    for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "COOKIE_SECRET", "CSRF_SECRET"]) {
      if (developmentSecrets.has(value[key])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must be explicitly configured for production.`
        });
      }
    }
  });

export const env = envSchema.parse(process.env);

export const publicConfig = {
  appName: env.APP_NAME,
  appUrl: env.PUBLIC_APP_URL,
  paymentProvider: env.PAYMENT_PROVIDER,
  paymentPublicKey: env.PAYMENT_PUBLIC_KEY || null
};

export function getAllowedOrigins() {
  return env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAllowedMimeTypes() {
  return env.ALLOWED_UPLOAD_MIME_TYPES.split(",")
    .map((type) => type.trim())
    .filter(Boolean);
}
