export class AppError extends Error {
  constructor(message, statusCode = 500, code = "APP_ERROR", details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const errors = {
  badRequest: (message = "Bad request.", details = null) => new AppError(message, 400, "BAD_REQUEST", details),
  unauthorized: (message = "Authentication is required.") => new AppError(message, 401, "UNAUTHORIZED"),
  forbidden: (message = "You do not have permission to perform this action.") => new AppError(message, 403, "FORBIDDEN"),
  notFound: (message = "Resource not found.") => new AppError(message, 404, "NOT_FOUND"),
  conflict: (message = "Resource already exists.") => new AppError(message, 409, "CONFLICT"),
  validation: (details) => new AppError("Validation failed.", 422, "VALIDATION_ERROR", details),
  config: (message) => new AppError(message, 500, "CONFIGURATION_ERROR")
};
