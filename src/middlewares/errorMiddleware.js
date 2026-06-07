import { AppError } from "../utils/errors.js";
import { sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import { eventBus } from "../modules/events/event.bus.js";
import { eventTypes } from "../modules/events/event.types.js";

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "ROUTE_NOT_FOUND"));
}

export function errorHandler(error, req, res, _next) {
  void _next;
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    logger.error(error.message, { module: "http", requestId: req.requestId, stack: error.stack });
    eventBus.publishLater(eventTypes.SYSTEM_ERROR_ALERT, {
      message: `${req.method} ${req.originalUrl} failed with ${statusCode}. Request ID: ${req.requestId}.`,
      keyData: { Route: `${req.method} ${req.originalUrl}`, Status: statusCode, "Request ID": req.requestId }
    }, { idempotencyKey: `system-error:${req.requestId}` });
  }
  return sendError(res, error, statusCode);
}
