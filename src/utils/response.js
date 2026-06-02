export function sendSuccess(res, data = null, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
    meta
  });
}

export function sendError(res, error, statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      message: error.message || "An unexpected error occurred.",
      details: error.details || null
    },
    meta: {}
  });
}
