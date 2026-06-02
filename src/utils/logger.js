const levels = new Set(["info", "warn", "error"]);

function write(level, message, context = {}) {
  const normalized = levels.has(level) ? level : "info";
  const payload = {
    level: normalized,
    message,
    context,
    timestamp: new Date().toISOString()
  };
  console[normalized === "error" ? "error" : normalized === "warn" ? "warn" : "log"](JSON.stringify(payload));
}

export const logger = {
  info: (message, context) => write("info", message, context),
  warn: (message, context) => write("warn", message, context),
  error: (message, context) => write("error", message, context)
};
