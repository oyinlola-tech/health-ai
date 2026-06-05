import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env, getAllowedOrigins } from "./config/env.js";
import { openApiSpec } from "./docs/openapi.js";
import { apiRateLimit } from "./middlewares/rateLimit.js";
import { csrfProtection } from "./middlewares/csrf.js";
import { requestIdMiddleware } from "./middlewares/requestId.js";
import { sanitizeRequest } from "./middlewares/sanitize.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware.js";
import { apiRoutes } from "./routes/index.js";
import { configController } from "./controllers/configController.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const appEntry = path.join(publicDir, "index.html");

const frontendRoutes = [
  "/",
  "/splash",
  "/onboarding",
  "/login",
  "/register",
  "/dashboard",
  "/reports",
  "/report/:id",
  "/reports/:id",
  "/upload",
  "/analysis/:id",
  "/chat",
  "/history",
  "/doctors",
  "/doctor-careers",
  "/doctor",
  "/doctor/:id",
  "/doctor-dashboard",
  "/appointments",
  "/doctor/patient-queue",
  "/doctor/appointments",
  "/doctor/consultations",
  "/doctor/medical-reports",
  "/doctor/messages",
  "/doctor/profile",
  "/doctor/verification-status",
  "/doctor/analytics",
  "/doctor/settings",
  "/profile",
  "/settings",
  "/subscription",
  "/payment-success",
  "/payment-failed",
  "/billing-history",
  "/update-plan",
  "/cancel-subscription",
  "/help",
  "/contact",
  "/privacy",
  "/terms",
  "/consent",
  "/data-policy",
  "/notifications",
  "/admin",
  "/admin/login",
  "/admin/users",
  "/admin/doctors",
  "/admin/doctor-applications",
  "/admin/reports",
  "/admin/ai-usage",
  "/admin/payments",
  "/admin/subscriptions",
  "/admin/security-logs",
  "/admin/audit-logs",
  "/admin/system-settings",
  "/admin/system",
  "/admin/jobs",
  "/admin/analytics",
  "/sitemap"
];

export function createApp() {
  const app = express();
  const allowedOrigins = new Set(getAllowedOrigins());

  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"]
        }
      },
      frameguard: { action: "deny" },
      referrerPolicy: { policy: "no-referrer" }
    })
  );
  app.use(
    cors({
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", "X-CSRF-Token"],
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error("CORS origin is not allowed."));
      }
    })
  );
  app.use(requestIdMiddleware);
  app.use(compression());
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buffer) => {
        req.rawBody = buffer.toString("utf8");
      }
    })
  );
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(express.static(publicDir));

  app.get("/health", async (req, res, next) => {
    try {
      await configController.health(req, res);
    } catch (error) {
      next(error);
    }
  });
  app.get(frontendRoutes, (_req, res) => res.sendFile(appEntry));

  app.get("/api-docs.json", (_req, res) => res.json(openApiSpec));
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: "MedExplain AI API Docs",
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true
      }
    })
  );
  app.use("/api", apiRateLimit, sanitizeRequest, csrfProtection, apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
