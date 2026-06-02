/**
 * UI state helpers used by module page files.
 * These helpers keep loading, success, error, and empty states consistent.
 */
export function setButtonLoading(button, isLoading, label = "Working...") {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalContent = button.innerHTML;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.innerHTML = `<span class="material-symbols-outlined animate-spin" aria-hidden="true">progress_activity</span>${label}`;
    return;
  }
  button.disabled = false;
  button.removeAttribute("aria-busy");
  if (button.dataset.originalContent) {
    button.innerHTML = button.dataset.originalContent;
    delete button.dataset.originalContent;
  }
}

export function showMessage(target, type, message) {
  if (!target) return;
  target.hidden = false;
  target.dataset.state = type;
  target.setAttribute("role", type === "error" ? "alert" : "status");
  target.textContent = message;
}

export function renderEmptyState(target, message) {
  if (!target) return;
  target.replaceChildren();
  const emptyState = document.createElement("div");
  emptyState.className = "rounded-lg border border-dashed border-[#A19890]/50 bg-white p-6 text-center text-[#A19890]";
  emptyState.textContent = message;
  target.appendChild(emptyState);
}

export function bindPasswordToggles(root = document) {
  root.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = root.querySelector(button.dataset.passwordToggle);
      if (!input) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.setAttribute("aria-pressed", String(!visible));
      const icon = button.querySelector(".material-symbols-outlined");
      if (icon) icon.textContent = visible ? "visibility_off" : "visibility";
    });
  });
}
