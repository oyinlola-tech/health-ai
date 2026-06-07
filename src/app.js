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
const sitemapEntry = path.join(publicDir, "sitemap.html");

const legacyFrontendRedirects = new Map([
  ["/index.html", "/"],
  ["/sitemap.html", "/sitemap"],
  ["/auth/login.html", "/login"],
  ["/auth/signup.html", "/register"],
  ["/auth/welcome.html", "/"],
  ["/auth/splash.html", "/splash"],
  ["/repots", "/reports"],
  ["/app/dashboard.html", "/dashboard"],
  ["/app/upload.html", "/reports"],
  ["/app/uploadfile.html", "/reports"],
  ["/app/report-analysis.html", "/reports"],
  ["/app/upload-process.html", "/reports"],
  ["/app/processing-result.html", "/reports"],
  ["/app/ai-analysis.html", "/chat"],
  ["/app/camera-scan.html", "/reports"],
  ["/report/summary.html", "/reports"],
  ["/report/detailed-report.html", "/reports"],
  ["/report/test-explanation.html", "/reports"],
  ["/ai-assistant/chat-home.html", "/chat"],
  ["/ai-assistant/conversation.html", "/chat"],
  ["/ai-assistant/saved-conv.html", "/chat"],
  ["/ai-assistant/voice-input.html", "/chat"],
  ["/consultation/find-doctor.html", "/doctors"],
  ["/consultation/profile.html", "/doctors"],
  ["/consultation/appointments.html", "/appointments"],
  ["/consultation/appointment-confirmation.html", "/appointments"],
  ["/consultation/payment.html", "/subscription"],
  ["/premium/index.html", "/subscription"],
  ["/premium/plans.html", "/subscription"],
  ["/premium/payment.html", "/update-plan"],
  ["/premium/activated.html", "/payment-success"],
  ["/profile/overview.html", "/profile"],
  ["/profile/edit.html", "/profile"],
  ["/profile/information.html", "/profile"],
  ["/profile/emergency.html", "/profile"],
  ["/profile/preference.html", "/profile"],
  ["/settings/home.html", "/settings"],
  ["/settings/security.html", "/settings"],
  ["/settings/privacy-data.html", "/privacy"],
  ["/settings/accessibility.html", "/settings"],
  ["/learning-center/home.html", "/medical-knowledge"],
  ["/learning-center/articles.html", "/medical-knowledge"],
  ["/learning-center/terms.html", "/terms"],
  ["/learning-center/trusted-source.html", "/medical-knowledge"],
  ["/notifications/list.html", "/dashboard"],
  ["/notifications/details.html", "/dashboard"],
  ["/notifications/settings.html", "/dashboard"],
  ["/admin/index.html", "/admin"],
  ["/admin/login.html", "/login"],
  ["/admin/user.html", "/admin/users"],
  ["/admin/report.html", "/admin/reports"],
  ["/admin/feedback.html", "/admin"],
  ["/admin/system-health.html", "/admin/system"],
  ["/empty-state/report.html", "/empty/no-reports"],
  ["/empty-state/appointment.html", "/empty/no-appointments"],
  ["/empty-state/conversation.html", "/empty/no-chat-history"],
  ["/empty-state/history.html", "/empty/no-health-history"],
  ["/empty-state/notification.html", "/empty/no-notifications"],
  ["/error-state/upload.html", "/error/report-processing"],
  ["/error-state/payment.html", "/error/payment"],
  ["/error-state/server.html", "/error/500"],
  ["/error-state/network.html", "/offline"],
  ["/error-state/analysis.html", "/error/ai"],
  ["/success-state/appointment.html", "/success/appointment-booked"],
  ["/success-state/upload.html", "/success/report-uploaded"],
  ["/success-state/payment.html", "/success/payment"],
  ["/success-state/analysis.html", "/success/analysis-complete"],
  ["/health/dashboard.html", "/profile"],
  ["/health/trend.html", "/profile"]
]);

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
  "/checkout",
  "/payment-success",
  "/payment-failed",
  "/success/report-uploaded",
  "/success/analysis-complete",
  "/success/appointment-booked",
  "/success/payment",
  "/success/subscription-activated",
  "/success/doctor-application",
  "/success/profile-updated",
  "/success/password-changed",
  "/error/400",
  "/error/401",
  "/error/403",
  "/error/404",
  "/error/408",
  "/error/429",
  "/error/500",
  "/error/database",
  "/error/ai",
  "/error/report-processing",
  "/error/ocr",
  "/error/payment",
  "/error/subscription-expired",
  "/error/doctor-unavailable",
  "/error/booking",
  "/error/chat-disconnected",
  "/error/file-too-large",
  "/error/file-type",
  "/maintenance",
  "/offline",
  "/empty/no-reports",
  "/empty/no-appointments",
  "/empty/no-notifications",
  "/empty/no-doctors",
  "/empty/no-search-results",
  "/empty/no-chat-history",
  "/empty/no-health-history",
  "/empty/no-payments",
  "/empty/no-subscriptions",
  "/empty/no-ai-analyses",
  "/billing-history",
  "/update-plan",
  "/cancel-subscription",
  "/help",
  "/medical-knowledge",
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
  "/admin/coupons",
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
  app.use((req, res, next) => {
    const canonical = legacyFrontendRedirects.get(req.path);
    if (canonical) return res.redirect(301, canonical);
    return next();
  });
  app.use(express.static(publicDir));

  app.get("/health", async (req, res, next) => {
    try {
      await configController.health(req, res);
    } catch (error) {
      next(error);
    }
  });
  app.get("/sitemap", (_req, res) => res.sendFile(sitemapEntry));
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
