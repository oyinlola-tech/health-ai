/**
 * @file Doctor and admin workspace renderers.
 * @module assets/js/pages/workspaces.js
 */

// -----------------------------------------------------------------------------
// Doctor and admin workspace renderers.
// -----------------------------------------------------------------------------

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
          ${summaryCard("Patient Queue", "groups", appointmentItems.length ? `${appointmentItems.length} active` : "Queue clear", "/doctor/patient-queue")}
          ${summaryCard("Appointments", "calendar_month", appointmentItems.length ? `${appointmentItems.length} appointments` : "No appointments", "/doctor/appointments")}
          ${summaryCard("Medical Reports", "description", reportItems.length ? `${reportItems.length} reports` : "No assigned reports", "/doctor/medical-reports")}
          ${summaryCard("Verification Status", "verified_user", "Check profile", "/doctor/verification-status")}
        </section>
        <section class="grid grid-2">
          <article class="card stack"><h2>Appointments</h2>${listCard(appointmentItems, { iconName: "calendar_month", title: "No appointments assigned", description: "Confirmed and pending patient appointments are shown here.", actionLabel: "Refresh dashboard", actionHref: "/doctor" }, renderAppointmentItem)}</article>
          <article class="card stack"><h2>Availability Scheduler</h2><form class="form" data-availability-form><div class="form-message" data-form-message hidden></div>${field("Day of week", "dayOfWeek", "number", true)}${field("Starts", "startsAt", "time", true)}${field("Ends", "endsAt", "time", true)}<button class="btn btn-primary" type="submit">${icon("schedule")}Save availability</button></form></article>
          <article class="card stack"><h2>Consultation Rooms</h2><a class="btn btn-quiet" href="/chat">Open messages</a><p class="muted">Chat rooms are created after appointments are confirmed.</p></article>
          <article class="card stack"><h2>Earnings</h2><p class="muted">Premium consultations are tracked through the billing system.</p><span class="badge">Premium consultation ready</span></article>
        </section>
      </div>
    </section>
  `);
  document.querySelector("[data-availability-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    await apiRequest("/doctor/availability", { method: "POST", body: payload });
    showFormMessage(event.currentTarget, "success", "Availability saved.");
    window.setTimeout(() => {
      invalidateCache("doctor-appointments", "doctor-reports");
      rerenderCurrentRoute();
    }, 500);
  });
}

function renderAppointmentItem(item) {
  const doctor = [item.doctor_first_name, item.doctor_last_name].filter(Boolean).join(" ");
  const patient = [item.patient_first_name, item.patient_last_name].filter(Boolean).join(" ");
  return `<article class="card stack"><h3>${escapeHtml(item.reason || "Consultation request")}</h3><p class="muted">${escapeHtml(doctor || patient || "Assigned participant")}</p><p class="muted">${escapeHtml(item.scheduled_at || item.scheduledAt || "Time pending")}</p><span class="badge">${escapeHtml(item.status || "PENDING")}</span></article>`;
}

async function renderAdminDashboard() {
  if (state.path === "/admin/coupons") return renderAdminCoupons();
  if (state.path === "/admin/analytics") return renderAdminAnalytics();
  if (state.path !== "/admin") return renderAdminSection();
  const meta = { title: "Admin dashboard", description: "A concise operating view of platform health, users, reports, payments, and AI usage." };
  setMain(`${adminLayout(loadingState("Loading admin workspace"), meta)}`);
  const [users, logs, reportMetrics, monetization, aiCosts, applications] = await Promise.allSettled([
    apiRequest("/admin/users"),
    apiRequest("/admin/audit-logs"),
    apiRequest("/admin/reports/processing-metrics"),
    apiRequest("/admin/monetization"),
    apiRequest("/admin/ai-costs"),
    apiRequest("/recruitment/applications")
  ]);
  const userItems = users.value?.data?.users || [];
  const logItems = logs.value?.data?.auditLogs || [];
  const metrics = reportMetrics.value?.data?.metrics || {};
  const revenue = monetization.value?.data?.metrics || {};
  const aiDashboard = aiCosts.value?.data?.dashboard || {};
  const aiSummary = aiDashboard.summary || {};
  const applicationItems = applications.value?.data?.applications || [];
  const overview = `
    <section class="admin-hero card stack">
      <div class="card-header">
        <div>
          <p class="caption">Platform snapshot</p>
          <h2>Everything important, nothing noisy.</h2>
        </div>
        <span class="badge ${Number(metrics.failed_extractions || 0) ? "badge-warning" : "badge-success"}">${Number(metrics.failed_extractions || 0) ? "Needs review" : "Stable"}</span>
      </div>
      <div class="admin-kpi-grid">
        ${metricTile("Users", "groups", String(userItems.length || 0))}
        ${metricTile("AI Requests", "auto_awesome", String(aiSummary.total_requests || 0))}
        ${metricTile("Reports Processed", "description", String(metrics.reports_processed ?? 0))}
        ${metricTile("Monthly Revenue", "payments", money(revenue.monthly_revenue_cents || 0))}
      </div>
    </section>
    <section class="grid grid-3">
      ${summaryCard("Users", "groups", "Manage accounts", "/admin/users")}
      ${summaryCard("Reports", "description", "Review processing", "/admin/reports")}
      ${summaryCard("Payments", "payments", "Monitor billing", "/admin/payments")}
    </section>
    <section class="grid grid-2">
      <article class="card stack">
        <div class="card-header"><div><h2>Report health</h2><p class="muted">Extraction quality from the backend processing metrics.</p></div><a class="item-title" href="/admin/reports">View reports</a></div>
        <div class="admin-status-row"><span class="badge ${Number(metrics.ocr_failure_rate || 0) > 10 ? "badge-error" : "badge-success"}">OCR failure ${metrics.ocr_failure_rate ?? 0}%</span><span class="badge">Confidence ${metrics.average_confidence ?? 0}%</span></div>
      </article>
      <article class="card stack">
        <div class="card-header"><div><h2>Recent activity</h2><p class="muted">Latest audit events only. Full history lives in Audit Logs.</p></div><a class="item-title" href="/admin/audit-logs">View all</a></div>
        ${compactAdminList(logItems.slice(0, 5), renderCompactAuditItem, { iconName: "fact_check", title: "No audit activity", description: "Audit events will appear here when recorded." })}
      </article>
      <article class="card stack">
        <div class="card-header"><div><h2>Doctor applications</h2><p class="muted">Pending recruitment review queue.</p></div><a class="item-title" href="/admin/doctor-applications">Review</a></div>
        ${compactAdminList(applicationItems.slice(0, 4), renderCompactApplicationItem, { iconName: "badge", title: "No applications", description: "Submitted doctor applications will appear here." })}
      </article>
      <article class="card stack">
        <div class="card-header"><div><h2>Billing pulse</h2><p class="muted">Subscription activity from payment records.</p></div><a class="item-title" href="/admin/subscriptions">View subscriptions</a></div>
        <div class="admin-status-row"><span class="badge">Active ${revenue.active_subscribers ?? 0}</span><span class="badge">Failed ${revenue.failed_payments ?? 0}</span><span class="badge">Churn ${revenue.churn_rate ?? 0}%</span></div>
      </article>
    </section>
  `;
  setMain(adminLayout(overview, meta));
}

const adminSections = [
  { label: "Overview", href: "/admin", icon: "dashboard" },
  { label: "Users", href: "/admin/users", icon: "groups" },
  { label: "Doctors", href: "/admin/doctors", icon: "stethoscope" },
  { label: "Applications", href: "/admin/doctor-applications", icon: "badge" },
  { label: "Reports", href: "/admin/reports", icon: "description" },
  { label: "AI Usage", href: "/admin/ai-usage", icon: "auto_awesome" },
  { label: "Payments", href: "/admin/payments", icon: "payments" },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: "workspace_premium" },
  { label: "Coupons", href: "/admin/coupons", icon: "sell" },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: "fact_check" },
  { label: "System", href: "/admin/system-settings", icon: "settings" }
];

function adminLayout(content, meta = routeTitle("/admin")) {
  return `
    <section class="dashboard-shell admin-workspace">
      <aside class="side-nav admin-side-nav" aria-label="Admin dashboard sections">${adminSections
        .map((item) => `<a class="nav-link" href="${item.href}"${isActive(item.href) ? ' aria-current="page"' : ""}>${icon(item.icon)}<span>${item.label}</span></a>`)
        .join("")}</aside>
      <div class="stack-lg">
        ${pageHeader(meta)}
        ${content}
      </div>
    </section>
  `;
}

async function renderAdminSection() {
  const route = normalizePath(state.path);
  const meta = adminMeta(route);
  setMain(adminLayout(loadingState(`Loading ${meta.title.toLowerCase()}`), meta));
  try {
    if (route === "/admin/users") return renderAdminUsers(meta);
    if (route === "/admin/doctors") return renderAdminDoctors(meta);
    if (route === "/admin/doctor-applications") return renderAdminApplications(meta);
    if (route === "/admin/reports") return renderAdminReports(meta);
    if (route === "/admin/ai-usage") return renderAdminAiUsage(meta);
    if (route === "/admin/payments") return renderAdminPayments(meta);
    if (route === "/admin/subscriptions") return renderAdminSubscriptions(meta);
    if (route === "/admin/audit-logs" || route === "/admin/security-logs") return renderAdminAuditLogs(meta, route === "/admin/security-logs");
    if (route === "/admin/system" || route === "/admin/system-settings" || route === "/admin/jobs") return renderAdminSystem(meta);
    setMain(adminLayout(emptyState({ iconName: "map", title: "Admin section unavailable", description: "Choose a section from the admin navigation.", actionLabel: "", actionHref: "" }), meta));
  } catch (error) {
    const message = error?.status === 401 ? "Please sign in again." : "Server connection unavailable. Please try again.";
    setMain(adminLayout(errorState(message), meta));
  }
}

function adminMeta(route) {
  const match = adminSections.find((item) => item.href === route);
  const title = match?.label || "Admin";
  const descriptions = {
    "/admin/users": "Search, scan, and manage real user accounts.",
    "/admin/doctors": "Review verified doctor directory records.",
    "/admin/doctor-applications": "Review submitted doctor applications.",
    "/admin/reports": "Monitor report uploads, analysis status, and processing quality.",
    "/admin/ai-usage": "Track AI spend, blocked requests, cache efficiency, and budget signals.",
    "/admin/payments": "Review payment health and monetization records.",
    "/admin/subscriptions": "Monitor plan adoption and subscription health.",
    "/admin/audit-logs": "Review persisted admin and security actions.",
    "/admin/security-logs": "Review security-related audit events.",
    "/admin/system": "Operational controls and platform health links.",
    "/admin/system-settings": "Operational controls and platform health links.",
    "/admin/jobs": "Recruitment controls and application links."
  };
  return { title, description: descriptions[route] || "Focused admin workspace." };
}

async function renderAdminUsers(meta) {
  const response = await apiRequest("/admin/users");
  const users = response.data?.users || [];
  setMain(adminLayout(`
    <section class="grid grid-3">
      ${summaryCard("Total users", "groups", String(users.length), "/admin/users")}
      ${summaryCard("Doctors", "stethoscope", String(users.filter((user) => String(user.role).toLowerCase() === "doctor").length), "/admin/doctors")}
      ${summaryCard("Admins", "admin_panel_settings", String(users.filter((user) => String(user.role).toLowerCase() === "admin").length), "/admin/users")}
    </section>
    <section class="table-card stack">
      <div class="card-header"><div><h2>Users</h2><p class="muted">Real accounts returned by the admin API.</p></div><span class="badge">${users.length} records</span></div>
      ${adminUserTable(users)}
    </section>
  `, meta));
}

async function renderAdminDoctors(meta) {
  const response = await apiRequest("/doctors");
  const doctors = response.data?.doctors || [];
  setMain(adminLayout(`
    <section class="table-card stack">
      <div class="card-header"><div><h2>Doctors</h2><p class="muted">Verified doctor directory records.</p></div><span class="badge">${doctors.length} records</span></div>
      ${doctors.length ? `<div class="admin-list">${doctors.map(renderAdminDoctorRow).join("")}</div>` : emptyState({ iconName: "stethoscope", title: "No doctors found", description: "Verified doctors will appear here after approval.", actionLabel: "", actionHref: "" })}
    </section>
  `, meta));
}

async function renderAdminApplications(meta) {
  const response = await apiRequest("/recruitment/applications");
  const applications = response.data?.applications || [];
  setMain(adminLayout(`
    <section class="table-card stack">
      <div class="card-header"><div><h2>Doctor applications</h2><p class="muted">Submitted applications from the doctor careers workflow.</p></div><span class="badge">${applications.length} records</span></div>
      ${applications.length ? `<div class="admin-list">${applications.map(renderApplicationItem).join("")}</div>` : emptyState({ iconName: "badge", title: "No applications", description: "Doctor applications will appear here when submitted.", actionLabel: "", actionHref: "" })}
    </section>
  `, meta));
}

async function renderAdminReports(meta) {
  const [reportsResponse, metricsResponse] = await Promise.all([apiRequest("/reports"), apiRequest("/admin/reports/processing-metrics")]);
  const reports = reportsResponse.data?.reports || [];
  const metrics = metricsResponse.data?.metrics || {};
  setMain(adminLayout(`
    <section class="grid grid-4">
      ${summaryCard("Processed", "description", String(metrics.reports_processed ?? 0), "/admin/reports")}
      ${summaryCard("Failed", "report_problem", String(metrics.failed_extractions ?? 0), "/admin/reports")}
      ${summaryCard("OCR Failure", "document_scanner", `${metrics.ocr_failure_rate ?? 0}%`, "/admin/reports")}
      ${summaryCard("Confidence", "verified", `${metrics.average_confidence ?? 0}%`, "/admin/reports")}
    </section>
    <section class="table-card stack">
      <div class="card-header"><div><h2>Reports</h2><p class="muted">Reports visible to admin through the reports API.</p></div><span class="badge">${reports.length} records</span></div>
      ${reports.length ? `<div class="admin-list">${reports.map(renderReportItem).join("")}</div>` : emptyState({ iconName: "description", title: "No reports found", description: "Uploaded reports will appear here.", actionLabel: "", actionHref: "" })}
    </section>
  `, meta));
}

async function renderAdminAiUsage(meta) {
  const response = await apiRequest("/admin/ai-costs");
  setMain(adminLayout(renderAdminAiCostPanel(response.data?.dashboard || {}), meta));
}

async function renderAdminPayments(meta) {
  const response = await apiRequest("/admin/monetization");
  const revenue = response.data?.metrics || {};
  setMain(adminLayout(`
    <section class="grid grid-4">
      ${summaryCard("Monthly Revenue", "payments", money(revenue.monthly_revenue_cents || 0), "/admin/payments")}
      ${summaryCard("Failed Payments", "credit_card_off", String(revenue.failed_payments ?? 0), "/admin/payments")}
      ${summaryCard("Refunds", "undo", String(revenue.refunds ?? 0), "/admin/payments")}
      ${summaryCard("Refund Rate", "percent", `${revenue.refund_rate ?? 0}%`, "/admin/payments")}
    </section>
    <section class="card stack">
      <h2>Feature usage</h2>
      ${renderListCard(revenue.top_features_used || [])}
    </section>
  `, meta));
}

async function renderAdminSubscriptions(meta) {
  const response = await apiRequest("/admin/monetization");
  const revenue = response.data?.metrics || {};
  setMain(adminLayout(`
    <section class="grid grid-3">
      ${summaryCard("Active Subscribers", "workspace_premium", String(revenue.active_subscribers ?? 0), "/admin/subscriptions")}
      ${summaryCard("Churn Rate", "trending_down", `${revenue.churn_rate ?? 0}%`, "/admin/subscriptions")}
      ${summaryCard("Monthly Revenue", "payments", money(revenue.monthly_revenue_cents || 0), "/admin/payments")}
    </section>
    <section class="card stack">
      <h2>Subscription health</h2>
      <p class="muted">Subscription totals are generated from the billing system. Detailed plan management remains server-enforced.</p>
      <div class="admin-status-row"><span class="badge">Active ${revenue.active_subscribers ?? 0}</span><span class="badge">Failed payments ${revenue.failed_payments ?? 0}</span><span class="badge">Churn ${revenue.churn_rate ?? 0}%</span></div>
    </section>
  `, meta));
}

async function renderAdminAuditLogs(meta, securityOnly = false) {
  const response = await apiRequest("/admin/audit-logs");
  const logs = response.data?.auditLogs || [];
  const visibleLogs = securityOnly ? logs.filter((log) => /auth|login|password|security|token/i.test(log.action || "")) : logs;
  setMain(adminLayout(`
    <section class="table-card stack">
      <div class="card-header"><div><h2>${securityOnly ? "Security logs" : "Audit logs"}</h2><p class="muted">Persisted operational events from MySQL.</p></div><span class="badge">${visibleLogs.length} records</span></div>
      ${visibleLogs.length ? `<div class="admin-list">${visibleLogs.map(renderAuditItem).join("")}</div>` : emptyState({ iconName: "fact_check", title: "No logs found", description: "Matching audit events will appear here when recorded.", actionLabel: "", actionHref: "" })}
    </section>
  `, meta));
}

function renderAdminSystem(meta) {
  setMain(adminLayout(`
    <section class="grid grid-3">
      ${summaryCard("Analytics", "monitoring", "Open metrics", "/admin/analytics")}
      ${summaryCard("Coupons", "sell", "Manage promotions", "/admin/coupons")}
      ${summaryCard("Audit Logs", "fact_check", "Review activity", "/admin/audit-logs")}
    </section>
    <section class="card stack">
      <h2>System controls</h2>
      <p class="muted">Operational controls are split into their own admin sections so the overview remains readable.</p>
    </section>
  `, meta));
}

function compactAdminList(items, renderItem, emptyConfig) {
  if (!items.length) return emptyState(emptyConfig);
  return `<div class="admin-compact-list">${items.map(renderItem).join("")}</div>`;
}

function chartRows(rows = [], labelKey = "label", valueKey = "value") {
  const max = Math.max(1, ...rows.map((row) => Number(row[valueKey] || row.count || 0)));
  return rows.map((row) => ({
    label: String(row[labelKey] || row.event_type || row.segment || ""),
    value: Number(row[valueKey] || row.count || 0),
    percent: Math.round((Number(row[valueKey] || row.count || 0) / max) * 100)
  }));
}

function lineChart(rows = [], valueFormatter = (value) => value) {
  const data = chartRows(rows);
  if (!data.length) return `<p class="muted">No chart data for this range.</p>`;
  const width = 520;
  const height = 160;
  const max = Math.max(1, ...data.map((row) => row.value));
  const points = data
    .map((row, index) => {
      const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
      const y = height - (row.value / max) * (height - 20) - 10;
      return `${x},${y}`;
    })
    .join(" ");
  return `<div class="chart-box"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Line chart"><polyline fill="none" stroke="#FF6E5C" stroke-width="4" points="${points}"></polyline></svg><div class="chart-legend">${data
    .slice(-4)
    .map((row) => `<span>${escapeHtml(row.label)}: ${escapeHtml(valueFormatter(row.value))}</span>`)
    .join("")}</div></div>`;
}

function barChart(rows = []) {
  const data = chartRows(rows);
  if (!data.length) return `<p class="muted">No event activity for this range.</p>`;
  return `<div class="stack-sm">${data
    .map(
      (row) =>
        `<div class="bar-row"><div class="card-header"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div><div class="meter-track"><span style="width:${row.percent}%"></span></div></div>`
    )
    .join("")}</div>`;
}

function pieLikeChart(rows = []) {
  const data = chartRows(rows, "segment");
  if (!data.length) return `<p class="muted">No user segment data yet.</p>`;
  const total = data.reduce((sum, row) => sum + row.value, 0) || 1;
  return `<div class="grid grid-2">${data
    .map((row) => {
      const percent = Math.round((row.value / total) * 100);
      return `<article class="card stack-sm"><h3>${escapeHtml(row.label)}</h3><strong>${percent}%</strong><div class="meter-track"><span style="width:${percent}%"></span></div><p class="muted">${escapeHtml(row.value)} users</p></article>`;
    })
    .join("")}</div>`;
}

function analyticsFilterValues() {
  const params = new URLSearchParams(location.search);
  return {
    startDate: params.get("startDate") || "",
    endDate: params.get("endDate") || ""
  };
}

function bindAnalyticsFilters() {
  document.querySelector("[data-analytics-filter]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const params = new URLSearchParams();
    if (values.startDate) params.set("startDate", values.startDate);
    if (values.endDate) params.set("endDate", values.endDate);
    window.history.pushState({}, "", `/admin/analytics${params.toString() ? `?${params}` : ""}`);
    state.path = normalizePath(location.pathname);
    renderAdminAnalytics();
  });
}

async function renderAdminAnalytics() {
  const meta = { title: "Analytics Dashboard", description: "Real user, revenue, AI usage, and behaviour metrics from MySQL." };
  const filters = analyticsFilterValues();
  const query = new URLSearchParams();
  if (filters.startDate) query.set("startDate", filters.startDate);
  if (filters.endDate) query.set("endDate", filters.endDate);
  setMain(adminLayout(loadingState("Loading analytics"), meta));
  try {
    const response = await apiRequest(`/admin/analytics${query.toString() ? `?${query}` : ""}`);
    const analytics = response.data?.analytics || {};
    const metrics = analytics.metrics || {};
    const charts = analytics.charts || {};
    const tables = analytics.tables || {};
    setMain(adminLayout(`
      <section class="card stack">
        <form class="form compact-form" data-analytics-filter>
          <div class="grid grid-3">
            <label>Start date<input name="startDate" type="date" value="${escapeHtml(filters.startDate)}"></label>
            <label>End date<input name="endDate" type="date" value="${escapeHtml(filters.endDate)}"></label>
            <div class="actions"><button class="btn btn-primary" type="submit">${icon("filter_alt")}Apply filters</button><a class="btn btn-secondary" href="/admin/analytics">Reset</a></div>
          </div>
        </form>
      </section>
      <section class="grid grid-4">
        ${summaryCard("Total Users", "groups", String(metrics.totalUsers ?? 0), "/admin/users")}
        ${summaryCard("Free Trial Users", "schedule", String(metrics.freeTrialUsers ?? 0), "/admin/subscriptions")}
        ${summaryCard("Paying Users", "workspace_premium", String(metrics.payingUsers ?? 0), "/admin/subscriptions")}
        ${summaryCard("Active 7 Days", "monitoring", String(metrics.activeUsersLast7Days ?? 0), "/admin/analytics")}
      </section>
      <section class="grid grid-3">
        ${summaryCard("Revenue", "payments", money(metrics.revenueNaira || 0), "/admin/payments")}
        ${summaryCard("AI Usage", "auto_awesome", String(metrics.aiUsageCount ?? 0), "/admin/ai-usage")}
        ${summaryCard("Trial to Paid", "trending_up", `${metrics.trialToPaidConversionRate ?? 0}%`, "/admin/analytics")}
      </section>
      <section class="grid grid-2">
        <article class="card stack"><h2>User Growth</h2>${lineChart(charts.userGrowth || [])}</article>
        <article class="card stack"><h2>Free vs Paid Users</h2>${pieLikeChart(charts.freeVsPaidUsers || [])}</article>
        <article class="card stack"><h2>Revenue Over Time</h2>${lineChart(charts.revenueOverTime || [], (value) => money(value))}</article>
        <article class="card stack"><h2>User Activity Events</h2>${barChart(charts.userActivityEvents || [])}</article>
      </section>
      <section class="grid grid-2">
        <article class="table-card stack"><h2>Recent Events</h2><div class="table-wrap"><table><thead><tr><th>Event</th><th>User</th><th>Entity</th><th>Time</th></tr></thead><tbody>${(tables.recentEvents || [])
          .map((event) => `<tr><td>${escapeHtml(event.event_type)}</td><td>${escapeHtml(event.email || "System")}</td><td>${escapeHtml([event.entity_type, event.entity_id].filter(Boolean).join(": ") || "-")}</td><td>${escapeHtml(new Date(event.created_at).toLocaleString())}</td></tr>`)
          .join("") || `<tr><td colspan="4">No events for this range.</td></tr>`}</tbody></table></div></article>
        <article class="table-card stack"><h2>Top Events</h2><div class="table-wrap"><table><thead><tr><th>Event</th><th>Count</th></tr></thead><tbody>${(tables.topEvents || [])
          .map((event) => `<tr><td>${escapeHtml(event.event_type)}</td><td>${escapeHtml(event.count)}</td></tr>`)
          .join("") || `<tr><td colspan="2">No event totals yet.</td></tr>`}</tbody></table></div></article>
      </section>
    `, meta));
    bindAnalyticsFilters();
  } catch {
    setMain(adminLayout(errorState("We could not load analytics"), meta));
  }
}

async function renderAdminCoupons() {
  const meta = { title: "Coupon Controls", description: "Create, disable, and monitor server-enforced promotional codes." };
  setMain(adminLayout(loadingState("Loading coupons"), meta));
  try {
    const response = await apiRequest("/admin/coupons");
    const coupons = response.data?.coupons || [];
    setMain(adminLayout(`
      <section class="grid grid-2">
        <article class="card stack">
          <h2>Create Coupon</h2>
          <form class="form" data-coupon-form novalidate>
            <div class="form-message" data-form-message hidden></div>
            <label>Code<input name="code" autocomplete="off" placeholder="Generated if blank"></label>
            <label>Discount type<select name="discountType"><option value="percentage">Percentage</option><option value="fixed">Fixed Naira</option></select></label>
            <label>Discount value<input name="discountValue" type="number" min="1" required></label>
            <label>Max uses<input name="maxUses" type="number" min="1"></label>
            <label>Expiry date<input name="expiryDate" type="datetime-local"></label>
            <button class="btn btn-primary" type="submit">${icon("add")}Create coupon</button>
          </form>
        </article>
        <article class="card stack">
          <h2>Promotion Safety</h2>
          <p class="muted">Discounts are recalculated on the backend during checkout. Full-discount totals skip OPay and activate access immediately.</p>
          <div class="actions"><span class="badge">One use per account</span><span class="badge">Rate limited</span><span class="badge">Admin only</span></div>
        </article>
      </section>
      <section class="table-card stack">
        <h2>Coupons</h2>
        <div class="table-wrap"><table><thead><tr><th>Code</th><th>Discount</th><th>Usage</th><th>Expiry</th><th>Status</th><th>Action</th></tr></thead><tbody>
          ${
            coupons.length
              ? coupons
                  .map((coupon) => {
                    const discount = coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : money(coupon.discount_value);
                    const usage = `${coupon.used_count || 0}${coupon.max_uses ? `/${coupon.max_uses}` : ""}`;
                    return `<tr><td>${escapeHtml(coupon.code)}</td><td>${discount}</td><td>${usage}</td><td>${coupon.expiry_date ? new Date(coupon.expiry_date).toLocaleString() : "No expiry"}</td><td><span class="badge ${coupon.is_active ? "badge-success" : "badge-warning"}">${coupon.is_active ? "Active" : "Disabled"}</span></td><td>${coupon.is_active ? `<button class="btn btn-secondary" data-disable-coupon="${escapeHtml(coupon.id)}" type="button">Disable</button>` : ""}</td></tr>`;
                  })
                  .join("")
              : `<tr><td colspan="6">No coupons created yet.</td></tr>`
          }
        </tbody></table></div>
      </section>
    `, meta));
    bindAdminCouponForm();
    bindDisableCouponButtons();
  } catch {
    setMain(adminLayout(errorState("We could not load coupon controls"), meta));
  }
}

function couponFormPayload(form) {
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  if (!payload.code) delete payload.code;
  if (!payload.maxUses) delete payload.maxUses;
  if (payload.expiryDate) payload.expiryDate = new Date(payload.expiryDate).toISOString();
  else delete payload.expiryDate;
  payload.discountValue = Number(payload.discountValue);
  if (payload.maxUses) payload.maxUses = Number(payload.maxUses);
  return payload;
}

function bindAdminCouponForm() {
  document.querySelector("[data-coupon-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitLoading(form, true);
    try {
      await apiRequest("/admin/coupons", { method: "POST", body: couponFormPayload(form) });
      showFormMessage(form, "success", "Coupon created.");
      window.setTimeout(() => rerenderCurrentRoute(), 500);
    } catch (error) {
      showFormMessage(form, "error", error.message || "Coupon could not be created.");
    } finally {
      setSubmitLoading(form, false);
    }
  });
}

function bindDisableCouponButtons() {
  document.querySelectorAll("[data-disable-coupon]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      await apiRequest(`/admin/coupons/${button.dataset.disableCoupon}/disable`, { method: "POST" });
      rerenderCurrentRoute();
    });
  });
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
  const budget = Number(dashboard.monthlyBudgetNaira || 0);
  const spend = Number(dashboard.monthlySpendNaira || 0);
  const budgetPercent = budget > 0 ? Math.min(100, Math.round((spend / budget) * 100)) : 0;
  const featureList = featureRows.length
    ? `<ul class="clean-list">${featureRows
        .slice(0, 5)
        .map((item) => `<li>${escapeHtml(item.feature_type || "unknown")}: ${money(item.cost_ngn)} across ${escapeHtml(item.requests)} requests</li>`)
        .join("")}</ul>`
    : `<p class="muted">No feature cost data yet.</p>`;
  const userList = topUsers.length
    ? `<ul class="clean-list">${topUsers
        .slice(0, 5)
        .map((item) => `<li>${escapeHtml(item.user_id || "anonymous")}: ${money(item.cost_ngn)} ${Number(item.blocked_requests || 0) ? `(${item.blocked_requests} blocked)` : ""}</li>`)
        .join("")}</ul>`
    : `<p class="muted">No top user data yet.</p>`;
  return `<article class="card stack"><div class="card-header"><div><h2>AI Cost Dashboard</h2><p class="muted">Gemini spend, cache efficiency, budget enforcement, and abuse signals.</p></div><span class="badge ${dashboard.emergencyThrottle ? "badge-error" : "badge-success"}">${dashboard.emergencyThrottle ? "Throttled" : "Active"}</span></div><div class="usage-meter"><div class="card-header"><div><p class="caption">Monthly Gemini budget</p><strong>${money(spend)} spent</strong></div><span class="badge">${budget ? `${budgetPercent}% of ${money(budget)}` : "No budget"}</span></div><div class="meter-track"><span style="width:${budgetPercent}%"></span></div></div><div class="grid grid-3">${metricTile("Forecast Burn", "trending_up", money(dashboard.forecastedBurnRateNaira || 0))}${metricTile("Cache Hit Rate", "cached", `${dashboard.cacheHitRate || 0}%`)}${metricTile("Blocked Requests", "block", String(summary.blocked_requests || 0))}</div><div class="grid grid-2"><div><h3>Cost Per Feature</h3>${featureList}</div><div><h3>Top AI Users</h3>${userList}</div></div></article>`;
}

function renderUserItem(user) {
  return `<article class="card stack"><h3>${escapeHtml([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User")}</h3><p class="muted">${escapeHtml(user.role || "Account")}</p></article>`;
}

function adminUserTable(users = []) {
  if (!users.length) {
    return emptyState({ iconName: "groups", title: "No users found", description: "User records will appear here when available.", actionLabel: "", actionHref: "" });
  }
  return `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>${users
    .map((user) => {
      const name = [user.firstName, user.lastName, user.first_name, user.last_name].filter(Boolean).slice(0, 2).join(" ") || user.email || "User";
      return `<tr><td><strong>${escapeHtml(name)}</strong></td><td>${escapeHtml(user.email || "")}</td><td>${escapeHtml(user.role || "Account")}</td><td><span class="badge ${String(user.status || "").toLowerCase() === "active" ? "badge-success" : ""}">${escapeHtml(user.status || "active")}</span></td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}

function renderAdminDoctorRow(doctor = {}) {
  const name = [doctor.firstName, doctor.lastName, doctor.first_name, doctor.last_name].filter(Boolean).slice(0, 2).join(" ") || doctor.name || doctor.email || "Doctor";
  const specialty = doctor.specialty || doctor.specialization || "Specialty not listed";
  const title = doctor.id ? `<a class="item-title" href="/doctor/${escapeHtml(doctor.id)}">${escapeHtml(name)}</a>` : escapeHtml(name);
  return `<article class="admin-row"><div class="admin-row-main"><h3>${title}</h3><p class="muted">${escapeHtml(specialty)}</p></div><span class="badge ${badgeClassForStatus(doctor.verificationStatus || doctor.verification_status || "verified")}">${escapeHtml(displayStatus(doctor.verificationStatus || doctor.verification_status || "verified"))}</span></article>`;
}

function renderAuditItem(log) {
  return `<article class="admin-row"><div class="admin-row-main"><h3>${escapeHtml(log.action || "Audit event")}</h3><p class="muted">${escapeHtml(log.createdAt || log.created_at || "Timestamp unavailable")}</p></div><span class="badge">${escapeHtml(log.entityType || log.entity_type || "event")}</span></article>`;
}

function renderCompactAuditItem(log) {
  return `<article class="admin-row"><div class="admin-row-main"><h3>${escapeHtml(log.action || "Audit event")}</h3><p class="muted">${escapeHtml(log.createdAt || log.created_at || "Timestamp unavailable")}</p></div><span class="badge">${escapeHtml(log.entityType || log.entity_type || "event")}</span></article>`;
}

function renderApplicationItem(application) {
  const name = [application.first_name, application.last_name].filter(Boolean).join(" ") || application.email || "Doctor applicant";
  return `<article class="admin-row"><div class="admin-row-main"><h3>${escapeHtml(name)}</h3><p class="muted">${escapeHtml(application.specialization || application.job_title || "Specialization not listed")}</p></div><span class="badge ${badgeClassForStatus(application.status)}">${escapeHtml(application.status || "PENDING")}</span></article>`;
}

function renderCompactApplicationItem(application) {
  const name = [application.first_name, application.last_name].filter(Boolean).join(" ") || application.email || "Doctor applicant";
  return `<article class="admin-row"><div class="admin-row-main"><h3>${escapeHtml(name)}</h3><p class="muted">${escapeHtml(application.specialization || application.job_title || "Specialization not listed")}</p></div><span class="badge ${badgeClassForStatus(application.status)}">${escapeHtml(application.status || "PENDING")}</span></article>`;
}
