const appConfig = {
  apiBaseUrl: "/api",
  csrfHeader: "x-csrf-token",
  accessTokenKey: "medexplain_access_token"
};

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
  ["/consultation/appointments.html", "/doctors"],
  ["/profile/overview.html", "/profile"],
  ["/profile/edit.html", "/profile"],
  ["/settings/home.html", "/settings"],
  ["/premium/plans.html", "/subscription"],
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
  "/profile": { title: "Profile", description: "Review and update your account information." },
  "/settings": { title: "Settings", description: "Manage privacy, security, notifications, and accessibility preferences." },
  "/subscription": { title: "Subscription", description: "Manage your plan and billing status." },
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
    const [reports, appointments, health, subscription] = await Promise.allSettled([
      cachedRequest("reports", "/reports"),
      cachedRequest("appointments", "/appointments"),
      cachedRequest("health", "/health-history"),
      cachedRequest("config", "/config/public")
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
        ${summaryCard("Subscription Status", "workspace_premium", subscription.status === "fulfilled" ? "Plan information available" : "Plan information unavailable", "/subscription")}
      </section>
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

function summaryCard(title, iconName, value, href) {
  return `<article class="card stack"><div class="card-header"><div><p class="caption">${title}</p><h3>${escapeHtml(value)}</h3></div><div class="icon-tile">${icon(iconName)}</div></div><a class="btn btn-quiet" href="${href}">Open</a></article>`;
}

function renderReportItem(report) {
  const title = report.title || report.originalName || "Untitled report";
  const status = report.status || "Uploaded";
  return `<article class="card stack"><div class="card-header"><div><h3>${escapeHtml(title)}</h3><p class="muted">${escapeHtml(status)}</p></div><span class="badge">${escapeHtml(status)}</span></div><a class="btn btn-quiet" href="/report/${report.id || ""}">Review report</a></article>`;
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
          <div class="field"><label for="report">Medical report file <span class="required">*</span></label><input id="report" name="report" type="file" required /><span class="field-error" data-error-for="report"></span></div>
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
    setMain(`${pageHeader(meta)}<article class="card card-accent stack"><h2>${escapeHtml(report.title || report.originalName || "Report")}</h2><p class="muted">${escapeHtml(report.status || "Uploaded")}</p><div class="actions"><button class="btn btn-primary" data-action="analyze-report">${icon("auto_awesome")}Analyze report</button><a class="btn btn-secondary" href="/reports">Back to reports</a></div><div data-analysis-target>${report.analysis ? `<p>${escapeHtml(report.analysis.summary || "Analysis is available.")}</p>` : emptyState({ iconName: "psychology", title: "No analysis yet", description: "Start analysis to generate a clear explanation.", actionLabel: "", actionHref: "" })}</div></article>`);
    document.querySelector('[data-action="analyze-report"]')?.addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      try {
        await apiRequest(`/reports/${id}/analyze`, { method: "POST" });
        document.querySelector("[data-analysis-target]").innerHTML = emptyState({ iconName: "done", title: "Analysis started", description: "Refresh this report shortly to review the explanation.", actionLabel: "", actionHref: "" });
      } catch {
        document.querySelector("[data-analysis-target]").innerHTML = errorState("We could not start analysis", false);
      }
    });
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load this report")}`);
  }
}

async function renderChat() {
  const meta = routeTitle("/chat");
  setMain(`
    ${pageHeader(meta)}
    <section class="grid grid-2">
      <form class="form-card form" data-chat-form novalidate>
        <div class="form-message" data-form-message hidden></div>
        ${textarea("Question", "message", true)}
        <button class="btn btn-primary" type="submit">${icon("send")}Send to AI</button>
      </form>
      <article class="card stack"><h2>Conversation</h2><div data-chat-output>${emptyState({ iconName: "psychology", title: "No conversation selected", description: "Ask a question to begin a secure AI conversation.", actionLabel: "", actionHref: "" })}</div></article>
    </section>
  `);
  document.querySelector("[data-chat-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return;
    setSubmitLoading(form, true);
    try {
      const response = await apiRequest("/ai/chat", { method: "POST", body: { message: new FormData(form).get("message") } });
      document.querySelector("[data-chat-output]").innerHTML = `<div class="card stack"><p>${escapeHtml(response.data?.message || response.data?.answer || "The AI response is ready.")}</p></div>`;
      showFormMessage(form, "success", "Response received.");
    } catch {
      showFormMessage(form, "error", "The AI assistant could not respond right now. Please retry.");
    } finally {
      setSubmitLoading(form, false);
    }
  });
}

async function renderDoctors() {
  const meta = routeTitle("/doctors");
  setMain(`
    ${pageHeader(meta)}
    <section class="grid grid-2">
      ${emptyState({ iconName: "stethoscope", title: "Doctor directory is being prepared", description: "Verified doctor listings will appear here when the backend exposes directory data.", actionLabel: "Request a consultation", actionHref: "/doctors" })}
      <form class="form-card form" data-appointment-form novalidate>
        <h2>Request consultation</h2>
        <div class="form-message" data-form-message hidden></div>
        <div class="field"><label for="scheduledAt">Preferred time <span class="required">*</span></label><input id="scheduledAt" name="scheduledAt" type="datetime-local" required /><span class="field-error" data-error-for="scheduledAt"></span></div>
        ${textarea("Reason for visit", "reason", true)}
        ${textarea("Notes", "notes", false)}
        <button class="btn btn-primary" type="submit">${icon("calendar_add_on")}Request appointment</button>
      </form>
    </section>
  `);
  bindAppointmentForm();
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
      await apiRequest("/appointments", { method: "POST", body: { scheduledAt, reason: formData.get("reason"), notes: formData.get("notes") } });
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
    "/subscription": ["Subscription", "Plan and payment details will appear here when billing data is available."],
    "/help": ["Help center", "Browse medical report guidance, AI explanation tips, and support paths without leaving the product."],
    "/contact": ["Contact support", "Use the support action below for help with reports, billing, privacy, or account access."],
    "/privacy": ["Privacy", "MedExplain AI keeps health information private, uses backend-mediated AI calls, and avoids exposing secrets in frontend code."],
    "/terms": ["Terms", "Use MedExplain AI as an informational support tool. It does not replace professional medical advice."]
  };
  const [title, description] = contentMap[path] || [meta.title, meta.description];
  setMain(`${pageHeader(meta)}<section class="card stack"><div class="icon-tile">${icon("info")}</div><h2>${title}</h2><p class="muted">${description}</p><div class="actions"><a class="btn btn-primary" href="${path === "/contact" ? "mailto:support@medexplain.ai" : "/dashboard"}">${path === "/contact" ? "Email support" : "Return to dashboard"}</a><a class="btn btn-secondary" href="/help">Open help</a></div></section>`);
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
          <article class="card stack"><h2>Messages</h2>${emptyState({ iconName: "mark_chat_unread", title: "No messages", description: "Patient messages will appear here when available.", actionLabel: "", actionHref: "" })}</article>
          <article class="card stack"><h2>Analytics</h2>${emptyState({ iconName: "analytics", title: "No analytics yet", description: "Analytics require completed consultations and report activity.", actionLabel: "", actionHref: "" })}</article>
          <article class="card stack"><h2>Settings</h2><p class="muted">Manage availability, profile details, notification preferences, and consultation settings.</p><a class="btn btn-quiet" href="/doctor/settings">Open settings</a></article>
        </section>
      </div>
    </section>
  `);
}

function renderAppointmentItem(item) {
  return `<article class="card stack"><h3>${escapeHtml(item.reason || "Consultation request")}</h3><p class="muted">${escapeHtml(item.scheduledAt || "Time pending")}</p><span class="badge">${escapeHtml(item.status || "requested")}</span></article>`;
}

async function renderAdminDashboard() {
  const meta = routeTitle("/admin");
  const tabs = ["Overview", "Users", "Doctors", "Doctor Applications", "Reports", "AI Usage", "Payments", "Subscriptions", "Security Logs", "Audit Logs", "System Settings"];
  setMain(`${pageHeader(meta)}${loadingState("Loading admin workspace")}`);
  const [analytics, users, logs] = await Promise.allSettled([apiRequest("/admin/analytics"), apiRequest("/admin/users"), apiRequest("/admin/audit-logs")]);
  const userItems = users.value?.data?.users || [];
  const logItems = logs.value?.data?.auditLogs || [];
  setMain(`
    <section class="dashboard-shell">
      <aside class="side-nav" aria-label="Admin dashboard sections">${tabs.map((tab, index) => `<a class="nav-link" href="/admin${index ? `/${tab.toLowerCase().replaceAll(" ", "-")}` : ""}"${index === 0 ? ' aria-current="page"' : ""}>${icon(index === 0 ? "admin_panel_settings" : "chevron_right")}<span>${tab}</span></a>`).join("")}</aside>
      <div class="stack-lg">
        ${pageHeader(meta)}
        <section class="grid grid-4">
          ${summaryCard("Users", "groups", userItems.length ? `${userItems.length} users` : "No users returned", "/admin/users")}
          ${summaryCard("AI Usage", "auto_awesome", analytics.status === "fulfilled" ? "Analytics available" : "Analytics unavailable", "/admin/ai-usage")}
          ${summaryCard("Payments", "payments", "No payment data", "/admin/payments")}
          ${summaryCard("Security Logs", "shield", logItems.length ? `${logItems.length} logs` : "No logs returned", "/admin/security-logs")}
        </section>
        <section class="grid grid-2">
          <article class="card stack"><h2>Users</h2>${listCard(userItems, { iconName: "groups", title: "No users returned", description: "User records will appear here when available to this role.", actionLabel: "", actionHref: "" }, renderUserItem)}</article>
          <article class="card stack"><h2>Audit Logs</h2>${listCard(logItems, { iconName: "fact_check", title: "No audit logs returned", description: "Audit activity will appear here when available.", actionLabel: "", actionHref: "" }, renderAuditItem)}</article>
          <article class="card stack"><h2>Doctor Applications</h2>${emptyState({ iconName: "badge", title: "No applications returned", description: "Doctor applications will appear here once submitted.", actionLabel: "", actionHref: "" })}</article>
          <article class="card stack"><h2>System Settings</h2><p class="muted">Administrative settings are grouped here to keep operational controls consistent.</p><a class="btn btn-quiet" href="/admin/system-settings">Open settings</a></article>
        </section>
      </div>
    </section>
  `);
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

function route() {
  document.title = `${routeTitle(state.path).title} | MedExplain AI`;
  if (state.path === "/") return renderLanding();
  if (state.path === "/login") return renderAuth("login");
  if (state.path === "/register") return renderAuth("register");
  if (state.path === "/dashboard") return renderPatientDashboard();
  if (state.path === "/reports") return renderReports();
  if (state.path === "/report/:id") return renderReportDetail();
  if (state.path === "/chat") return renderChat();
  if (state.path === "/doctors" || state.path === "/doctor/:id") return renderDoctors();
  if (state.path === "/profile") return renderProfile();
  if (["/settings", "/subscription", "/help", "/contact", "/privacy", "/terms"].includes(state.path)) return renderStaticPage(state.path);
  if (state.path === "/doctor" || state.path.startsWith("/doctor/")) return renderDoctorDashboard();
  if (state.path === "/admin" || state.path.startsWith("/admin/")) return renderAdminDashboard();
  return renderNotFound();
}

renderShell();
bindGlobalActions();
route();
