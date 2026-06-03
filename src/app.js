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
import { sanitizeRequest } from "./middlewares/sanitize.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware.js";
import { apiRoutes } from "./routes/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");

export function createApp() {
  const app = express();
  const allowedOrigins = new Set(getAllowedOrigins());

  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"]
        }
      }
    })
  );
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error("CORS origin is not allowed."));
      }
    })
  );
  app.use(compression());
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(express.static(publicDir));

  app.get("/", (_req, res) => res.redirect("/splash"));
  app.get("/splash", (_req, res) => res.sendFile(path.join(publicDir, "auth", "splash.html")));
  app.get("/onboarding", (_req, res) => res.sendFile(path.join(publicDir, "auth", "onboard1.html")));
  app.get("/login", (_req, res) => res.sendFile(path.join(publicDir, "auth", "login.html")));
  app.get("/register", (_req, res) => res.sendFile(path.join(publicDir, "auth", "signup.html")));
  app.get("/dashboard", (_req, res) => res.sendFile(path.join(publicDir, "app", "dashboard.html")));
  app.get("/reports", (_req, res) => res.sendFile(path.join(publicDir, "report", "summary.html")));
  app.get("/reports/:id", (_req, res) => res.sendFile(path.join(publicDir, "report", "detailed-report.html")));
  app.get("/upload", (_req, res) => res.sendFile(path.join(publicDir, "app", "upload.html")));
  app.get("/analysis/:id", (_req, res) => res.sendFile(path.join(publicDir, "app", "report-analysis.html")));
  app.get("/chat", (_req, res) => res.sendFile(path.join(publicDir, "ai-assistant", "chat-home.html")));
  app.get("/history", (_req, res) => res.sendFile(path.join(publicDir, "ai-assistant", "saved-conv.html")));
  app.get("/profile", (_req, res) => res.sendFile(path.join(publicDir, "profile", "overview.html")));
  app.get("/settings", (_req, res) => res.sendFile(path.join(publicDir, "settings", "home.html")));
  app.get("/notifications", (_req, res) => res.sendFile(path.join(publicDir, "notifications", "list.html")));
  app.get("/subscription", (_req, res) => res.sendFile(path.join(publicDir, "premium", "plans.html")));
  app.get("/doctor", (_req, res) => res.sendFile(path.join(publicDir, "admin", "index.html")));
  app.get("/doctor/patients", (_req, res) => res.sendFile(path.join(publicDir, "admin", "index.html")));
  app.get("/doctor/patients/:id", (_req, res) => res.sendFile(path.join(publicDir, "admin", "user.html")));
  app.get("/doctor/reports", (_req, res) => res.sendFile(path.join(publicDir, "admin", "report.html")));
  app.get("/doctor/appointments", (_req, res) => res.sendFile(path.join(publicDir, "admin", "index.html")));
  app.get("/doctor/messages", (_req, res) => res.sendFile(path.join(publicDir, "admin", "index.html")));
  app.get("/doctor/analytics", (_req, res) => res.sendFile(path.join(publicDir, "admin", "index.html")));
  app.get("/doctor/settings", (_req, res) => res.sendFile(path.join(publicDir, "admin", "index.html")));
  app.get("/admin", (_req, res) => res.sendFile(path.join(publicDir, "admin", "login.html")));
  app.get("/admin/users", (_req, res) => res.sendFile(path.join(publicDir, "admin", "user.html")));
  app.get("/admin/doctors", (_req, res) => res.sendFile(path.join(publicDir, "admin", "index.html")));
  app.get("/admin/jobs", (_req, res) => res.sendFile(path.join(publicDir, "admin", "index.html")));
  app.get("/admin/payments", (_req, res) => res.sendFile(path.join(publicDir, "admin", "index.html")));
  app.get("/admin/analytics", (_req, res) => res.sendFile(path.join(publicDir, "admin", "index.html")));
  app.get("/admin/system", (_req, res) => res.sendFile(path.join(publicDir, "admin", "system-health.html")));

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