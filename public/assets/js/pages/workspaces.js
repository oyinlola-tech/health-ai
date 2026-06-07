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
  const meta = routeTitle("/admin");
  const tabs = ["Overview", "Users", "Doctors", "Doctor Applications", "Reports", "AI Usage", "Payments", "Subscriptions", "Coupons", "Security Logs", "Audit Logs", "System Settings"];
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
  setMain(`${pageHeader(meta)}${loadingState("Loading analytics")}`);
  try {
    const response = await apiRequest(`/admin/analytics${query.toString() ? `?${query}` : ""}`);
    const analytics = response.data?.analytics || {};
    const metrics = analytics.metrics || {};
    const charts = analytics.charts || {};
    const tables = analytics.tables || {};
    setMain(`
      ${pageHeader(meta)}
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
    `);
    bindAnalyticsFilters();
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load analytics")}`);
  }
}

async function renderAdminCoupons() {
  const meta = { title: "Coupon Controls", description: "Create, disable, and monitor server-enforced promotional codes." };
  setMain(`${pageHeader(meta)}${loadingState("Loading coupons")}`);
  try {
    const response = await apiRequest("/admin/coupons");
    const coupons = response.data?.coupons || [];
    setMain(`
      ${pageHeader(meta)}
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
    `);
    bindAdminCouponForm();
    bindDisableCouponButtons();
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load coupon controls")}`);
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

function renderAuditItem(log) {
  return `<article class="card stack"><h3>${escapeHtml(log.action || "Audit event")}</h3><p class="muted">${escapeHtml(log.createdAt || "Timestamp unavailable")}</p></article>`;
}

function renderApplicationItem(application) {
  const name = [application.first_name, application.last_name].filter(Boolean).join(" ") || application.email || "Doctor applicant";
  return `<article class="card stack"><div class="card-header"><div><h3>${escapeHtml(name)}</h3><p class="muted">${escapeHtml(application.specialization || application.job_title || "Specialization not listed")}</p></div><span class="badge ${badgeClassForStatus(application.status)}">${escapeHtml(application.status || "PENDING")}</span></div></article>`;
}
