/**
 * @file Shared application shell and state components.
 * @module assets/js/components/shell.js
 */

// -----------------------------------------------------------------------------
// Shared application shell and state components.
// -----------------------------------------------------------------------------

function renderShell() {
  const role = currentUserRole();
  const navigationItems = rolePrimaryNav(role);
  const homeHref = signedInHomePath();
  const headerUtility =
    role === "admin"
      ? { label: "Support", href: "/admin/support", icon: "support_agent" }
      : role === "doctor"
        ? { label: "Settings", href: "/doctor/settings", icon: "settings" }
        : { label: "Help", href: "/help", icon: "help" };
  const mobileUtilityLinks =
    role === "patient" || !role
      ? `<a class="nav-link" href="/subscription">${icon("workspace_premium")}<span>Subscription</span></a>`
      : `<a class="nav-link" href="${homeHref}">${icon(role === "admin" ? "admin_panel_settings" : "medical_services")}<span>${role === "admin" ? "Admin" : "Doctor"} home</span></a>`;
  document.body.innerHTML = `
    <a class="skip-link btn btn-primary" href="#main-content">Skip to main content</a>
    <div class="app-shell">
      <header class="site-header">
        <div class="container header-inner">
          <a class="brand" href="${homeHref}" aria-label="MedExplain AI home">
            <span class="brand-mark">${icon("health_and_safety")}</span>
            <span class="brand-text">
              <span class="brand-name">MedExplain AI</span>
              <span class="brand-tagline">Clarity for health decisions</span>
            </span>
          </a>
          <nav class="desktop-nav" aria-label="Primary navigation">${navLinks(navigationItems)}</nav>
          <div class="header-actions">
            <a class="nav-link" href="${headerUtility.href}">${icon(headerUtility.icon)}<span>${headerUtility.label}</span></a>
            <div class="header-menu" data-header-menu="notifications">
              <button class="icon-button" type="button" aria-label="Notifications" aria-expanded="false" data-header-menu-button>${icon("notifications")}</button>
              <div class="header-dropdown" data-header-dropdown hidden>
                <div class="dropdown-header"><h2>Notifications</h2><a class="item-title" href="/notifications">View all</a></div>
                <div class="dropdown-content" data-notification-menu-content><p class="muted">Open notifications to load recent activity.</p></div>
              </div>
            </div>
            <div class="header-menu" data-header-menu="profile">
              <button class="icon-button" type="button" aria-label="Profile menu" aria-expanded="false" data-header-menu-button>${icon("account_circle")}</button>
              <div class="header-dropdown" data-header-dropdown hidden>
                <div class="dropdown-header"><h2>Account</h2></div>
                <div class="dropdown-content" data-profile-menu-content><p class="muted">Signed in to MedExplain AI.</p></div>
              </div>
            </div>
            <button class="mobile-menu-button" type="button" aria-controls="mobile-drawer" aria-expanded="false">${icon("menu")}<span class="sr-only">Menu</span></button>
          </div>
        </div>
        <nav class="mobile-drawer" id="mobile-drawer" aria-label="Mobile menu">${navLinks(navigationItems)}${mobileUtilityLinks}</nav>
      </header>
      <main class="page-main" id="main-content" tabindex="-1"></main>
      <div class="realtime-toast" data-realtime-toast hidden></div>
      ${renderFooter()}
      <nav class="bottom-nav" aria-label="Mobile primary navigation">${navigationItems
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
  bindHeaderMenus();
}

function closeHeaderMenus(exceptMenu = null) {
  document.querySelectorAll("[data-header-menu]").forEach((menu) => {
    if (menu === exceptMenu) return;
    menu.querySelector("[data-header-dropdown]")?.setAttribute("hidden", "");
    menu.querySelector("[data-header-menu-button]")?.setAttribute("aria-expanded", "false");
  });
}

function notificationTitle(item = {}) {
  return item.title || item.subject || "Notification";
}

function renderNotificationMenuItems(notifications = []) {
  if (!notifications.length) return `<p class="muted">No notifications yet.</p>`;
  return notifications
    .slice(0, 6)
    .map((item) => `<article class="dropdown-item">
      <div><strong>${escapeHtml(notificationTitle(item))}</strong><p class="muted">${escapeHtml(item.body || item.message || "")}</p></div>
      <span class="badge ${item.read_at ? "badge-success" : "badge-warning"}">${item.read_at ? "Read" : "New"}</span>
    </article>`)
    .join("");
}

async function loadNotificationMenu() {
  const target = document.querySelector("[data-notification-menu-content]");
  if (!target || target.dataset.loaded === "true") return;
  target.innerHTML = `<p class="muted">Loading notifications...</p>`;
  try {
    const response = await apiRequest("/notifications");
    const notifications = response.data?.notifications || [];
    target.dataset.loaded = "true";
    target.innerHTML = renderNotificationMenuItems(notifications);
  } catch (error) {
    target.innerHTML = `<p class="muted">${escapeHtml(error?.status === 401 ? "Please sign in again." : "Notifications are unavailable right now.")}</p>`;
  }
}

async function loadProfileMenu() {
  const target = document.querySelector("[data-profile-menu-content]");
  if (!target || target.dataset.loaded === "true") return;
  target.innerHTML = `<p class="muted">Loading account...</p>`;
  try {
    const response = await apiRequest("/me");
    const user = response.data?.user || {};
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Your account";
    const role = String(user.role || currentUserRole()).toLowerCase();
    const workspaceLink =
      role === "admin"
        ? `<a class="dropdown-link" href="/admin">${icon("admin_panel_settings")}Admin workspace</a>`
        : role === "doctor"
          ? `<a class="dropdown-link" href="/doctor">${icon("medical_services")}Doctor workspace</a>`
          : `<a class="dropdown-link" href="/subscription">${icon("workspace_premium")}Subscription</a>`;
    target.dataset.loaded = "true";
    target.innerHTML = `
      <div class="dropdown-profile"><strong>${escapeHtml(name)}</strong><p class="muted">${escapeHtml(user.email || "")}</p></div>
      <a class="dropdown-link" href="/settings">${icon("settings")}Settings</a>
      ${workspaceLink}
      <button class="dropdown-link" type="button" data-logout-action>${icon("logout")}Sign out</button>
    `;
    target.querySelector("[data-logout-action]")?.addEventListener("click", async () => {
      await apiRequest("/auth/logout", { method: "POST" }).catch(() => {});
      clearAccessToken();
      window.location.assign("/login");
    });
  } catch (error) {
    target.innerHTML = `<p class="muted">${escapeHtml(error?.status === 401 ? "Please sign in again." : "Account details are unavailable right now.")}</p>`;
  }
}

function bindHeaderMenus() {
  document.querySelectorAll("[data-header-menu]").forEach((menu) => {
    const button = menu.querySelector("[data-header-menu-button]");
    const dropdown = menu.querySelector("[data-header-dropdown]");
    dropdown?.addEventListener("click", (event) => event.stopPropagation());
    button?.addEventListener("click", async (event) => {
      event.stopPropagation();
      const opening = dropdown.hidden;
      closeHeaderMenus(menu);
      dropdown.hidden = !opening;
      button.setAttribute("aria-expanded", String(opening));
      if (opening && menu.dataset.headerMenu === "notifications") await loadNotificationMenu();
      if (opening && menu.dataset.headerMenu === "profile") await loadProfileMenu();
    });
  });
  document.addEventListener("click", () => closeHeaderMenus());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeHeaderMenus();
  });
}

function renderFooter() {
  const homeHref = signedInHomePath();
  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="stack">
            <a class="brand" href="${homeHref}" aria-label="MedExplain AI home">
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
