/**
 * @file Shared application shell and state components.
 * @module assets/js/components/shell.js
 */

// -----------------------------------------------------------------------------
// Shared application shell and state components.
// -----------------------------------------------------------------------------

function renderShell() {
  document.body.innerHTML = `
    <a class="skip-link btn btn-primary" href="#main-content">Skip to main content</a>
    <div class="app-shell">
      <header class="site-header">
        <div class="container header-inner">
          <a class="brand" href="/dashboard" aria-label="MedExplain AI home">
            <span class="brand-mark">${icon("health_and_safety")}</span>
            <span class="brand-text">
              <span class="brand-name">MedExplain AI</span>
              <span class="brand-tagline">Clarity for health decisions</span>
            </span>
          </a>
          <nav class="desktop-nav" aria-label="Primary navigation">${navLinks()}</nav>
          <div class="header-actions">
            <a class="nav-link" href="/help">${icon("help")}<span>Help</span></a>
            <a class="icon-button" href="/dashboard" aria-label="Notifications">${icon("notifications")}</a>
            <a class="icon-button" href="/profile" aria-label="Profile">${icon("account_circle")}</a>
            <button class="mobile-menu-button" type="button" aria-controls="mobile-drawer" aria-expanded="false">${icon("menu")}<span class="sr-only">Menu</span></button>
          </div>
        </div>
        <nav class="mobile-drawer" id="mobile-drawer" aria-label="Mobile menu">${navLinks()}<a class="nav-link" href="/subscription">${icon("workspace_premium")}<span>Subscription</span></a><a class="nav-link" href="/consent">${icon("privacy_tip")}<span>Consent</span></a><a class="nav-link" href="/settings">${icon("settings")}<span>Settings</span></a></nav>
      </header>
      <main class="page-main" id="main-content" tabindex="-1"></main>
      <div class="realtime-toast" data-realtime-toast hidden></div>
      ${renderFooter()}
      <nav class="bottom-nav" aria-label="Mobile primary navigation">${primaryNav
        .map((item) => `<a href="${item.href}"${isActive(item.href) ? ' aria-current="page"' : ""}>${icon(item.icon)}<span>${item.label}</span></a>`)
        .join("")}</nav>
    </div>
  `;

  const menuButton = document.querySelector(".mobile-menu-button");
  const drawer = document.querySelector("#mobile-drawer");
  menuButton?.addEventListener("click", () => {
    const isOpen = drawer.dataset.open === "true";
    drawer.dataset.open = String(!isOpen);
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    document.body.classList.toggle("menu-open", !isOpen);
  });
}

function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="stack">
            <a class="brand" href="/dashboard" aria-label="MedExplain AI home">
              <span class="brand-mark">${icon("health_and_safety")}</span>
              <span class="brand-text"><span class="brand-name">MedExplain AI</span><span class="brand-tagline">Healthcare intelligence, calmly explained.</span></span>
            </a>
            <p class="muted">A secure healthcare workspace for reports, AI explanations, consultations, and trusted guidance.</p>
          </div>
          ${footerSections
            .map(
              (section) => `<section><h2 class="footer-title">${section.title}</h2><div class="footer-links">${section.links
                .map(([label, href]) => `<a href="${href}">${label}</a>`)
                .join("")}</div></section>`
            )
            .join("")}
        </div>
        <div class="footer-bottom">
          <span>&copy; ${new Date().getFullYear()} MedExplain AI. All rights reserved.</span>
          <span class="actions"><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/contact">Contact</a></span>
        </div>
      </div>
    </footer>`;
}

function pageHeader(meta) {
  return `<section class="stack-lg"><p class="eyebrow">MedExplain AI</p><h1>${escapeHtml(meta.title)}</h1><p class="lead">${escapeHtml(meta.description)}</p></section>`;
}

function loadingState(title = "Loading your workspace") {
  return `<section class="loading-state" aria-busy="true"><div class="state-content"><div class="state-icon">${icon("progress_activity")}</div><h2>${title}</h2><p class="muted">Preparing a secure, up-to-date view.</p><div class="skeleton-grid"><div class="skeleton-line"></div><div class="skeleton-card"></div><div class="skeleton-line"></div></div></div></section>`;
}

function emptyState({ iconName = "inbox", title, description, actionLabel, actionHref }) {
  return `<section class="empty-state"><div class="state-content"><div class="state-icon">${icon(iconName)}</div><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(description)}</p>${actionHref ? `<a class="btn btn-primary" href="${actionHref}">${actionLabel}</a>` : ""}</div></section>`;
}

function listCard(items = [], emptyConfig, renderItem) {
  if (!items.length) return emptyState(emptyConfig);
  return `<div class="stack">${items.map((item) => renderItem(item)).join("")}</div>`;
}

function errorState(title = "We could not load this view", retry = true) {
  return `<section class="error-state" role="alert"><div class="state-content"><div class="state-icon">${icon("support_agent")}</div><h2>${title}</h2><p class="muted">Please retry. If this keeps happening, support can help.</p><div class="actions">${retry ? `<button class="btn btn-primary" data-action="retry">${icon("refresh")}Retry</button>` : ""}<a class="btn btn-secondary" href="/contact">Contact support</a></div></div></section>`;
}

function setMain(content) {
  const main = document.querySelector("#main-content");
  main.innerHTML = `<div class="container page-section">${content}</div>`;
  main.focus({ preventScroll: true });
}
