import { bindPasswordToggles } from "./ui.js";
import { ensureMobileBottomNav } from "./navigation.js";

/**
 * Shared page bootstrap for the static-to-dynamic migration.
 * Module page files can import this and add feature-specific behavior.
 */
export function bootPage() {
  bindPasswordToggles();
  ensureMobileBottomNav();
}

document.addEventListener("DOMContentLoaded", bootPage);
