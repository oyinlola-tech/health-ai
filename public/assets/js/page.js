import { bindPasswordToggles } from "./ui.js";
import { ensureMobileBottomNav } from "./navigation.js";
import { clearAccessToken } from "./auth.js";

function bindPageActions() {
  document.querySelectorAll('[data-action="logout"]').forEach((trigger) => {
    trigger.addEventListener("click", () => {
      clearAccessToken();
    });
  });
}

/**
 * Shared page bootstrap for the static-to-dynamic migration.
 * Module page files can import this and add feature-specific behavior.
 */
export function bootPage() {
  bindPasswordToggles();
  bindPageActions();
  ensureMobileBottomNav();
}

document.addEventListener("DOMContentLoaded", bootPage);
