import { modelForCapability } from "./modelRegistry.js";

const reportTasks = new Set(["medical_report", "doctor_assist", "blood_report", "lab_report", "medical_summary", "discharge_note"]);
const liveTasks = new Set(["realtime_chat", "websocket_chat", "streaming_response", "voice"]);

export function capabilityForTask(taskType) {
  if (reportTasks.has(taskType)) return "report";
  if (liveTasks.has(taskType)) return "live";
  if (taskType === "embedding" || taskType === "semantic_search" || taskType === "vector_search") return "embedding";
  if (taskType === "tts") return "tts";
  if (taskType === "fallback") return "fallback";
  return "chat";
}

export function selectModel(taskType) {
  return modelForCapability(capabilityForTask(taskType));
}

export function fallbackModel() {
  return modelForCapability("fallback");
}
