import { up as users } from "./users.js";
import { up as doctors } from "./doctors.js";
import { up as reports } from "./reports.js";
import { up as appointments } from "./appointments.js";
import { up as aiUsage } from "./ai_usage.js";
import { up as subscriptions } from "./subscriptions.js";
import { up as payments } from "./payments.js";
import { up as notifications } from "./notifications.js";
import { up as chat } from "./chat.js";
import { up as auditLogs } from "./audit_logs.js";
import { up as legalPrivacy } from "./legal_privacy.js";
import { up as medicalKnowledge } from "./medical_knowledge.js";
import { up as pubmed } from "./pubmed.js";

export const migrations = [
  ["users", users],
  ["doctors", doctors],
  ["reports", reports],
  ["appointments", appointments],
  ["ai_usage", aiUsage],
  ["subscriptions", subscriptions],
  ["payments", payments],
  ["notifications", notifications],
  ["chat", chat],
  ["audit_logs", auditLogs],
  ["legal_privacy", legalPrivacy],
  ["medical_knowledge", medicalKnowledge],
  ["pubmed", pubmed]
];
