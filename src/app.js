import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env, getAllowedOrigins } from "./config/env.js";
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

  app.get("/", (_req, res) => res.redirect("/auth/welcome.html"));
  app.use("/api", apiRateLimit, sanitizeRequest, csrfProtection, apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
