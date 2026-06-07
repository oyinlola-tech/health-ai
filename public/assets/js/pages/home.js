/**
 * @file Landing, authentication, dashboard, and shared dashboard renderers.
 * @module assets/js/pages/home.js
 */

// -----------------------------------------------------------------------------
// Landing, authentication, dashboard, and shared dashboard renderers.
// -----------------------------------------------------------------------------

function renderSplash() {
  const meta = routeTitle("/splash");
  setMain(`
    <section class="page-hero">
      <div class="hero-panel">
        ${pageHeader(meta)}
        <p class="muted">Start with a guided setup, then sign in or create an account to keep reports, consultations, subscriptions, and AI analysis private.</p>
        <div class="actions">
          <a class="btn btn-primary" href="/onboarding">${icon("arrow_forward")}Get started</a>
          <a class="btn btn-secondary" href="/login">Sign in</a>
        </div>
      </div>
      <div class="hero-panel hero-visual">
        <div class="icon-tile">${icon("health_and_safety")}</div>
        <h2>Understand health information without panic.</h2>
        <p class="muted">MedExplain AI keeps medical explanations grounded, private, and connected to real account access.</p>
      </div>
    </section>
  `);
}

function renderOnboarding() {
  const meta = routeTitle("/onboarding");
  localStorage.setItem("medexplain_onboarding_seen", "true");
  setMain(`
    ${pageHeader(meta)}
    <section class="grid grid-3" aria-label="MedExplain onboarding">
      ${featureCard("Upload securely", "upload_file", "Send medical reports through the protected backend upload flow.", "/register")}
      ${featureCard("Get grounded explanations", "psychology", "AI analysis uses trusted medical context and backend safety checks.", "/register")}
      ${featureCard("Continue with care", "stethoscope", "Use subscriptions and doctor workflows when your account has access.", "/register")}
    </section>
    <section class="card stack">
      <div class="card-header">
        <div>
          <h2>Create your private workspace</h2>
          <p class="muted">New accounts start directly in the dashboard after registration.</p>
        </div>
        <span class="badge">14-day trial</span>
      </div>
      <div class="actions">
        <a class="btn btn-primary" href="/register">${icon("person_add")}Create account</a>
        <a class="btn btn-secondary" href="/login">I already have an account</a>
      </div>
    </section>
  `);
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
          ${!isLogin ? `<p class="muted">By creating an account, you agree to the <a class="item-title" href="/terms">Terms</a> and <a class="item-title" href="/privacy">Privacy Policy</a>.</p>` : ""}
          <button class="btn btn-primary btn-full" type="submit">${isLogin ? "Sign in" : "Create account"}</button>
          <a class="btn btn-secondary btn-full" href="${isLogin ? "/register" : "/login"}">${isLogin ? "Create an account" : "I already have an account"}</a>
        </form>
      </div>
    </section>
  `);
  bindAuthForm();
}

function bindAuthForm() {
  const form = document.querySelector("[data-auth-form]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    const mode = form.dataset.authForm;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.consentPromptLearning = mode === "register";
    setSubmitLoading(form, true);
    try {
      const response = await apiRequest(`/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", body: payload });
      setAccessToken(response.data?.accessToken);
      localStorage.setItem("medexplain_onboarding_seen", "true");
      showFormMessage(form, "success", "Success. Redirecting to your dashboard.");
      window.setTimeout(() => window.location.assign(authRedirectTarget()), 400);
    } catch {
      showFormMessage(form, "error", "We could not complete that request. Check your details and try again.");
    } finally {
      setSubmitLoading(form, false);
    }
  });
}

function authRedirectTarget() {
  const next = new URLSearchParams(location.search).get("next");
  const blocked = new Set(["/login", "/register", "/splash", "/onboarding", "/chat"]);
  if (!next || !next.startsWith("/") || next.startsWith("//") || blocked.has(next.split("?")[0])) return "/dashboard";
  return next;
}

async function renderPatientDashboard() {
  const meta = routeTitle("/dashboard");
  setMain(`${pageHeader(meta)}${loadingState("Loading dashboard")}`);
  try {
    const [reports, appointments, health, subscription] = await Promise.allSettled([
      cachedRequest("reports", "/reports"),
      cachedRequest("appointments", "/appointments"),
      cachedRequest("health", "/health-history"),
      cachedRequest("subscription", "/subscriptions/me")
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
      <section class="grid grid-2">
        <article class="card card-accent stack"><div class="card-header"><h2>Recent Reports</h2></div>${listCard(reportItems.slice(0, 3), { iconName: "description", title: "No reports yet", description: "Upload a report to receive an AI-assisted explanation.", actionLabel: "Upload report", actionHref: "/reports" }, renderReportItem)}</article>
        <article class="card stack"><div class="card-header"><h2>Health Trends</h2></div>${listCard(healthItems.slice(0, 3), { iconName: "monitor_heart", title: "No health trend data", description: "Save health history entries to review them from this dashboard.", actionLabel: "Add health entry", actionHref: "/profile" }, renderHealthItem)}</article>
      </section>
      <section class="card stack"><h2>Quick Actions</h2><div class="actions"><a class="btn btn-primary" href="/reports">${icon("upload_file")}Upload report</a><a class="btn btn-secondary" href="/chat">Ask AI</a><a class="btn btn-secondary" href="/doctors">Book consultation</a></div></section>
    `);
  } catch (error) {
    const message = error?.status === 401 ? "Please sign in again." : "Server connection unavailable. Please try again.";
    setMain(`${pageHeader(meta)}${errorState(message)}`);
  }
}

function money(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);
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

function renderEntitlementBanner(subscription = {}, feature = "reportAnalysis") {
  const usage = subscription.usage?.[feature] || {};
  const used = Number(usage.used || 0);
  const limit = usage.limit === null || usage.limit === undefined ? null : Number(usage.limit || 0);
  const remaining = limit === null ? "Unlimited" : `${Math.max(limit - used, 0)} remaining`;
  const label = {
    reportAnalysis: "Report analysis",
    aiChat: "AI chat",
    doctorBookings: "Doctor consultations"
  }[feature];
  return `<section class="card stack"><div class="card-header"><div><h2>Plan Access</h2><p class="muted">${escapeHtml(label)} access is enforced by backend entitlement checks.</p></div><span class="badge">${escapeHtml(subscription.plan || "FREE")}</span></div><div class="actions"><span class="badge">${escapeHtml(remaining)}</span><a class="btn btn-quiet" href="/subscription">Manage plan</a></div></section>`;
}

function renderAiUsageOverview(aiUsage = {}) {
  const usage = aiUsage.usage || {};
  const quota = aiUsage.quota || {};
  const percent = Number(usage.quotaPercent || 0);
  const monthlyLimit = quota.monthlyCostLimitNaira ? money(quota.monthlyCostLimitNaira) : "Quota initializes on first AI request";
  return `<section class="card stack"><div class="card-header"><div><h2>AI Usage Governance</h2><p class="muted">AI analysis used ${percent}% of your monthly quota.</p></div><span class="badge ${percent > 85 ? "badge-warning" : "badge-success"}">${escapeHtml(quota.planCode || "Measured")}</span></div><div class="usage-meter"><div class="card-header"><div><p class="caption">Monthly AI quota</p><strong>${money(usage.monthlyCostNaira || 0)} used</strong></div><span class="badge">${monthlyLimit}</span></div><div class="meter-track"><span style="width:${Math.min(100, percent)}%"></span></div></div><div class="grid grid-3">${metricTile("AI Requests", "bolt", String(usage.monthlyRequests || 0))}${metricTile("Tokens Used", "data_usage", String(usage.monthlyTokens || 0))}${metricTile("Daily Cap", "speed", quota.dailyRequestLimit ? `${quota.dailyRequestLimit} requests` : "Managed")}</div></section>`;
}

function summaryCard(title, iconName, value, href) {
  return `<a class="card stack summary-card" href="${href}"><div class="card-header"><div><p class="caption">${title}</p><h3>${escapeHtml(value)}</h3></div><div class="icon-tile">${icon(iconName)}</div></div></a>`;
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
  const href = `/report/${report.id || ""}`;
  return `<article class="card stack">
    <div class="card-header">
      <div><h3><a class="item-title" href="${href}">${escapeHtml(reportTitle(report))}</a></h3><p class="muted">Extraction confidence: ${escapeHtml(confidence)}</p></div>
      <span class="badge ${badgeClassForStatus(extractionStatus)}">${escapeHtml(displayStatus(extractionStatus))}</span>
    </div>
    <div class="actions"><span class="badge">${escapeHtml(displayStatus(report.status || "uploaded"))}</span></div>
  </article>`;
}

function renderHealthItem(entry) {
  return `<article class="card stack"><h3>${escapeHtml(entry.title || entry.category || "Health entry")}</h3><p class="muted">${escapeHtml(entry.value || "Saved health history entry")}</p></article>`;
}

function notificationCategory(item = {}) {
  const raw = String(item.category || item.type || "system").toLowerCase();
  if (raw.includes("ai") || raw.includes("critical") || raw.includes("report")) return "AI";
  if (raw.includes("payment") || raw.includes("subscription") || raw.includes("coupon")) return "Payment";
  if (raw.includes("security") || raw.includes("login") || raw.includes("password") || raw.includes("account")) return "Security";
  if (raw.includes("doctor") || raw.includes("appointment") || raw.includes("consultation")) return "Doctor";
  return "System";
}

async function renderNotifications() {
  const meta = routeTitle("/notifications");
  const filter = new URLSearchParams(location.search).get("type") || "All";
  setMain(`${pageHeader(meta)}${loadingState("Loading notifications")}`);
  try {
    const response = await apiRequest("/notifications");
    const notifications = response.data?.notifications || [];
    const filtered = filter === "All" ? notifications : notifications.filter((item) => notificationCategory(item) === filter);
    const tabs = ["All", "AI", "Payment", "Security", "Doctor"];
    setMain(`
      ${pageHeader(meta)}
      <section class="tabs" aria-label="Notification filters">
        ${tabs.map((tab) => `<a class="tab" href="/notifications${tab === "All" ? "" : `?type=${encodeURIComponent(tab)}`}"${tab === filter ? ' aria-current="page"' : ""}>${tab}</a>`).join("")}
      </section>
      <section class="table-card stack">
        <div class="card-header"><div><h2>Email and notification history</h2><p class="muted">Persisted alerts from AI, payment, security, doctor, and system workflows.</p></div><span class="badge">${filtered.length} shown</span></div>
        <div class="table-wrap"><table><thead><tr><th>Type</th><th>Title</th><th>Channel</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>
          ${
            filtered.length
              ? filtered
                  .map((item) => {
                    const category = notificationCategory(item);
                    return `<tr><td>${escapeHtml(category)}</td><td><strong>${escapeHtml(item.title)}</strong><p class="muted">${escapeHtml(item.body || "")}</p></td><td>${escapeHtml(item.source || item.delivery_channel || "in_app")}</td><td><span class="badge ${item.read_at ? "badge-success" : "badge-warning"}">${item.read_at ? "Read" : "Unread"}</span></td><td>${escapeHtml(new Date(item.created_at).toLocaleString())}</td><td>${item.read_at ? "" : `<button class="btn btn-secondary" type="button" data-mark-notification="${escapeHtml(item.id)}">Mark read</button>`}</td></tr>`;
                  })
                  .join("")
              : `<tr><td colspan="6">No notifications in this filter.</td></tr>`
          }
        </tbody></table></div>
      </section>
    `);
    document.querySelectorAll("[data-mark-notification]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        await apiRequest(`/notifications/${button.dataset.markNotification}/read`, { method: "PATCH" });
        renderNotifications();
      });
    });
  } catch (error) {
    const message = error?.status === 401 ? "Please sign in again." : "Server connection unavailable. Please try again.";
    setMain(`${pageHeader(meta)}${errorState(message)}`);
  }
}
