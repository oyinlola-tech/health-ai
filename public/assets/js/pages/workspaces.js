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
  const meta = routeTitle("/admin");
  const tabs = ["Overview", "Users", "Doctors", "Doctor Applications", "Reports", "AI Usage", "Payments", "Subscriptions", "Security Logs", "Audit Logs", "System Settings"];
  setMain(`${pageHeader(meta)}${loadingState("Loading admin workspace")}`);
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
          <article class="card stack"><h2>Users</h2>${listCard(userItems, { iconName: "groups", title: "No users returned", description: "User records from the admin API are shown here.", actionLabel: "", actionHref: "" }, renderUserItem)}</article>
          <article class="card stack"><h2>Audit Logs</h2>${listCard(logItems, { iconName: "fact_check", title: "No audit logs returned", description: "Security and admin actions from the audit log are shown here.", actionLabel: "", actionHref: "" }, renderAuditItem)}</article>
          <article class="card stack"><h2>Doctor Applications</h2>${listCard(applicationItems, { iconName: "badge", title: "No applications returned", description: "Submitted doctor applications from the recruitment workflow are shown here.", actionLabel: "", actionHref: "" }, renderApplicationItem)}</article>
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

function renderApplicationItem(application) {
  const name = [application.first_name, application.last_name].filter(Boolean).join(" ") || application.email || "Doctor applicant";
  return `<article class="card stack"><div class="card-header"><div><h3>${escapeHtml(name)}</h3><p class="muted">${escapeHtml(application.specialization || application.job_title || "Specialization not listed")}</p></div><span class="badge ${badgeClassForStatus(application.status)}">${escapeHtml(application.status || "PENDING")}</span></div></article>`;
}

