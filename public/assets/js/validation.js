/**
 * Lightweight client-side validation helpers.
 * Server-side Zod validators remain the source of truth for security.
 */
export function required(value) {
  return String(value ?? "").trim().length > 0;
}

export function email(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
}

export function passwordStrength(value) {
  const password = String(value ?? "");
  const rules = {
    length: password.length >= 8,
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  const score = Object.values(rules).filter(Boolean).length;
  return {
    rules,
    score,
    label: score === 3 ? "Strong" : score === 2 ? "Good" : "Weak"
  };
}

export function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}
