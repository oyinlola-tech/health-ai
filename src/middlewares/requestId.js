import { randomUUID } from "node:crypto";
import { runWithRequestContext } from "../utils/requestContext.js";

export function requestIdMiddleware(req, res, next) {
  const requestId = req.get("X-Request-Id") || randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  runWithRequestContext({ requestId }, next);
}

