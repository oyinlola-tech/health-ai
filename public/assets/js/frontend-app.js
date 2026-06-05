const appConfig = {
  apiBaseUrl: "/api",
  csrfHeader: "x-csrf-token",
  accessTokenKey: "medexplain_access_token"
};

function loadRealtimeClient() {
  if (window.medRealtime || document.querySelector('script[src="/assets/js/socket-client.js"]')) return;
  const script = document.createElement("script");
  script.src = "/assets/js/socket-client.js";
  script.defer = true;
  document.head.appendChild(script);
}

let csrfToken = null;

function getAccessToken() {
  return sessionStorage.getItem(appConfig.accessTokenKey);
}

function setAccessToken(token) {
  if (token) sessionStorage.setItem(appConfig.accessTokenKey, token);
}

function clearAccessToken() {
  sessionStorage.removeItem(appConfig.accessTokenKey);
}

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${appConfig.apiBaseUrl}/auth/csrf`, { credentials: "include" });
  const payload = await response.json();
  csrfToken = payload?.data?.csrfToken;
  return csrfToken;
}

async function refreshAccessToken() {
  const response = await fetch(`${appConfig.apiBaseUrl}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { [appConfig.csrfHeader]: await ensureCsrfToken() }
  });
  if (!response.ok) {
    clearAccessToken();
    return null;
  }
  const payload = await response.json();
  const token = payload?.data?.accessToken;
  setAccessToken(token);
  return token;
}

async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set(appConfig.csrfHeader, await ensureCsrfToken());
  }

  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...options,
    method,
    credentials: "include",
    headers,
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 401 && !options.skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest(path, { ...options, skipRefresh: true });
  }

  const payload = await response.json().catch(() => ({
    success: false,
    error: { message: "The server returned an unreadable response." }
  }));

  if (!response.ok || payload.success === false) {
    const message = payload?.error?.message || "Request failed.";
    throw Object.assign(new Error(message), { status: response.status, payload });
  }

  return payload;
}

const routeAliases = new Map([
  ["/auth/login.html", "/login"],
  ["/auth/signup.html", "/register"],
  ["/auth/welcome.html", "/"],
  ["/auth/splash.html", "/"],
  ["/app/dashboard.html", "/dashboard"],
  ["/app/upload.html", "/reports"],
  ["/app/uploadfile.html", "/reports"],
  ["/app/report-analysis.html", "/reports"],
  ["/report/summary.html", "/reports"],
  ["/report/detailed-report.html", "/report/:id"],
  ["/ai-assistant/chat-home.html", "/chat"],
  ["/ai-assistant/conversation.html", "/chat"],
  ["/ai-assistant/saved-conv.html", "/chat"],
  ["/consultation/find-doctor.html", "/doctors"],
  ["/consultation/profile.html", "/doctor/:id"],
  ["/consultation/appointments.html", "/appointments"],
  ["/profile/overview.html", "/profile"],
  ["/profile/edit.html", "/profile"],
  ["/settings/home.html", "/settings"],
  ["/premium/plans.html", "/subscription"],
  ["/premium/payment.html", "/update-plan"],
  ["/premium/activated.html", "/payment-success"],
  ["/learning-center/home.html", "/help"],
  ["/learning-center/articles.html", "/help"],
  ["/notifications/list.html", "/dashboard"],
  ["/admin/index.html", "/admin"],
  ["/admin/user.html", "/admin/users"],
  ["/admin/report.html", "/admin/reports"],
  ["/admin/system-health.html", "/admin/system"],
  ["/success-state/appointment.html", "/doctors"],
  ["/success-state/upload.html", "/reports"],
  ["/success-state/payment.html", "/subscription"],
  ["/error-state/upload.html", "/reports"],
  ["/error-state/payment.html", "/subscription"],
  ["/empty-state/report.html", "/reports"],
  ["/empty-state/appointment.html", "/doctors"],
  ["/empty-state/conversation.html", "/chat"]
]);

const primaryNav = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Reports", href: "/reports", icon: "description" },
  { label: "Chat", href: "/chat", icon: "psychology" },
  { label: "Doctors", href: "/doctors", icon: "stethoscope" },
  { label: "Profile", href: "/profile", icon: "person" }
];

const footerSections = [
  { title: "Company", links: [["About", "/"], ["Contact", "/contact"]] },
  { title: "Product", links: [["Reports", "/reports"], ["Doctors", "/doctors"], ["Subscription", "/subscription"]] },
  { title: "Resources", links: [["Help", "/help"], ["Medical Knowledge", "/help"]] },
  { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"]] }
];

const pageMeta = {
  "/": { title: "Calm healthcare intelligence", description: "Upload reports, understand results, and connect with verified medical support in one steady workspace." },
  "/login": { title: "Welcome back", description: "Sign in to continue your private health workspace." },
  "/register": { title: "Create your account", description: "Start a private MedExplain AI workspace." },
  "/dashboard": { title: "Patient dashboard", description: "Your health overview, report status, AI insights, consultations, and account state." },
  "/reports": { title: "Reports", description: "Upload, review, and analyze medical documents securely." },
  "/chat": { title: "AI health chat", description: "Ask questions about your reports and health context." },
  "/doctors": { title: "Doctors", description: "Connect with verified doctors and manage consultations." },
  "/appointments": { title: "Appointments", description: "Review doctor bookings and consultation status." },
  "/profile": { title: "Profile", description: "Review and update your account information." },
  "/settings": { title: "Settings", description: "Manage privacy, security, notifications, and accessibility preferences." },
  "/subscription": { title: "Subscription", description: "Manage your plan and billing status." },
  "/payment-success": { title: "Payment success", description: "Verify your OPay payment and activate premium access." },
  "/payment-failed": { title: "Payment failed", description: "Review payment status and retry securely." },
  "/billing-history": { title: "Billing history", description: "Review OPay transactions, refunds, and invoices." },
  "/update-plan": { title: "Update plan", description: "Choose a premium plan and continue to OPay checkout." },
  "/cancel-subscription": { title: "Cancel subscription", description: "Manage cancellation for your active premium plan." },
  "/help": { title: "Help center", description: "Find guidance, support, and trusted medical knowledge." },
  "/contact": { title: "Contact", description: "Reach the MedExplain AI support team." },
  "/privacy": { title: "Privacy", description: "How MedExplain AI protects and handles personal health information." },
  "/terms": { title: "Terms", description: "Terms for using MedExplain AI." },
  "/doctor": { title: "Doctor dashboard", description: "Appointments, patient queue, reports, messages, analytics, and settings." },
  "/admin": { title: "Admin dashboard", description: "Users, doctors, applications, reports, payments, logs, and system settings." }
};

const doctorWorkspacePaths = new Set([
  "/doctor/patient-queue",
  "/doctor/appointments",
  "/doctor/consultations",
  "/doctor/medical-reports",
  "/doctor/messages",
  "/doctor/profile",
  "/doctor/verification-status",
  "/doctor/analytics",
  "/doctor/settings"
]);

const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const state = {
  path: normalizePath(location.pathname),
  dataCache: new Map()
};

function normalizePath(pathname) {
  const cleanPath = pathname.replace(/\/$/, "") || "/";
  if (routeAliases.has(cleanPath)) return routeAliases.get(cleanPath);
  if (cleanPath.startsWith("/report/")) return "/report/:id";
  if (cleanPath === "/doctor-dashboard") return "/doctor";
  if (doctorWorkspacePaths.has(cleanPath)) return cleanPath;
  if (cleanPath.startsWith("/doctor/") && uuidLike.test(cleanPath.split("/").pop())) return "/doctor/:id";
  if (cleanPath.startsWith("/admin/")) return cleanPath;
  if (cleanPath.startsWith("/doctor/")) return cleanPath;
  return cleanPath;
}

function routeTitle(path) {
  if (path.startsWith("/admin")) return pageMeta["/admin"];
  if (path.startsWith("/doctor") && path !== "/doctors" && path !== "/doctor/:id") return pageMeta["/doctor"];
  if (path === "/report/:id") return { title: "Report details", description: "A secure report view with AI analysis and next actions." };
  if (path === "/doctor/:id") return { title: "Doctor profile", description: "Review doctor details and request a consultation." };
  return pageMeta[path] || { title: "Page not found", description: "This route is not available yet." };
}

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
  return state.path === href || state.path.startsWith(`${href}/`);
}

function navLinks(items = primaryNav) {
  return items
    .map(
      (item) => `<a class="nav-link" href="${item.href}"${isActive(item.href) ? ' aria-current="page"' : ""}>${icon(item.icon)}<span>${item.label}</span></a>`
    )
    .join("");
}

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
        <nav class="mobile-drawer" id="mobile-drawer" aria-label="Mobile menu">${navLinks()}<a class="nav-link" href="/subscription">${icon("workspace_premium")}<span>Subscription</span></a><a class="nav-link" href="/settings">${icon("settings")}<span>Settings</span></a></nav>
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

function errorState(title = "We could not load this view", retry = true) {
  return `<section class="error-state" role="alert"><div class="state-content"><div class="state-icon">${icon("support_agent")}</div><h2>${title}</h2><p class="muted">Please retry. If this keeps happening, support can help.</p><div class="actions">${retry ? `<button class="btn btn-primary" data-action="retry">${icon("refresh")}Retry</button>` : ""}<a class="btn btn-secondary" href="/contact">Contact support</a></div></div></section>`;
}

function setMain(content) {
  const main = document.querySelector("#main-content");
  main.innerHTML = `<div class="container page-section">${content}</div>`;
  main.focus({ preventScroll: true });
}

async function cachedRequest(key, path) {
  if (!state.dataCache.has(key)) {
    state.dataCache.set(key, apiRequest(path));
  }
  return state.dataCache.get(key);
}

function listCard(items, emptyConfig, renderItem) {
  if (!items?.length) return emptyState(emptyConfig);
  return `<div class="stack">${items.map(renderItem).join("")}</div>`;
}

function renderLanding() {
  const meta = routeTitle("/");
  setMain(`
    <section class="page-hero">
      <div class="hero-panel">${pageHeader(meta)}<div class="actions"><a class="btn btn-primary" href="/reports">${icon("upload_file")}Upload a report</a><a class="btn btn-secondary" href="/doctors">Find a doctor</a></div></div>
      <div class="hero-panel hero-visual"><div class="icon-tile">${icon("verified_user")}</div><h2>Designed to reduce uncertainty.</h2><p class="muted">Every screen prioritizes clear next steps, privacy, and calm healthcare language.</p></div>
    </section>
    <section class="grid grid-3" aria-label="Core workflows">
      ${featureCard("Reports", "description", "Upload medical reports and receive secure AI-assisted explanations.", "/reports")}
      ${featureCard("AI chat", "psychology", "Ask follow-up questions through the backend AI gateway.", "/chat")}
      ${featureCard("Consultations", "stethoscope", "Connect with verified doctors when human guidance matters.", "/doctors")}
    </section>
  `);
}

function featureCard(title, iconName, description, href) {
  return `<article class="card stack"><div class="icon-tile">${icon(iconName)}</div><h2>${title}</h2><p class="muted">${description}</p><a class="btn btn-quiet" href="${href}">Open ${title}</a></article>`;
}

function renderAuth(kind) {
  const isLogin = kind === "login";
  const meta = routeTitle(isLogin ? "/login" : "/register");
  setMain(`
    <section class="page-hero">
      <div class="hero-panel">${pageHeader(meta)}<p class="muted">Access tokens stay in session storage, while refresh tokens remain httpOnly cookies controlled by the backend.</p></div>
      <div class="form-card">
        <form class="form" data-auth-form="${kind}" novalidate>
          <div class="form-message" data-form-message hidden></div>
          ${!isLogin ? field("First name", "firstName", "text", true) + field("Last name", "lastName", "text", true) : ""}
          ${field("Email address", "email", "email", true)}
          ${field("Password", "password", "password", true)}
          ${
            !isLogin
              ? `<label class="actions"><input type="checkbox" name="consentPromptLearning" /> <span class="muted">Allow anonymized prompt learning to improve MedExplain AI.</span></label>`
              : ""
          }
          <button class="btn btn-primary btn-full" type="submit">${isLogin ? "Sign in" : "Create account"}</button>
          <a class="btn btn-secondary btn-full" href="${isLogin ? "/register" : "/login"}">${isLogin ? "Create an account" : "I already have an account"}</a>
        </form>
      </div>
    </section>
  `);
  bindAuthForm();
}

function field(label, name, type = "text", required = false, value = "") {
  return `<div class="field"><label for="${name}">${label}${required ? ' <span class="required">*</span>' : ""}</label><input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? "required" : ""} /><span class="field-error" data-error-for="${name}"></span></div>`;
}

function textarea(label, name, required = false) {
  return `<div class="field"><label for="${name}">${label}${required ? ' <span class="required">*</span>' : ""}</label><textarea id="${name}" name="${name}" ${required ? "required" : ""}></textarea><span class="field-error" data-error-for="${name}"></span></div>`;
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

function bindAuthForm() {
  const form = document.querySelector("[data-auth-form]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    const mode = form.dataset.authForm;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.consentPromptLearning = formData.get("consentPromptLearning") === "on";
    setSubmitLoading(form, true);
    try {
      const response = await apiRequest(`/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", body: payload });
      setAccessToken(response.data?.accessToken);
      showFormMessage(form, "success", "Success. Redirecting to your dashboard.");
      window.setTimeout(() => window.location.assign("/dashboard"), 400);
    } catch {
      showFormMessage(form, "error", "We could not complete that request. Check your details and try again.");
    } finally {
      setSubmitLoading(form, false);
    }
  });
}

async function renderPatientDashboard() {
  const meta = routeTitle("/dashboard");
  setMain(`${pageHeader(meta)}${loadingState("Loading dashboard")}`);
  try {
    const [reports, appointments, health, subscription, aiUsage] = await Promise.allSettled([
      cachedRequest("reports", "/reports"),
      cachedRequest("appointments", "/appointments"),
      cachedRequest("health", "/health-history"),
      cachedRequest("subscription", "/subscriptions/me"),
      cachedRequest("ai-usage-me", "/ai/usage/me")
    ]);
    const reportItems = reports.value?.data?.reports || [];
    const appointmentItems = appointments.value?.data?.appointments || [];
    const healthItems = health.value?.data?.entries || health.value?.data?.healthHistory || [];
    setMain(`
      ${pageHeader(meta)}
      <section class="grid grid-4" aria-label="Patient dashboard summary">
        ${summaryCard("Health Overview", "monitor_heart", healthItems.length ? `${healthItems.length} health entries` : "No health entries yet", "/profile")}
        ${summaryCard("Recent Reports", "description", reportItems.length ? `${reportItems.length} reports available` : "No reports uploaded", "/reports")}
        ${summaryCard("Upcoming Consultations", "calendar_month", appointmentItems.length ? `${appointmentItems.length} appointments` : "No appointments booked", "/doctors")}
        ${summaryCard("Subscription Status", "workspace_premium", subscription.value?.data?.plan || "Plan unavailable", "/subscription")}
      </section>
      ${renderUsageOverview(subscription.value?.data || {})}
      ${renderAiUsageOverview(aiUsage.value?.data?.usage || {})}
      <section class="grid grid-2">
        <article class="card card-accent stack"><div class="card-header"><h2>Recent Reports</h2><a class="btn btn-quiet" href="/reports">View reports</a></div>${listCard(reportItems.slice(0, 3), { iconName: "description", title: "No reports yet", description: "Upload a report to receive an AI-assisted explanation.", actionLabel: "Upload report", actionHref: "/reports" }, renderReportItem)}</article>
        <article class="card stack"><div class="card-header"><h2>AI Insights</h2><a class="btn btn-quiet" href="/chat">Open chat</a></div>${emptyState({ iconName: "psychology", title: "No AI insights yet", description: "Insights appear after reports are analyzed or questions are asked.", actionLabel: "Ask AI", actionHref: "/chat" })}</article>
        <article class="card stack"><div class="card-header"><h2>Health Trends</h2><a class="btn btn-quiet" href="/profile">Add entry</a></div>${listCard(healthItems.slice(0, 3), { iconName: "monitor_heart", title: "No health trend data", description: "Health history will appear here once entries are saved.", actionLabel: "Open profile", actionHref: "/profile" }, renderHealthItem)}</article>
        <article class="card stack"><div class="card-header"><h2>Messages</h2><a class="btn btn-quiet" href="/chat">Start message</a></div>${emptyState({ iconName: "mark_chat_unread", title: "No messages", description: "Doctor and AI conversations will appear here when available.", actionLabel: "Open chat", actionHref: "/chat" })}</article>
      </section>
      <section class="card stack"><h2>Quick Actions</h2><div class="actions"><a class="btn btn-primary" href="/reports">${icon("upload_file")}Upload report</a><a class="btn btn-secondary" href="/chat">Ask AI</a><a class="btn btn-secondary" href="/doctors">Book consultation</a></div></section>
    `);
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load your dashboard")}`);
  }
}

function money(cents, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format((Number(cents) || 0) / 100);
}

function moneyUsd(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(Number(value) || 0);
}

function usageMeter(label, usage = {}) {
  const used = Number(usage.used || 0);
  const limit = usage.limit === null || usage.limit === undefined ? null : Number(usage.limit);
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  return `<div class="usage-meter"><div class="card-header"><div><p class="caption">${escapeHtml(label)}</p><strong>${limit === null ? `${used} used` : `${Math.max(limit - used, 0)} remaining`}</strong></div><span class="badge">${limit === null ? "Unlimited" : `${used}/${limit}`}</span></div><div class="meter-track"><span style="width:${percent}%"></span></div></div>`;
}

function renderUsageOverview(subscription = {}) {
  const usage = subscription.usage || {};
  return `<section class="card stack"><div class="card-header"><div><h2>Usage Analytics</h2><p class="muted">Monthly counters reset with your billing cycle.</p></div><a class="btn btn-quiet" href="/subscription">Manage plan</a></div><div class="grid grid-3">${usageMeter("Report Analyses", usage.reportAnalysis)}${usageMeter("AI Chat", usage.aiChat)}${usageMeter("Doctor Bookings", usage.doctorBookings)}</div></section>`;
}

function renderAiUsageOverview(aiUsage = {}) {
  const usage = aiUsage.usage || {};
  const quota = aiUsage.quota || {};
  const percent = Number(usage.quotaPercent || 0);
  const monthlyLimit = quota.monthlyCostLimitUsd ? moneyUsd(quota.monthlyCostLimitUsd) : "Quota initializes on first AI request";
  return `<section class="card stack"><div class="card-header"><div><h2>AI Usage Governance</h2><p class="muted">AI analysis used ${percent}% of your monthly quota.</p></div><span class="badge ${percent > 85 ? "badge-warning" : "badge-success"}">${escapeHtml(quota.planCode || "Measured")}</span></div><div class="usage-meter"><div class="card-header"><div><p class="caption">Monthly AI quota</p><strong>${moneyUsd(usage.monthlyCostUsd || 0)} used</strong></div><span class="badge">${monthlyLimit}</span></div><div class="meter-track"><span style="width:${Math.min(100, percent)}%"></span></div></div><div class="grid grid-3">${metricTile("AI Requests", "bolt", String(usage.monthlyRequests || 0))}${metricTile("Tokens Used", "data_usage", String(usage.monthlyTokens || 0))}${metricTile("Daily Cap", "speed", quota.dailyRequestLimit ? `${quota.dailyRequestLimit} requests` : "Managed")}</div></section>`;
}

function summaryCard(title, iconName, value, href) {
  return `<article class="card stack"><div class="card-header"><div><p class="caption">${title}</p><h3>${escapeHtml(value)}</h3></div><div class="icon-tile">${icon(iconName)}</div></div><a class="btn btn-quiet" href="${href}">Open</a></article>`;
}

function metricTile(title, iconName, value) {
  return `<div class="metric-tile"><div><p class="caption">${escapeHtml(title)}</p><strong>${escapeHtml(value)}</strong></div><div class="icon-tile">${icon(iconName)}</div></div>`;
}

function displayStatus(value) {
  return String(value || "pending").replaceAll("_", " ");
}

function badgeClassForStatus(value) {
  const status = String(value || "").toLowerCase();
  if (["completed", "analyzed", "normal", "low"].includes(status)) return "badge-success";
  if (["failed", "critical", "critical_low", "critical_high", "high"].includes(status)) return "badge-error";
  if (["processing", "uploaded", "pending", "medium", "low"].includes(status)) return "badge-warning";
  return "";
}

function badgeClassForLabFlag(value) {
  const flag = String(value || "").toUpperCase();
  if (flag === "NORMAL") return "badge-success";
  if (flag === "LOW" || flag === "HIGH") return "badge-warning";
  if (flag === "CRITICAL_LOW" || flag === "CRITICAL_HIGH") return "badge-error";
  return "";
}

function confidenceText(value) {
  return Number.isFinite(Number(value)) ? `${Number(value)}%` : "Not available";
}

function reportTitle(report) {
  return report.title || report.original_name || report.originalName || "Untitled report";
}

function renderReportItem(report) {
  const extractionStatus = report.extraction_status || "pending";
  const confidence = confidenceText(report.analysis_confidence);
  return `<article class="card stack">
    <div class="card-header">
      <div><h3>${escapeHtml(reportTitle(report))}</h3><p class="muted">Extraction confidence: ${escapeHtml(confidence)}</p></div>
      <span class="badge ${badgeClassForStatus(extractionStatus)}">${escapeHtml(displayStatus(extractionStatus))}</span>
    </div>
    <div class="actions"><span class="badge">${escapeHtml(displayStatus(report.status || "uploaded"))}</span><a class="btn btn-quiet" href="/report/${report.id || ""}">Review report</a></div>
  </article>`;
}

function renderHealthItem(entry) {
  return `<article class="card stack"><h3>${escapeHtml(entry.title || entry.category || "Health entry")}</h3><p class="muted">${escapeHtml(entry.value || "Saved health history entry")}</p></article>`;
}

async function renderReports() {
  const meta = routeTitle("/reports");
  setMain(`${pageHeader(meta)}${loadingState("Loading reports")}`);
  try {
    const response = await cachedRequest("reports", "/reports");
    const reports = response.data?.reports || [];
    setMain(`
      ${pageHeader(meta)}
      <section class="form-card">
        <form class="form" data-upload-form novalidate>
          <div class="form-message" data-form-message hidden></div>
          ${field("Report title", "title", "text", false)}
          <div class="field"><label for="report">Medical report file <span class="required">*</span></label><input id="report" name="report" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" required /><span class="field-error" data-error-for="report"></span></div>
          <button class="btn btn-primary" type="submit">${icon("upload_file")}Upload securely</button>
        </form>
      </section>
      <section class="stack"><h2>Report library</h2>${listCard(reports, { iconName: "description", title: "No reports uploaded", description: "Upload a report to create your first secure report record.", actionLabel: "Choose a file", actionHref: "/reports" }, renderReportItem)}</section>
    `);
    bindUploadForm();
  } catch {
    setMain(`${pageHeader(meta)}${errorState("Reports are temporarily unavailable")}`);
  }
}

function bindUploadForm() {
  const form = document.querySelector("[data-upload-form]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    const formData = new FormData(form);
    setSubmitLoading(form, true);
    try {
      await apiRequest("/reports", { method: "POST", body: formData });
      showFormMessage(form, "success", "Report uploaded. Your library is refreshing.");
      state.dataCache.delete("reports");
      window.setTimeout(renderReports, 500);
    } catch {
      showFormMessage(form, "error", "We could not upload that report. Please retry or contact support.");
    } finally {
      setSubmitLoading(form, false);
    }
  });
}

function renderExtractionProgress(report) {
  const status = report.extraction_status || "pending";
  const started = report.extraction_started_at ? new Date(report.extraction_started_at).toLocaleString() : "Not started";
  const completed = report.extraction_completed_at ? new Date(report.extraction_completed_at).toLocaleString() : "Not completed";
  return `<section class="card stack">
    <div class="card-header">
      <div><h2>Processing Status</h2><p class="muted">OCR and medical extraction state for this report.</p></div>
      <span class="badge ${badgeClassForStatus(status)}">${escapeHtml(displayStatus(status))}</span>
    </div>
    <section class="metric-grid">
      ${metricTile("Confidence", "verified", confidenceText(report.analysis_confidence))}
      ${metricTile("Started", "hourglass_top", started)}
      ${metricTile("Completed", "task_alt", completed)}
      ${metricTile("Version", "settings_suggest", report.processing_version || "Not set")}
    </section>
    ${report.extraction_error ? `<p class="form-message" data-state="error" role="alert">${escapeHtml(report.extraction_error)}</p>` : ""}
  </section>`;
}

function renderEntityChips(report) {
  const entities = report.medical_entities_json || {};
  const groups = [
    ["Diseases", entities.diseases],
    ["Conditions", entities.conditions],
    ["Medications", entities.medications],
    ["Symptoms", entities.symptoms],
    ["Biomarkers", entities.biomarkers],
    ["Test Names", entities.testNames || entities.test_names],
    ["Units", entities.units]
  ];
  const content = groups
    .filter(([, values]) => values?.length)
    .map(([, values]) => values.map((value) => `<span class="badge">${escapeHtml(value)}</span>`).join(""))
    .join("");
  return `<section class="card stack"><h2>Medical Findings</h2>${content ? `<div class="actions">${content}</div>` : `<p class="muted">No structured medical entities were detected yet.</p>`}</section>`;
}

function renderLabValuesTable(labResults = []) {
  if (!labResults.length) {
    return `<section class="card stack"><h2>Lab Values</h2>${emptyState({ iconName: "science", title: "No lab values detected", description: "Values appear here after OCR detects structured test results.", actionLabel: "", actionHref: "" })}</section>`;
  }

  const rows = labResults
    .map(
      (result) => `<tr>
        <td>${escapeHtml(result.testName || "Test")}</td>
        <td>${escapeHtml(result.value ?? "")}</td>
        <td>${escapeHtml(result.unit || "")}</td>
        <td>${escapeHtml([result.referenceMin, result.referenceMax].filter((value) => value !== null && value !== undefined).join(" - ") || "Not detected")}</td>
        <td><span class="badge ${badgeClassForLabFlag(result.flag)}">${escapeHtml(result.flag || "UNKNOWN")}</span></td>
      </tr>`
    )
    .join("");
  return `<section class="table-card stack"><h2>Lab Values</h2><div class="table-wrap"><table><thead><tr><th>Test</th><th>Value</th><th>Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function renderListSection(title, values = [], iconName = "fact_check") {
  if (!values.length) return "";
  return `<section class="card stack"><div class="icon-tile">${icon(iconName)}</div><h2>${escapeHtml(title)}</h2><ul class="clean-list">${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul></section>`;
}

function renderSources(sources = []) {
  if (!sources.length) return `<section class="card stack"><h2>Sources Used</h2><p class="muted">No trusted retrieval sources were attached to this analysis.</p></section>`;
  return `<section class="card stack"><h2>Sources Used</h2><div class="stack">${sources
    .map((source) => `<a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(source.title || source.source || "Trusted source")}</strong><span>${escapeHtml(source.source || source.url)}</span></a>`)
    .join("")}</div></section>`;
}

function renderAnalysisResponse(report) {
  const analysis = report.analysis?.response || null;
  if (!analysis) {
    return `<section data-analysis-target>${emptyState({ iconName: "psychology", title: "No AI summary yet", description: report.extraction_status === "completed" ? "Start analysis to generate a clear explanation from extracted content." : "Analysis unlocks after report content is extracted reliably.", actionLabel: "", actionHref: "" })}</section>`;
  }
  return `<section data-analysis-target class="stack-lg">
    <article class="card card-accent stack">
      <div class="card-header"><div><h2>AI Summary</h2><p class="muted">${escapeHtml(analysis.confidenceWarning || "Generated from extracted report content and trusted retrieval context.")}</p></div><span class="badge ${badgeClassForStatus(analysis.urgencyLevel)}">${escapeHtml(analysis.urgencyLevel || "LOW")}</span></div>
      <p>${escapeHtml(analysis.summary)}</p>
      ${analysis.seekMedicalAttention ? `<p class="form-message" data-state="error" role="alert">This analysis recommends timely review with a qualified medical professional.</p>` : ""}
    </article>
    ${renderListSection("Key Findings", analysis.keyFindings, "fact_check")}
    ${renderLabValuesTable(analysis.abnormalResults || [])}
    ${renderListSection("Possible Explanations", analysis.possibleExplanations, "psychology")}
    ${renderListSection("Recommended Questions", analysis.recommendedQuestions, "forum")}
    ${renderSources(analysis.sourcesUsed)}
  </section>`;
}

function renderAiProgress() {
  return `<section class="card stack" data-ai-progress-card hidden><div class="card-header"><div><h2>AI Processing</h2><p class="muted" data-ai-progress-text>Waiting for analysis to start.</p></div><span class="badge" data-ai-progress-value>0%</span></div><div class="meter-track"><span data-ai-progress-bar style="width:0%"></span></div></section>`;
}

async function renderReportDetail() {
  const id = location.pathname.split("/").pop();
  const meta = routeTitle("/report/:id");
  if (!id || id === ":id") {
    setMain(`${pageHeader(meta)}${emptyState({ iconName: "description", title: "No report selected", description: "Choose a report from your library to review details.", actionLabel: "Open reports", actionHref: "/reports" })}`);
    return;
  }
  setMain(`${pageHeader(meta)}${loadingState("Loading report")}`);
  try {
    const response = await apiRequest(`/reports/${id}`);
    const report = response.data?.report || response.data;
    const canAnalyze = report.extraction_status === "completed";
    setMain(`${pageHeader(meta)}
      <article class="card card-accent stack">
        <div class="card-header"><div><h2>${escapeHtml(reportTitle(report))}</h2><p class="muted">${escapeHtml(report.original_name || report.mime_type || "Uploaded report")}</p></div><span class="badge ${badgeClassForStatus(report.status)}">${escapeHtml(displayStatus(report.status || "uploaded"))}</span></div>
        <div class="actions"><button class="btn btn-primary" data-action="analyze-report" ${canAnalyze ? "" : "disabled"}>${icon("auto_awesome")}Analyze report</button><a class="btn btn-secondary" href="/reports">Back to reports</a></div>
      </article>
      ${renderAiProgress()}
      ${renderExtractionProgress(report)}
      ${renderEntityChips(report)}
      ${renderLabValuesTable(report.lab_results_json || [])}
      ${renderAnalysisResponse(report)}`);
    document.querySelector('[data-action="analyze-report"]')?.addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      try {
        const analyzed = await apiRequest(`/reports/${id}/analyze`, { method: "POST" });
        const updatedReport = analyzed.data?.report || {};
        document.querySelector("[data-analysis-target]").outerHTML = renderAnalysisResponse({ ...report, ...updatedReport });
      } catch (error) {
        const message = error?.message === "Report content could not be extracted reliably." ? error.message : "We could not start analysis";
        document.querySelector("[data-analysis-target]").innerHTML = errorState(message, false);
      }
    });
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load this report")}`);
  }
}

async function renderChat() {
  const meta = routeTitle("/chat");
  setMain(`${pageHeader(meta)}${loadingState("Loading consultation rooms")}`);
  try {
    const response = await apiRequest("/consultations");
    const consultations = response.data?.consultations || [];
    setMain(`${pageHeader(meta)}<section class="grid grid-2"><article class="card stack"><h2>Consultation Rooms</h2>${listCard(consultations, { iconName: "forum", title: "No consultation rooms", description: "Rooms open after a doctor confirms an appointment.", actionLabel: "Find doctors", actionHref: "/doctors" }, renderConsultationItem)}</article><article class="card stack"><h2>Messages</h2><div data-consultation-output>${emptyState({ iconName: "forum", title: "Select a room", description: "Choose a consultation room to view message history.", actionLabel: "", actionHref: "" })}</div></article></section>`);
    bindConsultationRooms();
  } catch {
    setMain(`${pageHeader(meta)}${errorState("Consultation rooms are temporarily unavailable")}`);
  }
}

function renderConsultationItem(item) {
  return `<article class="card stack"><h3>${escapeHtml(item.reason || "Consultation")}</h3><p class="muted">${escapeHtml(item.appointment_status || item.status)}</p><button class="btn btn-quiet" data-session-id="${escapeHtml(item.id)}">Open room</button></article>`;
}

function bindConsultationRooms() {
  document.querySelectorAll("[data-session-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const sessionId = button.dataset.sessionId;
      await window.medRealtime?.joinConsultation(sessionId).catch(() => {});
      const response = await apiRequest(`/consultations/${sessionId}/messages`);
      const messages = response.data?.messages || [];
      document.querySelector("[data-consultation-output]").innerHTML = `<div class="stack">${messages.map((message) => `<p class="message-bubble">${escapeHtml(message.content)}</p>`).join("") || `<p class="muted">No messages yet.</p>`}</div><form class="form" data-message-form><div class="field"><label for="content">Message</label><textarea id="content" name="content" required></textarea></div><button class="btn btn-primary" type="submit">${icon("send")}Send</button></form>`;
      document.querySelector("[data-message-form]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const content = new FormData(event.currentTarget).get("content");
        if (!window.medRealtime) throw new Error("Realtime connection is not available.");
        await window.medRealtime.sendMessage({ sessionId, content });
        button.click();
      });
    });
  });
}

function doctorName(doctor) {
  return [doctor.first_name, doctor.last_name].filter(Boolean).join(" ") || "Doctor";
}

function renderDoctorCard(doctor) {
  return `<article class="card stack"><div class="card-header"><div><h3>Dr. ${escapeHtml(doctorName(doctor))}</h3><p class="muted">${escapeHtml(doctor.specialization || doctor.specialty || "General Medicine")}</p></div><span class="badge badge-success">Verified</span></div><div class="actions"><span class="badge">${doctor.has_availability ? "Available slots" : "No slots listed"}</span><span class="badge">${doctor.consultation_fee_cents ? money(doctor.consultation_fee_cents) : "Premium included"}</span></div><a class="btn btn-quiet" href="/doctor/${doctor.id}">View profile</a></article>`;
}

async function renderDoctors() {
  const meta = routeTitle("/doctors");
  setMain(`${pageHeader(meta)}${loadingState("Loading verified doctors")}`);
  try {
    const response = await apiRequest("/doctors");
    const doctors = response.data?.doctors || [];
    setMain(`${pageHeader(meta)}<section class="form-card"><form class="form" data-doctor-search><div class="grid grid-3">${field("Search doctors", "q", "text", false)}${field("Specialization", "specialization", "text", false)}<div class="field"><label for="availableOnly">Availability</label><select id="availableOnly" name="availableOnly"><option value="">Any</option><option value="true">Has availability</option></select></div></div><button class="btn btn-primary" type="submit">${icon("search")}Search</button></form></section><section class="grid grid-3" data-doctor-results>${doctors.length ? doctors.map(renderDoctorCard).join("") : emptyState({ iconName: "stethoscope", title: "No verified doctors available", description: "Verified doctors appear here after admin approval and availability setup.", actionLabel: "", actionHref: "" })}</section>`);
    document.querySelector("[data-doctor-search]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const params = new URLSearchParams(new FormData(event.currentTarget));
      const filtered = await apiRequest(`/doctors?${params.toString()}`);
      document.querySelector("[data-doctor-results]").innerHTML = (filtered.data?.doctors || []).map(renderDoctorCard).join("") || emptyState({ iconName: "stethoscope", title: "No doctors matched", description: "Try another search or filter.", actionLabel: "", actionHref: "" });
    });
  } catch {
    setMain(`${pageHeader(meta)}${errorState("Doctor directory is temporarily unavailable")}`);
  }
}

async function renderDoctorProfile() {
  const id = location.pathname.split("/").pop();
  const meta = routeTitle("/doctor/:id");
  setMain(`${pageHeader(meta)}${loadingState("Loading doctor profile")}`);
  try {
    const response = await apiRequest(`/doctors/${id}`);
    const doctor = response.data?.doctor || {};
    const availability = doctor.availability || [];
    setMain(`
      ${pageHeader(meta)}
      <section class="grid grid-2">
        <article class="card card-accent stack"><div class="card-header"><div><h2>Dr. ${escapeHtml(doctorName(doctor))}</h2><p class="muted">${escapeHtml(doctor.specialization || doctor.specialty || "General Medicine")}</p></div><span class="badge badge-success">${escapeHtml(doctor.verification_status || "VERIFIED")}</span></div><p>${escapeHtml(doctor.bio || "This doctor has not added a public bio yet.")}</p><div class="actions"><span class="badge">${doctor.years_experience || 0} years experience</span><span class="badge">${doctor.consultation_fee_cents ? money(doctor.consultation_fee_cents) : "Premium included"}</span></div></article>
        <form class="form-card form" data-appointment-form novalidate>
          <h2>Book consultation</h2>
          <div class="form-message" data-form-message hidden></div>
          <input type="hidden" name="doctorId" value="${escapeHtml(doctor.id)}" />
          <div class="field"><label for="scheduledAt">Time slot <span class="required">*</span></label><input id="scheduledAt" name="scheduledAt" type="datetime-local" required /><span class="field-error" data-error-for="scheduledAt"></span></div>
          ${textarea("Reason for visit", "reason", true)}
          ${textarea("Notes", "notes", false)}
          <button class="btn btn-primary" type="submit">${icon("calendar_add_on")}Request appointment</button>
        </form>
      </section>
      <section class="card stack"><h2>Availability Calendar</h2>${availability.length ? `<div class="actions">${availability.map((slot) => `<span class="badge">Day ${slot.day_of_week}: ${slot.starts_at} - ${slot.ends_at}</span>`).join("")}</div>` : `<p class="muted">No active availability slots are listed.</p>`}</section>
      <section class="card stack"><h2>Reviews</h2><p class="muted">Reviews are ready for future patient ratings after completed consultations.</p></section>
    `);
    bindAppointmentForm();
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load this doctor")}`);
  }
}

async function renderAppointments() {
  const meta = routeTitle("/appointments");
  setMain(`${pageHeader(meta)}${loadingState("Loading appointments")}`);
  try {
    const response = await apiRequest("/appointments");
    const appointments = response.data?.appointments || [];
    setMain(`${pageHeader(meta)}<section class="stack">${listCard(appointments, { iconName: "calendar_month", title: "No appointments", description: "Book a verified doctor to start a consultation workflow.", actionLabel: "Find doctors", actionHref: "/doctors" }, renderAppointmentItem)}</section>`);
  } catch {
    setMain(`${pageHeader(meta)}${errorState("Appointments are temporarily unavailable")}`);
  }
}

function bindAppointmentForm() {
  const form = document.querySelector("[data-appointment-form]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    const formData = new FormData(form);
    const scheduledAt = new Date(formData.get("scheduledAt")).toISOString();
    setSubmitLoading(form, true);
    try {
      await apiRequest("/appointments", { method: "POST", body: { doctorId: formData.get("doctorId"), scheduledAt, reason: formData.get("reason"), notes: formData.get("notes") } });
      showFormMessage(form, "success", "Consultation requested. You can review appointments from the dashboard.");
    } catch {
      showFormMessage(form, "error", "We could not request that appointment. Please retry.");
    } finally {
      setSubmitLoading(form, false);
    }
  });
}

async function renderProfile() {
  const meta = routeTitle("/profile");
  setMain(`${pageHeader(meta)}${loadingState("Loading profile")}`);
  try {
    const response = await cachedRequest("me", "/me");
    const user = response.data?.user || response.data || {};
    setMain(`
      ${pageHeader(meta)}
      <section class="form-card">
        <form class="form" data-profile-form novalidate>
          <div class="form-message" data-form-message hidden></div>
          ${field("First name", "firstName", "text", true, user.firstName || "")}
          ${field("Last name", "lastName", "text", true, user.lastName || "")}
          <button class="btn btn-primary" type="submit">${icon("save")}Save profile</button>
        </form>
      </section>
    `);
    document.querySelector("[data-profile-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!validateForm(form)) return;
      const payload = Object.fromEntries(new FormData(form).entries());
      setSubmitLoading(form, true);
      try {
        await apiRequest("/me", { method: "PUT", body: payload });
        showFormMessage(form, "success", "Profile saved.");
      } catch {
        showFormMessage(form, "error", "We could not save your profile. Please retry.");
      } finally {
        setSubmitLoading(form, false);
      }
    });
  } catch {
    setMain(`${pageHeader(meta)}${errorState("Profile is temporarily unavailable")}`);
  }
}

function renderStaticPage(path) {
  const meta = routeTitle(path);
  const contentMap = {
    "/settings": ["Settings", "Privacy, security, notifications, and accessibility preferences will appear as backend-backed controls are added."],
    "/help": ["Help center", "Browse medical report guidance, AI explanation tips, and support paths without leaving the product."],
    "/contact": ["Contact support", "Use the support action below for help with reports, billing, privacy, or account access."],
    "/privacy": ["Privacy", "MedExplain AI keeps health information private, uses backend-mediated AI calls, and avoids exposing secrets in frontend code."],
    "/terms": ["Terms", "Use MedExplain AI as an informational support tool. It does not replace professional medical advice."]
  };
  const [title, description] = contentMap[path] || [meta.title, meta.description];
  setMain(`${pageHeader(meta)}<section class="card stack"><div class="icon-tile">${icon("info")}</div><h2>${title}</h2><p class="muted">${description}</p><div class="actions"><a class="btn btn-primary" href="${path === "/contact" ? "mailto:support@medexplain.ai" : "/dashboard"}">${path === "/contact" ? "Email support" : "Return to dashboard"}</a><a class="btn btn-secondary" href="/help">Open help</a></div></section>`);
}

function renderPlanCard(plan, currentPlan) {
  const isCurrent = currentPlan === plan.code || (currentPlan === "FREE" && plan.code === "FREE");
  const features = Array.isArray(plan.features) ? plan.features : [];
  return `<article class="card stack">
    <div class="card-header"><div><h2>${escapeHtml(plan.name)}</h2><p class="muted">${plan.interval === "free" ? "Included by default" : `${money(plan.price_cents, plan.currency)} / ${plan.interval}`}</p></div><span class="badge ${isCurrent ? "badge-success" : ""}">${isCurrent ? "Current" : "Available"}</span></div>
    <ul class="clean-list">${features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
    ${plan.code === "FREE" ? `<a class="btn btn-secondary" href="/reports">Use free plan</a>` : `<button class="btn btn-primary" data-plan-code="${escapeHtml(plan.code)}">${icon("payments")}Upgrade with OPay</button>`}
  </article>`;
}

async function renderSubscription() {
  const meta = routeTitle("/subscription");
  setMain(`${pageHeader(meta)}${loadingState("Loading subscription")}`);
  try {
    const [response, aiUsage] = await Promise.all([apiRequest("/subscriptions/me"), apiRequest("/ai/usage/me")]);
    const data = response.data || {};
    const subscription = data.subscription || {};
    setMain(`
      ${pageHeader(meta)}
      <section class="grid grid-3">
        ${summaryCard("Current Plan", "workspace_premium", data.plan || "FREE", "/update-plan")}
        ${summaryCard("Renewal Date", "event_repeat", subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "No renewal", "/billing-history")}
        ${summaryCard("Status", "verified", subscription.status || "free", "/subscription")}
      </section>
      ${renderUsageOverview(data)}
      ${renderAiUsageOverview(aiUsage.data?.usage || {})}
      <section class="grid grid-3">${(data.plans || []).map((plan) => renderPlanCard(plan, subscription.plan_code || data.plan)).join("")}</section>
      <section class="card stack"><h2>Billing Actions</h2><div class="actions"><a class="btn btn-secondary" href="/billing-history">Billing history</a><a class="btn btn-secondary" href="/update-plan">Update plan</a><a class="btn btn-secondary" href="/cancel-subscription">Cancel subscription</a></div></section>
    `);
    bindPlanButtons();
  } catch {
    setMain(`${pageHeader(meta)}${errorState("Subscription details are temporarily unavailable")}`);
  }
}

function bindPlanButtons() {
  document.querySelectorAll("[data-plan-code]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const response = await apiRequest("/subscriptions/checkout", { method: "POST", body: { planCode: button.dataset.planCode } });
        window.location.assign(response.data?.checkoutUrl || response.checkoutUrl);
      } catch {
        button.disabled = false;
        window.alert("We could not start OPay checkout. Please retry.");
      }
    });
  });
}

async function renderBillingHistory() {
  const meta = routeTitle("/billing-history");
  setMain(`${pageHeader(meta)}${loadingState("Loading billing history")}`);
  try {
    const response = await apiRequest("/subscriptions/billing-history");
    const payments = response.data?.payments || [];
    const rows = payments.map((payment) => `<tr><td>${escapeHtml(payment.provider_reference)}</td><td>${money(payment.amount_cents, payment.currency)}</td><td><span class="badge ${badgeClassForStatus(payment.status)}">${escapeHtml(payment.status)}</span></td><td>${new Date(payment.created_at).toLocaleDateString()}</td></tr>`).join("");
    setMain(`${pageHeader(meta)}<section class="table-card stack"><h2>Transaction History</h2><div class="table-wrap"><table><thead><tr><th>Reference</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows || `<tr><td colspan="4">No billing transactions yet.</td></tr>`}</tbody></table></div></section>`);
  } catch {
    setMain(`${pageHeader(meta)}${errorState("Billing history is temporarily unavailable")}`);
  }
}

async function renderPaymentStatus(success) {
  const meta = routeTitle(success ? "/payment-success" : "/payment-failed");
  const reference = new URLSearchParams(location.search).get("reference");
  if (!success || !reference) {
    setMain(`${pageHeader(meta)}${emptyState({ iconName: "payments", title: "Payment not completed", description: "No verified payment reference was provided.", actionLabel: "Back to subscription", actionHref: "/subscription" })}`);
    return;
  }
  setMain(`${pageHeader(meta)}${loadingState("Verifying payment")}`);
  try {
    await apiRequest("/subscriptions/verify", { method: "POST", body: { reference } });
    state.dataCache.delete("subscription");
    setMain(`${pageHeader(meta)}${emptyState({ iconName: "verified", title: "Premium activated", description: "OPay confirmed your payment and premium access is active.", actionLabel: "Open dashboard", actionHref: "/dashboard" })}`);
  } catch {
    setMain(`${pageHeader(routeTitle("/payment-failed"))}${errorState("OPay has not verified this payment", false)}<section class="actions"><a class="btn btn-primary" href="/subscription">Retry upgrade</a><a class="btn btn-secondary" href="/billing-history">Billing history</a></section>`);
  }
}

async function renderCancelSubscription() {
  const meta = routeTitle("/cancel-subscription");
  setMain(`${pageHeader(meta)}<section class="card stack"><h2>Cancel Premium</h2><p class="muted">Cancellation is processed on the server and records a billing audit event.</p><div class="actions"><button class="btn btn-primary" data-action="cancel-subscription">${icon("cancel")}Cancel subscription</button><a class="btn btn-secondary" href="/subscription">Keep plan</a></div></section>`);
  document.querySelector('[data-action="cancel-subscription"]')?.addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    try {
      await apiRequest("/subscriptions/cancel", { method: "POST" });
      state.dataCache.delete("subscription");
      setMain(`${pageHeader(meta)}${emptyState({ iconName: "done", title: "Subscription cancelled", description: "Premium access has been cancelled for this account.", actionLabel: "Return to subscription", actionHref: "/subscription" })}`);
    } catch {
      setMain(`${pageHeader(meta)}${errorState("We could not cancel this subscription", false)}`);
    }
  });
}

async function renderDoctorDashboard() {
  const meta = routeTitle("/doctor");
  const tabs = ["Overview", "Patient Queue", "Appointments", "Consultations", "Medical Reports", "Messages", "Profile", "Verification Status", "Analytics", "Settings"];
  setMain(`${pageHeader(meta)}${loadingState("Loading doctor workspace")}`);
  const [appointments, reports] = await Promise.allSettled([apiRequest("/doctor/appointments"), apiRequest("/doctor/reports")]);
  const appointmentItems = appointments.value?.data?.appointments || [];
  const reportItems = reports.value?.data?.reports || [];
  setMain(`
    <section class="dashboard-shell">
      <aside class="side-nav" aria-label="Doctor dashboard sections">${tabs.map((tab, index) => `<a class="nav-link" href="/doctor${index ? `/${tab.toLowerCase().replaceAll(" ", "-")}` : ""}"${index === 0 ? ' aria-current="page"' : ""}>${icon(index === 0 ? "dashboard" : "chevron_right")}<span>${tab}</span></a>`).join("")}</aside>
      <div class="stack-lg">
        ${pageHeader(meta)}
        <section class="grid grid-4">
          ${summaryCard("Patient Queue", "groups", "No active queue", "/doctor/patient-queue")}
          ${summaryCard("Appointments", "calendar_month", appointmentItems.length ? `${appointmentItems.length} appointments` : "No appointments", "/doctor/appointments")}
          ${summaryCard("Medical Reports", "description", reportItems.length ? `${reportItems.length} reports` : "No assigned reports", "/doctor/medical-reports")}
          ${summaryCard("Verification Status", "verified_user", "Check profile", "/doctor/verification-status")}
        </section>
        <section class="grid grid-2">
          <article class="card stack"><h2>Appointments</h2>${listCard(appointmentItems, { iconName: "calendar_month", title: "No appointments assigned", description: "Patient appointments will appear here once scheduled.", actionLabel: "Refresh dashboard", actionHref: "/doctor" }, renderAppointmentItem)}</article>
          <article class="card stack"><h2>Availability Scheduler</h2><form class="form" data-availability-form>${field("Day of week", "dayOfWeek", "number", true)}${field("Starts", "startsAt", "time", true)}${field("Ends", "endsAt", "time", true)}<button class="btn btn-primary" type="submit">${icon("schedule")}Save availability</button></form></article>
          <article class="card stack"><h2>Consultation Rooms</h2><a class="btn btn-quiet" href="/chat">Open messages</a><p class="muted">Chat rooms are created after appointments are confirmed.</p></article>
          <article class="card stack"><h2>Earnings</h2><p class="muted">Consultation earnings will appear when paid doctor fees are enabled.</p><span class="badge">Premium consultation ready</span></article>
        </section>
      </div>
    </section>
  `);
  document.querySelector("[data-availability-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    await apiRequest("/doctor/availability", { method: "POST", body: payload });
    window.location.reload();
  });
}

function renderAppointmentItem(item) {
  const doctor = [item.doctor_first_name, item.doctor_last_name].filter(Boolean).join(" ");
  const patient = [item.patient_first_name, item.patient_last_name].filter(Boolean).join(" ");
  return `<article class="card stack"><h3>${escapeHtml(item.reason || "Consultation request")}</h3><p class="muted">${escapeHtml(doctor || patient || "Assigned participant")}</p><p class="muted">${escapeHtml(item.scheduled_at || item.scheduledAt || "Time pending")}</p><span class="badge">${escapeHtml(item.status || "PENDING")}</span></article>`;
}

async function renderAdminDashboard() {
  const meta = routeTitle("/admin");
  const tabs = ["Overview", "Users", "Doctors", "Doctor Applications", "Reports", "AI Usage", "Payments", "Subscriptions", "Security Logs", "Audit Logs", "System Settings"];
  setMain(`${pageHeader(meta)}${loadingState("Loading admin workspace")}`);
  const [users, logs, reportMetrics, monetization, aiCosts] = await Promise.allSettled([
    apiRequest("/admin/users"),
    apiRequest("/admin/audit-logs"),
    apiRequest("/admin/reports/processing-metrics"),
    apiRequest("/admin/monetization"),
    apiRequest("/admin/ai-costs")
  ]);
  const userItems = users.value?.data?.users || [];
  const logItems = logs.value?.data?.auditLogs || [];
  const metrics = reportMetrics.value?.data?.metrics || {};
  const revenue = monetization.value?.data?.metrics || {};
  const aiDashboard = aiCosts.value?.data?.dashboard || {};
  const aiSummary = aiDashboard.summary || {};
  setMain(`
    <section class="dashboard-shell">
      <aside class="side-nav" aria-label="Admin dashboard sections">${tabs.map((tab, index) => `<a class="nav-link" href="/admin${index ? `/${tab.toLowerCase().replaceAll(" ", "-")}` : ""}"${index === 0 ? ' aria-current="page"' : ""}>${icon(index === 0 ? "admin_panel_settings" : "chevron_right")}<span>${tab}</span></a>`).join("")}</aside>
      <div class="stack-lg">
        ${pageHeader(meta)}
        <section class="grid grid-4">
          ${summaryCard("Users", "groups", userItems.length ? `${userItems.length} users` : "No users returned", "/admin/users")}
          ${summaryCard("AI Usage", "auto_awesome", aiSummary.total_requests ? `${aiSummary.total_requests} requests` : "No AI usage", "/admin/ai-usage")}
          ${summaryCard("Reports Processed", "description", String(metrics.reports_processed ?? 0), "/admin/reports")}
          ${summaryCard("Failed Extractions", "report_problem", String(metrics.failed_extractions ?? 0), "/admin/reports")}
        </section>
        <section class="grid grid-4">
          ${summaryCard("Monthly Revenue", "payments", money(revenue.monthly_revenue_cents || 0), "/admin/payments")}
          ${summaryCard("Active Subscribers", "workspace_premium", String(revenue.active_subscribers ?? 0), "/admin/subscriptions")}
          ${summaryCard("Failed Payments", "credit_card_off", String(revenue.failed_payments ?? 0), "/admin/payments")}
          ${summaryCard("Churn Rate", "trending_down", `${revenue.churn_rate ?? 0}%`, "/admin/subscriptions")}
        </section>
        <section class="grid grid-2">
          <article class="card stack"><h2>Report Processing</h2><p class="muted">Operational view of extraction quality and pipeline health.</p><div class="actions"><span class="badge ${Number(metrics.ocr_failure_rate || 0) > 10 ? "badge-error" : "badge-success"}">OCR failure rate ${metrics.ocr_failure_rate ?? 0}%</span><span class="badge">Average confidence ${metrics.average_confidence ?? 0}%</span></div></article>
          ${renderAdminAiCostPanel(aiDashboard)}
          <article class="card stack"><h2>Revenue Dashboard</h2><p class="muted">OPay-backed subscription health and monetization activity.</p><div class="actions"><span class="badge">Refund rate ${revenue.refund_rate ?? 0}%</span><span class="badge">Refunds ${revenue.refunds ?? 0}</span></div>${renderListCard(revenue.top_features_used || [])}</article>
          <article class="card stack"><h2>Users</h2>${listCard(userItems, { iconName: "groups", title: "No users returned", description: "User records will appear here when available to this role.", actionLabel: "", actionHref: "" }, renderUserItem)}</article>
          <article class="card stack"><h2>Audit Logs</h2>${listCard(logItems, { iconName: "fact_check", title: "No audit logs returned", description: "Audit activity will appear here when available.", actionLabel: "", actionHref: "" }, renderAuditItem)}</article>
          <article class="card stack"><h2>Doctor Applications</h2>${emptyState({ iconName: "badge", title: "No applications returned", description: "Doctor applications will appear here once submitted.", actionLabel: "", actionHref: "" })}</article>
          <article class="card stack"><h2>System Settings</h2><p class="muted">Administrative settings are grouped here to keep operational controls consistent.</p><a class="btn btn-quiet" href="/admin/system-settings">Open settings</a></article>
        </section>
      </div>
    </section>
  `);
}

function renderListCard(items) {
  if (!items.length) return `<p class="muted">No feature usage recorded this month.</p>`;
  return `<ul class="clean-list">${items.map((item) => `<li>${escapeHtml(item.feature)}: ${escapeHtml(item.used_count)}</li>`).join("")}</ul>`;
}

function renderAdminAiCostPanel(dashboard = {}) {
  const summary = dashboard.summary || {};
  const costs = dashboard.costs || {};
  const featureRows = costs.featureCostBreakdown || [];
  const topUsers = costs.topAiUsers || [];
  const budget = Number(dashboard.monthlyBudgetUsd || 0);
  const spend = Number(dashboard.monthlySpendUsd || 0);
  const budgetPercent = budget > 0 ? Math.min(100, Math.round((spend / budget) * 100)) : 0;
  const featureList = featureRows.length
    ? `<ul class="clean-list">${featureRows
        .slice(0, 5)
        .map((item) => `<li>${escapeHtml(item.feature_type || "unknown")}: ${moneyUsd(item.cost_usd)} across ${escapeHtml(item.requests)} requests</li>`)
        .join("")}</ul>`
    : `<p class="muted">No feature cost data yet.</p>`;
  const userList = topUsers.length
    ? `<ul class="clean-list">${topUsers
        .slice(0, 5)
        .map((item) => `<li>${escapeHtml(item.user_id || "anonymous")}: ${moneyUsd(item.cost_usd)} ${Number(item.blocked_requests || 0) ? `(${item.blocked_requests} blocked)` : ""}</li>`)
        .join("")}</ul>`
    : `<p class="muted">No top user data yet.</p>`;
  return `<article class="card stack"><div class="card-header"><div><h2>AI Cost Dashboard</h2><p class="muted">Gemini spend, cache efficiency, budget enforcement, and abuse signals.</p></div><span class="badge ${dashboard.emergencyThrottle ? "badge-error" : "badge-success"}">${dashboard.emergencyThrottle ? "Throttled" : "Active"}</span></div><div class="usage-meter"><div class="card-header"><div><p class="caption">Monthly Gemini budget</p><strong>${moneyUsd(spend)} spent</strong></div><span class="badge">${budget ? `${budgetPercent}% of ${moneyUsd(budget)}` : "No budget"}</span></div><div class="meter-track"><span style="width:${budgetPercent}%"></span></div></div><div class="grid grid-3">${metricTile("Forecast Burn", "trending_up", moneyUsd(dashboard.forecastedBurnRateUsd || 0))}${metricTile("Cache Hit Rate", "cached", `${dashboard.cacheHitRate || 0}%`)}${metricTile("Blocked Requests", "block", String(summary.blocked_requests || 0))}</div><div class="grid grid-2"><div><h3>Cost Per Feature</h3>${featureList}</div><div><h3>Top AI Users</h3>${userList}</div></div></article>`;
}

function renderUserItem(user) {
  return `<article class="card stack"><h3>${escapeHtml([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User")}</h3><p class="muted">${escapeHtml(user.role || "Account")}</p></article>`;
}

function renderAuditItem(log) {
  return `<article class="card stack"><h3>${escapeHtml(log.action || "Audit event")}</h3><p class="muted">${escapeHtml(log.createdAt || "Timestamp unavailable")}</p></article>`;
}

function renderNotFound() {
  setMain(`${pageHeader(routeTitle(state.path))}${emptyState({ iconName: "map", title: "Route not found", description: "This page is not available. Use the navigation to continue.", actionLabel: "Go to dashboard", actionHref: "/dashboard" })}`);
}

function bindGlobalActions() {
  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "retry") window.location.reload();
    if (action === "logout") {
      clearAccessToken();
      window.location.assign("/login");
    }
  });
}

function bindRealtimeUpdates() {
  window.addEventListener("medexplain:realtime", (event) => {
    const { type, payload } = event.detail || {};
    const toast = document.querySelector("[data-realtime-toast]");
    if (toast && ["notification_push", "appointment_created", "appointment_confirmed", "message_receive", "ai_analysis_ready"].includes(type)) {
      toast.hidden = false;
      toast.textContent = payload?.notification?.title || payload?.type || type.replaceAll("_", " ");
      window.setTimeout(() => {
        toast.hidden = true;
      }, 3200);
    }

    if (type?.startsWith("ai_processing")) {
      const card = document.querySelector("[data-ai-progress-card]");
      const bar = document.querySelector("[data-ai-progress-bar]");
      const value = document.querySelector("[data-ai-progress-value]");
      const text = document.querySelector("[data-ai-progress-text]");
      if (card && bar && value && text) {
        const progress = Math.max(0, Math.min(100, Number(payload?.progress || 0)));
        card.hidden = false;
        bar.style.width = `${progress}%`;
        value.textContent = `${progress}%`;
        text.textContent = payload?.status || type.replaceAll("_", " ");
      }
    }

    if (type === "message_receive" && document.querySelector("[data-consultation-output]")) {
      const stack = document.querySelector("[data-consultation-output] .stack");
      if (stack && payload?.message?.content) stack.insertAdjacentHTML("beforeend", `<p class="message-bubble">${escapeHtml(payload.message.content)}</p>`);
    }
  });
}

function route() {
  document.title = `${routeTitle(state.path).title} | MedExplain AI`;
  if (state.path === "/") return renderLanding();
  if (state.path === "/login") return renderAuth("login");
  if (state.path === "/register") return renderAuth("register");
  if (state.path === "/dashboard") return renderPatientDashboard();
  if (state.path === "/reports") return renderReports();
  if (state.path === "/report/:id") return renderReportDetail();
  if (state.path === "/chat") return renderChat();
  if (state.path === "/doctors") return renderDoctors();
  if (state.path === "/doctor/:id") return renderDoctorProfile();
  if (state.path === "/appointments") return renderAppointments();
  if (state.path === "/profile") return renderProfile();
  if (state.path === "/subscription" || state.path === "/update-plan") return renderSubscription();
  if (state.path === "/billing-history") return renderBillingHistory();
  if (state.path === "/payment-success") return renderPaymentStatus(true);
  if (state.path === "/payment-failed") return renderPaymentStatus(false);
  if (state.path === "/cancel-subscription") return renderCancelSubscription();
  if (["/settings", "/help", "/contact", "/privacy", "/terms"].includes(state.path)) return renderStaticPage(state.path);
  if (state.path === "/doctor" || state.path.startsWith("/doctor/")) return renderDoctorDashboard();
  if (state.path === "/admin" || state.path.startsWith("/admin/")) return renderAdminDashboard();
  return renderNotFound();
}

renderShell();
loadRealtimeClient();
bindGlobalActions();
bindRealtimeUpdates();
route();
