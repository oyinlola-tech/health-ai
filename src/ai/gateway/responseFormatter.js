import { AppError } from "../../utils/errors.js";

export function isProviderUnavailable(error) {
  const message = String(error?.message || "");
  return /fetch failed|network|econn|socket|timeout|temporarily unavailable|service unavailable/i.test(message) || error?.status === 503 || error?.statusCode === 503;
}

export function providerError(error) {
  if (error instanceof AppError) return error;
  if (isProviderUnavailable(error)) {
    return new AppError("The AI provider is temporarily unavailable. Please try again in a moment.", 503, "AI_PROVIDER_UNAVAILABLE", {
      provider: "google_gemini"
    });
  }
  return new AppError("The AI assistant could not complete the request. Please try again in a moment.", 503, "AI_PROVIDER_UNAVAILABLE", {
    provider: "google_gemini"
  });
}

export function formatGatewayResponse({ text, model, cacheHit, requestId, cost, failover = null, rag = null, cache = null }) {
  return {
    text,
    model,
    cacheHit,
    requestId,
    cost,
    failover,
    rag,
    cache
  };
}
