/**
 * @file DOM, formatting, and timing helpers.
 * @module assets/js/utils/dom.js
 */

// -----------------------------------------------------------------------------
// DOM, formatting, and timing helpers.
// -----------------------------------------------------------------------------

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name) {
  return `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
}

function isActive(href) {
  if (href === "/dashboard") return state.path === "/" || state.path === "/dashboard";
  if (href === "/chat") return state.path === "/chat" || state.path === "/dashboard";
  return state.path === href || state.path.startsWith(`${href}/`);
}

function rolePrimaryNav(role = currentUserRole()) {
  if (role === "admin") return adminPrimaryNav;
  if (role === "doctor") return doctorPrimaryNav;
  return primaryNav;
}

function navLinks(items = rolePrimaryNav()) {
  return items
    .map(
      (item) => `<a class="nav-link" href="${item.href}"${isActive(item.href) ? ' aria-current="page"' : ""}>${icon(item.icon)}<span>${item.label}</span></a>`
    )
    .join("");
}

function debounce(callback, delay = 350) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delay);
  };
}
