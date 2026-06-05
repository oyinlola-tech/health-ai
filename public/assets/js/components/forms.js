/**
 * @file Reusable form field, validation, and submit helpers.
 * @module assets/js/components/forms.js
 */

// -----------------------------------------------------------------------------
// Reusable form field, validation, and submit helpers.
// -----------------------------------------------------------------------------

function field(label, name, type = "text", required = false, value = "") {
  return `<div class="field"><label for="${name}">${label}${required ? ' <span class="required">*</span>' : ""}</label><input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? "required" : ""} /><span class="field-error" data-error-for="${name}"></span></div>`;
}

function textarea(label, name, required = false) {
  return `<div class="field"><label for="${name}">${label}${required ? ' <span class="required">*</span>' : ""}</label><textarea id="${name}" name="${name}" ${required ? "required" : ""}></textarea><span class="field-error" data-error-for="${name}"></span></div>`;
}

function fileField(label, name, required = false) {
  return `<div class="field"><label for="${name}">${label}${required ? ' <span class="required">*</span>' : ""}</label><input id="${name}" name="${name}" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" ${required ? "required" : ""} /><span class="field-error" data-error-for="${name}"></span></div>`;
}

function validateForm(form) {
  let valid = true;
  form.querySelectorAll("[data-error-for]").forEach((target) => (target.textContent = ""));
  form.querySelectorAll("[required]").forEach((input) => {
    if (!input.value.trim()) {
      valid = false;
      form.querySelector(`[data-error-for="${input.name}"]`).textContent = "This field is required.";
    } else if (input.type === "email" && !input.validity.valid) {
      valid = false;
      form.querySelector(`[data-error-for="${input.name}"]`).textContent = "Enter a valid email address.";
    }
  });
  return valid;
}

function showFormMessage(form, stateName, message) {
  const target = form.querySelector("[data-form-message]");
  target.hidden = false;
  target.dataset.state = stateName;
  target.setAttribute("role", stateName === "error" ? "alert" : "status");
  target.textContent = message;
}

function setSubmitLoading(form, isLoading) {
  const button = form.querySelector('button[type="submit"]');
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = isLoading;
  button.textContent = isLoading ? "Working..." : button.dataset.label;
  if (!isLoading) delete button.dataset.label;
}
