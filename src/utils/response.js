export function sendSuccess(res, data = null, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
    meta
  });
}

export function sendError(res, error, statusCode = 500) {
  const productionServerError = process.env.NODE_ENV === "production" && statusCode >= 500;
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code: productionServerError ? "INTERNAL_SERVER_ERROR" : error.code || "INTERNAL_SERVER_ERROR",
      message: productionServerError ? "An unexpected error occurred." : error.message || "An unexpected error occurred.",
      details: productionServerError ? null : error.details || null
    },
    meta: {}
  });
}
