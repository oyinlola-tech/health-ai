import { env } from "../../config/env.js";

export function modelRegistry() {
  return {
    chat: env.GEMINI_CHAT_MODEL || env.GEMINI_FLASH_MODEL || env.GEMINI_MODEL,
    report: env.GEMINI_REPORT_MODEL || env.GEMINI_PRO_MODEL || env.GEMINI_MODEL,
    live: env.GEMINI_LIVE_MODEL,
    embedding: env.GEMINI_EMBEDDING_MODEL,
    fallback: env.GEMINI_FALLBACK_MODEL,
    tts: env.GEMINI_TTS_MODEL
  };
}

export function modelForCapability(capability) {
  const registry = modelRegistry();
  return registry[capability] || registry.chat;
}
