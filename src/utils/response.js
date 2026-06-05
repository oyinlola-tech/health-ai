export function sendSuccess(res, data = null, meta = {}, statusCode = 200) {
  const payload = { success: true, data };
  if (meta && Object.keys(meta).length) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

export function sendError(res, error, statusCode = 500) {
  const productionServerError = process.env.NODE_ENV === "production" && statusCode >= 500;
  const payload = {
    success: false,
    error: {
      code: productionServerError ? "INTERNAL_SERVER_ERROR" : error.code || "INTERNAL_SERVER_ERROR",
      message: productionServerError ? "An unexpected error occurred." : error.message || "An unexpected error occurred."
    }
  };
  if (!productionServerError && error.details) payload.error.details = error.details;
  return res.status(statusCode).json(payload);
}
