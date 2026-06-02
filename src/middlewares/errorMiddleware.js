import { AppError } from "../utils/errors.js";
import { sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "ROUTE_NOT_FOUND"));
}

export function errorHandler(error, _req, res) {
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    logger.error(error.message, { stack: error.stack });
  }
  return sendError(res, error, statusCode);
}
