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
  ["audit_logs", auditLogs]
];
