/**
 * @file Premium doctor and admin operations workspaces.
 * @module assets/js/pages/workspaces.js
 */

const operationEmptyCopy = {
  users: ["Account intelligence is ready", "As verified user activity arrives, this view will organize records, roles, and account posture for review."],
  doctors: ["Doctor operations are ready", "Approved clinicians, verification status, and care capacity will appear here after backend records are available."],
  reports: ["Report operations are ready", "Uploaded medical reports will populate this queue with processing status, confidence, and review actions."],
  payments: ["Revenue records are ready", "Completed payments, refunds, and failed charge attempts will appear here from the billing system."],
  logs: ["Control-plane activity is ready", "Audit activity will appear here as platform actions are recorded."],
  recruitment: ["Recruitment intake is ready", "Doctor applications will appear here after candidates submit the careers workflow."],
  support: ["Support queue is ready", "Support signals are assembled from notifications, audit activity, and account events as they arrive."],
  ai: ["AI operations are ready", "Gemini usage, blocked requests, and cache performance will appear after model activity is recorded."],
  subscriptions: ["Subscription controls are ready", "Plan adoption and subscription health will appear here from the billing system."],
  coupons: ["Promotion controls are ready", "Create the first code when the growth team is ready to run a server-enforced campaign."],
  doctorAppointments: ["No appointments scheduled", "Upcoming consultations will appear here when patients book with you."],
  doctorQueue: ["Patient queue is clear", "Patients with active appointments or shared reports will appear here when care is assigned."],
  doctorReports: ["No reports assigned", "Shared patient reports will appear here after consent and appointment access are confirmed."],
  doctorConsultations: ["No active consultations", "Patient conversations will appear here when consultation rooms are opened."],
  doctorMessages: ["No patient messages", "Messages from consultation rooms will appear here when patients contact you."],
  doctorProfile: ["Profile workspace is ready", "Use this area to keep your public clinical details clear and trustworthy."],
  doctorVerification: ["Verification status is ready", "Credential updates and verification decisions will appear here when available."],
  doctorAnalytics: ["Analytics will appear with activity", "Care volume and response patterns will populate after appointments and messages are recorded."]
};

const adminSections = [
  { label: "Executive Overview", href: "/admin", icon: "space_dashboard", group: "Command" },
  { label: "Revenue", href: "/admin/revenue", icon: "monitoring", group: "Analytics" },
  { label: "User Analytics", href: "/admin/user-analytics", icon: "groups", group: "Analytics" },
  { label: "Doctor Operations", href: "/admin/doctor-operations", icon: "stethoscope", group: "Operations" },
  { label: "AI Operations", href: "/admin/ai-operations", icon: "auto_awesome", group: "Operations" },
  { label: "Security Center", href: "/admin/security", icon: "shield_lock", group: "Trust" },
  { label: "Compliance Center", href: "/admin/compliance", icon: "policy", group: "Trust" },
  { label: "Subscription Management", href: "/admin/subscriptions", icon: "workspace_premium", group: "Business" },
  { label: "Coupon Management", href: "/admin/coupons", icon: "sell", group: "Business" },
  { label: "Recruitment", href: "/admin/recruitment", icon: "badge", group: "Operations" },
  { label: "Support Center", href: "/admin/support", icon: "support_agent", group: "Operations" },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: "receipt_long", group: "Trust" },
  { label: "System Health", href: "/admin/system-health", icon: "dns", group: "Command" }
];

const adminRouteAliases = new Map([
  ["/admin/analytics", "/admin/user-analytics"],
  ["/admin/users", "/admin/user-analytics"],
  ["/admin/doctors", "/admin/doctor-operations"],
  ["/admin/doctor-applications", "/admin/recruitment"],
  ["/admin/reports", "/admin/system-health"],
  ["/admin/ai-usage", "/admin/ai-operations"],
  ["/admin/payments", "/admin/revenue"],
  ["/admin/security-logs", "/admin/security"],
  ["/admin/system", "/admin/system-health"],
  ["/admin/system-settings", "/admin/system-health"],
  ["/admin/jobs", "/admin/recruitment"]
]);

const doctorSections = [
  { label: "Clinical Overview", href: "/doctor", icon: "space_dashboard" },
  { label: "Patient Queue", href: "/doctor/patient-queue", icon: "groups" },
  { label: "Appointments", href: "/doctor/appointments", icon: "calendar_month" },
  { label: "Consultations", href: "/doctor/consultations", icon: "forum" },
  { label: "Medical Reports", href: "/doctor/medical-reports", icon: "description" },
  { label: "Messages", href: "/doctor/messages", icon: "chat" },
  { label: "Profile", href: "/doctor/profile", icon: "account_circle" },
  { label: "Verification Status", href: "/doctor/verification-status", icon: "verified_user" },
  { label: "Analytics", href: "/doctor/analytics", icon: "monitoring" },
  { label: "Settings", href: "/doctor/settings", icon: "settings" }
];

async function renderDoctorDashboard() {
  const route = normalizePath(state.path);
  const meta = { title: "Doctor operations", description: "A focused clinical command center for patient flow, reports, messages, and availability." };
  setMain(DoctorLayout(SkeletonLoader("Preparing doctor operations"), meta));
  const context = await loadDoctorContext();
  const section = doctorSections.find((item) => item.href === route) || doctorSections[0];
  setMain(DoctorLayout(renderDoctorSection(section, context), { title: section.label, description: meta.description }));
  bindDoctorWorkspaceActions();
}

async function renderAdminDashboard() {
  const route = adminRouteAliases.get(normalizePath(state.path)) || normalizePath(state.path);
  const section = adminSections.find((item) => item.href === route) || adminSections[0];
  const meta = { title: section.label };
  setMain(AdminLayout(SkeletonLoader(`Preparing ${section.label.toLowerCase()}`), meta));
  const context = await loadAdminContext(section.href);
  setMain(AdminLayout(renderAdminSection(section.href, context), meta));
  bindOperationsControls();
  if (section.href === "/admin/coupons") bindAdminCouponForm();
}

async function loadDoctorContext() {
  const [appointments, reports, consultations] = await Promise.allSettled([
    apiRequest("/doctor/appointments"),
    apiRequest("/doctor/reports"),
    apiRequest("/consultations")
  ]);
  return {
    appointments: appointments.value?.data?.appointments || [],
    reports: reports.value?.data?.reports || [],
    consultations: consultations.value?.data?.consultations || []
  };
}

async function loadAdminContext(sectionHref) {
  const requests = [
    apiRequest("/admin/users"),
    apiRequest("/admin/audit-logs"),
    apiRequest("/admin/reports/processing-metrics"),
    apiRequest("/admin/monetization"),
    apiRequest("/admin/ai-costs"),
    apiRequest("/recruitment/applications"),
    apiRequest("/doctors")
  ];
  if (sectionHref === "/admin/user-analytics") requests.push(apiRequest(`/admin/analytics${location.search || ""}`));
  if (sectionHref === "/admin/coupons") requests.push(apiRequest("/admin/coupons"));
  const [users, logs, reportMetrics, monetization, aiCosts, applications, doctors, analytics, coupons] = await Promise.allSettled(requests);
  return {
    users: users.value?.data?.users || [],
    logs: logs.value?.data?.auditLogs || [],
    reportMetrics: reportMetrics.value?.data?.metrics || {},
    monetization: monetization.value?.data?.metrics || {},
    ai: aiCosts.value?.data?.dashboard || {},
    applications: applications.value?.data?.applications || [],
    doctors: doctors.value?.data?.doctors || [],
    analytics: analytics?.value?.data?.analytics || {},
    coupons: coupons?.value?.data?.coupons || []
  };
}

function AdminLayout(content, meta) {
  return OperationsLayout({
    className: "admin-workspace",
    navLabel: "Admin operations",
    navItems: adminSections,
    meta,
    content
  });
}

function DoctorLayout(content, meta) {
  return OperationsLayout({
    className: "doctor-workspace",
    navLabel: "Doctor operations",
    navItems: doctorSections,
    meta,
    content
  });
}

function OperationsLayout({ className, navLabel, navItems, meta, content }) {
  const groups = [...new Set(navItems.map((item) => item.group || "Workspace"))];
  return `
    <section class="ops-shell ${className}">
      <aside class="ops-sidebar" aria-label="${escapeHtml(navLabel)}">
        ${groups
          .map(
            (group) => `<div class="ops-nav-group"><p>${escapeHtml(group)}</p>${navItems
              .filter((item) => (item.group || "Workspace") === group)
              .map((item) => OpsNavLink(item))
              .join("")}</div>`
          )
          .join("")}
      </aside>
      <div class="ops-main stack-lg">
        ${content}
      </div>
    </section>
  `;
}

function OpsNavLink(item) {
  return `<a class="ops-nav-link" href="${item.href}"${isActive(item.href) ? ' aria-current="page"' : ""}>${icon(item.icon)}<span>${escapeHtml(item.label)}</span></a>`;
}

function renderAdminSection(route, context) {
  const shared = adminSharedMetrics(context);
  if (route === "/admin") return renderExecutiveOverview(context, shared);
  if (route === "/admin/revenue") return renderRevenueAnalytics(context);
  if (route === "/admin/user-analytics") return renderUserAnalytics(context);
  if (route === "/admin/doctor-operations") return renderDoctorOperations(context);
  if (route === "/admin/ai-operations") return renderAiOperations(context);
  if (route === "/admin/security") return renderSecurityCenter(context);
  if (route === "/admin/compliance") return renderComplianceCenter(context);
  if (route === "/admin/subscriptions") return renderSubscriptionManagement(context);
  if (route === "/admin/coupons") return renderCouponManagement(context);
  if (route === "/admin/recruitment") return renderRecruitment(context);
  if (route === "/admin/support") return renderSupportCenter(context);
  if (route === "/admin/audit-logs") return renderAuditLogs(context);
  if (route === "/admin/system-health") return renderSystemHealth(context);
  return EmptyState("map", "Choose an operations section", "The navigation contains the complete admin command surface.", [{ label: "Open overview", href: "/admin" }]);
}

function renderExecutiveOverview(context, shared) {
  return `
    ${MetricGrid([
      StatCard("Revenue", money(shared.revenue), "Monthly billing", "payments", shared.failedPayments ? "Review failures" : "Stable"),
      StatCard("Users", shared.users, "Total accounts", "groups", `${shared.doctors} doctors`),
      StatCard("AI Requests", shared.aiRequests, "Model workload", "auto_awesome", `${shared.blockedAi} blocked`),
      StatCard("System", shared.failedReports, "Failed extractions", "dns", shared.failedReports ? "Needs review" : "Healthy")
    ])}
    <section class="ops-grid ops-grid-2">
      ${AnalyticsCard("Revenue trajectory", "Billing movement from monetization records.", TrendChart([{ label: "Revenue", value: shared.revenue }, { label: "Failed", value: shared.failedPayments }, { label: "Refunds", value: Number(context.monetization.refunds || 0) }]), [{ label: "Open revenue", href: "/admin/revenue" }])}
      ${AnalyticsCard("AI operating load", "Request volume, cache efficiency, and blocked activity.", TrendChart([{ label: "Requests", value: shared.aiRequests }, { label: "Blocked", value: shared.blockedAi }, { label: "Cache", value: Number(context.ai.cacheHitRate || 0) }]), [{ label: "Open AI operations", href: "/admin/ai-operations" }])}
    </section>
    <section class="ops-grid ops-grid-2">
      ${ActivityTimeline("Executive activity", context.logs.slice(0, 6), "logs")}
      ${DataTable({
        title: "Priority queues",
        description: "Operational queues assembled from real platform records.",
        rows: [
          { area: "Doctor applications", count: context.applications.length, owner: "Recruitment" },
          { area: "Audit events", count: context.logs.length, owner: "Security" },
          { area: "Doctor directory", count: context.doctors.length, owner: "Clinical ops" },
          { area: "User accounts", count: context.users.length, owner: "Support" }
        ],
        columns: [["area", "Queue"], ["count", "Records"], ["owner", "Owner"]],
        searchKey: "area",
        emptyKey: "support",
        actions: [{ label: "System health", href: "/admin/system-health" }]
      })}
    </section>
  `;
}

function renderRevenueAnalytics(context) {
  const revenue = context.monetization;
  const rows = [
    { metric: "Monthly revenue", value: money(revenue.monthly_revenue_cents || 0), status: "Tracked" },
    { metric: "Failed payments", value: Number(revenue.failed_payments || 0), status: Number(revenue.failed_payments || 0) ? "Review" : "Stable" },
    { metric: "Refunds", value: Number(revenue.refunds || 0), status: "Controlled" },
    { metric: "Refund rate", value: `${revenue.refund_rate || 0}%`, status: "Measured" }
  ];
  return SectionScaffold({
    stats: [
      StatCard("Monthly Revenue", money(revenue.monthly_revenue_cents || 0), "Collected this period", "payments", "Billing"),
      StatCard("Failed Payments", Number(revenue.failed_payments || 0), "Requires recovery", "credit_card_off", "Risk"),
      StatCard("Refund Rate", `${revenue.refund_rate || 0}%`, "Customer reversals", "undo", "Quality"),
      StatCard("Active Subscribers", Number(revenue.active_subscribers || 0), "Current premium base", "workspace_premium", "Growth")
    ],
    chart: AnalyticsCard("Revenue quality", "Billing health from real monetization records.", TrendChart(rows.map((row) => ({ label: row.metric, value: Number(String(row.value).replace(/\D/g, "")) || 0 }))), [{ label: "Subscriptions", href: "/admin/subscriptions" }]),
    table: DataTable({ title: "Revenue ledger", description: "Financial posture summarized by the backend.", rows, columns: [["metric", "Metric"], ["value", "Value"], ["status", "Status"]], searchKey: "metric", emptyKey: "payments", actions: [{ label: "Billing center", href: "/admin/revenue" }] })
  });
}

function renderUserAnalytics(context) {
  const users = context.users;
  const analytics = context.analytics;
  const metrics = analytics.metrics || {};
  const rows = users.map((user) => ({
    name: accountName(user),
    email: user.email || "",
    role: user.role || "Account",
    status: displayStatus(user.status || "active")
  }));
  return SectionScaffold({
    stats: [
      StatCard("Total Users", metrics.totalUsers ?? users.length, "Registered accounts", "groups", "Identity"),
      StatCard("Paying Users", metrics.payingUsers ?? 0, "Premium accounts", "workspace_premium", "Revenue"),
      StatCard("Trial Users", metrics.freeTrialUsers ?? 0, "Evaluation cohort", "schedule", "Activation"),
      StatCard("Active 7 Days", metrics.activeUsersLast7Days ?? 0, "Recent behavior", "monitoring", "Usage")
    ],
    chart: AnalyticsCard("User mix", "Role and subscription segmentation.", SegmentChart([{ label: "Patients", value: roleCount(users, "patient") }, { label: "Doctors", value: roleCount(users, "doctor") }, { label: "Admins", value: roleCount(users, "admin") }]), [{ label: "Apply date filters", href: "/admin/user-analytics" }]),
    table: DataTable({ title: "Account directory", description: "Searchable users from the admin API.", rows, columns: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["status", "Status"]], searchKey: "email", emptyKey: "users", actions: [{ label: "Support center", href: "/admin/support" }] })
  });
}

function renderDoctorOperations(context) {
  const rows = context.doctors.map((doctor) => ({
    name: doctorName(doctor),
    specialty: doctor.specialty || doctor.specialization || "Profile review",
    status: displayStatus(doctor.verificationStatus || doctor.verification_status || "verified"),
    action: doctor.id ? `<a class="item-title" href="/doctor/${escapeHtml(doctor.id)}">Open</a>` : "Review"
  }));
  return SectionScaffold({
    stats: [
      StatCard("Doctors", context.doctors.length, "Directory records", "stethoscope", "Clinical"),
      StatCard("Applications", context.applications.length, "Recruitment intake", "badge", "Pipeline"),
      StatCard("Verified", rows.filter((row) => /verified|active/i.test(row.status)).length, "Approved clinicians", "verified_user", "Trust"),
      StatCard("Patient Queue", context.reportMetrics.reports_processed || 0, "Report workload", "groups", "Care")
    ],
    chart: AnalyticsCard("Clinical capacity", "Doctor directory, recruitment, and report workload.", TrendChart([{ label: "Doctors", value: context.doctors.length }, { label: "Applicants", value: context.applications.length }, { label: "Reports", value: Number(context.reportMetrics.reports_processed || 0) }]), [{ label: "Recruitment", href: "/admin/recruitment" }]),
    table: DataTable({ title: "Doctor directory", description: "Operational view of clinician records.", rows, columns: [["name", "Doctor"], ["specialty", "Specialty"], ["status", "Status"], ["action", "Action"]], searchKey: "name", emptyKey: "doctors", actions: [{ label: "Create doctor", href: "/admin/doctor-operations" }] })
  });
}

function renderAiOperations(context) {
  const summary = context.ai.summary || {};
  const costs = context.ai.costs || {};
  const modelRows = costs.modelUsageBreakdown || [];
  const rows = modelRows.map((item) => ({
    model: item.model_used || "unassigned",
    requests: item.requests || 0,
    tokens: item.tokens || 0,
    cost: money(item.cost_ngn || 0),
    status: item.failovers > 0 ? `${item.failovers} failovers` : `${item.cache_hits || 0} cache hits`
  }));
  return SectionScaffold({
    stats: [
      StatCard("Requests", summary.total_requests || 0, "Model workload", "auto_awesome", "Gemini"),
      StatCard("Tokens", summary.total_tokens || 0, "Prompt and completion", "data_usage", "Usage"),
      StatCard("Cache Hit", `${context.ai.cacheHitRate || 0}%`, "Reuse efficiency", "cached", "Cost"),
      StatCard("RAG Hit", `${context.ai.ragHitRate || 0}%`, "Grounding confidence", "manage_search", `${summary.failovers || 0} failovers`)
    ],
    chart: AnalyticsCard("AI platform health", "Requests, cache reuse, RAG grounding, and failover activity.", TrendChart([{ label: "Requests", value: Number(summary.total_requests || 0) }, { label: "Cache", value: Number(context.ai.cacheHitRate || 0) }, { label: "RAG", value: Number(context.ai.ragHitRate || 0) }, { label: "Failovers", value: Number(summary.failovers || 0) }]), [{ label: "System health", href: "/admin/system-health" }]),
    table: DataTable({ title: "Requests per model", description: "Model usage, token load, estimated cost, cache reuse, and failovers.", rows, columns: [["model", "Model"], ["requests", "Requests"], ["tokens", "Tokens"], ["cost", "Cost"], ["status", "Status"]], searchKey: "model", emptyKey: "ai", actions: [{ label: "AI diagnostics", href: "/admin/system-health" }] })
  });
}

function renderSecurityCenter(context) {
  const securityLogs = context.logs.filter((log) => /auth|login|password|token|security|role|permission/i.test(log.action || ""));
  return SectionScaffold({
    stats: [
      StatCard("Security Events", securityLogs.length, "Auth-sensitive logs", "shield_lock", "Review"),
      StatCard("Admin Accounts", roleCount(context.users, "admin"), "Privileged users", "admin_panel_settings", "Access"),
      StatCard("Password Events", securityLogs.filter((log) => /password/i.test(log.action || "")).length, "Credential changes", "key", "Identity"),
      StatCard("Audit Coverage", context.logs.length, "Recorded events", "receipt_long", "Evidence")
    ],
    chart: AnalyticsCard("Security activity", "Sensitive operational events by category.", SegmentChart([{ label: "Auth", value: securityLogs.filter((log) => /auth|login/i.test(log.action || "")).length }, { label: "Password", value: securityLogs.filter((log) => /password/i.test(log.action || "")).length }, { label: "Other", value: Math.max(0, securityLogs.length) }]), [{ label: "Audit logs", href: "/admin/audit-logs" }]),
    table: DataTable({ title: "Security review queue", description: "Filtered audit activity with security-sensitive actions.", rows: logRows(securityLogs), columns: [["action", "Action"], ["actor", "Actor"], ["entity", "Entity"], ["time", "Time"]], searchKey: "action", emptyKey: "logs", actions: [{ label: "Open audit logs", href: "/admin/audit-logs" }] })
  });
}

function renderComplianceCenter(context) {
  const rows = [
    { control: "Audit events", evidence: context.logs.length, status: context.logs.length ? "Evidence captured" : "Awaiting activity" },
    { control: "User accounts", evidence: context.users.length, status: "Identity records" },
    { control: "Doctor verification", evidence: context.doctors.length, status: "Clinical governance" },
    { control: "Report processing", evidence: context.reportMetrics.reports_processed || 0, status: "Processing trail" }
  ];
  return SectionScaffold({
    stats: [
      StatCard("Controls", rows.length, "Tracked areas", "policy", "Compliance"),
      StatCard("Audit Evidence", context.logs.length, "Operational records", "receipt_long", "Traceability"),
      StatCard("Doctors", context.doctors.length, "Verified care network", "verified_user", "Governance"),
      StatCard("Reports", context.reportMetrics.reports_processed || 0, "Processing evidence", "description", "Records")
    ],
    chart: AnalyticsCard("Evidence coverage", "Compliance evidence by operational control.", TrendChart(rows.map((row) => ({ label: row.control, value: Number(row.evidence || 0) }))), [{ label: "Security center", href: "/admin/security" }]),
    table: DataTable({ title: "Compliance controls", description: "Evidence-oriented control surface for operations review.", rows, columns: [["control", "Control"], ["evidence", "Evidence"], ["status", "Status"]], searchKey: "control", emptyKey: "logs", actions: [{ label: "Review audit trail", href: "/admin/audit-logs" }] })
  });
}

function renderSubscriptionManagement(context) {
  const revenue = context.monetization;
  const rows = [
    { plan: "Active subscribers", count: revenue.active_subscribers || 0, status: "Live" },
    { plan: "Trial accounts", count: context.analytics.metrics?.freeTrialUsers || 0, status: "Evaluating" },
    { plan: "Paying accounts", count: context.analytics.metrics?.payingUsers || 0, status: "Converted" },
    { plan: "Churn rate", count: `${revenue.churn_rate || 0}%`, status: "Measured" }
  ];
  return SectionScaffold({
    stats: [
      StatCard("Active Subscribers", revenue.active_subscribers || 0, "Premium base", "workspace_premium", "Plan"),
      StatCard("Churn Rate", `${revenue.churn_rate || 0}%`, "Retention signal", "trending_down", "Risk"),
      StatCard("Revenue", money(revenue.monthly_revenue_cents || 0), "Subscription income", "payments", "Billing"),
      StatCard("Failed Payments", revenue.failed_payments || 0, "Recovery queue", "credit_card_off", "Action")
    ],
    chart: AnalyticsCard("Subscriber health", "Plan posture and retention signals.", TrendChart(rows.map((row) => ({ label: row.plan, value: Number(String(row.count).replace(/\D/g, "")) || 0 }))), [{ label: "Revenue analytics", href: "/admin/revenue" }]),
    table: DataTable({ title: "Subscription ledger", description: "Backend subscription and monetization summary.", rows, columns: [["plan", "Segment"], ["count", "Count"], ["status", "Status"]], searchKey: "plan", emptyKey: "subscriptions", actions: [{ label: "Coupon controls", href: "/admin/coupons" }] })
  });
}

function renderCouponManagement(context) {
  const coupons = context.coupons.map((coupon) => ({
    code: coupon.code,
    discount: coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : money(coupon.discount_value || 0),
    usage: `${coupon.used_count || 0}${coupon.max_uses ? `/${coupon.max_uses}` : ""}`,
    status: coupon.is_active ? "Active" : "Disabled"
  }));
  return `
    ${MetricGrid([
      StatCard("Coupons", coupons.length, "Promotion records", "sell", "Growth"),
      StatCard("Active", coupons.filter((coupon) => coupon.status === "Active").length, "Enabled campaigns", "check_circle", "Live"),
      StatCard("Used", context.coupons.reduce((sum, coupon) => sum + Number(coupon.used_count || 0), 0), "Redemptions", "redeem", "Usage"),
      StatCard("Revenue Guard", "Server", "Discount validation", "shield_lock", "Safe")
    ])}
    <section class="ops-grid ops-grid-2">
      ${AnalyticsCard("Create coupon", "Discounts are validated on the backend during checkout.", CouponForm(), [])}
      ${AnalyticsCard("Campaign activity", "Usage and status across active promotion codes.", TrendChart(coupons.map((coupon) => ({ label: coupon.code, value: Number(String(coupon.usage).split("/")[0] || 0) }))), [{ label: "Coupon registry", href: "/admin/coupons" }])}
    </section>
    ${DataTable({ title: "Coupon registry", description: "Promotion codes returned by the admin coupon API.", rows: coupons, columns: [["code", "Code"], ["discount", "Discount"], ["usage", "Usage"], ["status", "Status"]], searchKey: "code", emptyKey: "coupons", actions: [{ label: "Revenue analytics", href: "/admin/revenue" }] })}
  `;
}

function renderRecruitment(context) {
  const rows = context.applications.map((application) => ({
    candidate: [application.first_name, application.last_name].filter(Boolean).join(" ") || application.email || "Doctor candidate",
    specialty: application.specialization || application.job_title || "Clinical review",
    status: displayStatus(application.status || "pending"),
    submitted: formatDate(application.created_at || application.createdAt)
  }));
  return SectionScaffold({
    stats: [
      StatCard("Applications", rows.length, "Candidate records", "badge", "Recruiting"),
      StatCard("Doctors", context.doctors.length, "Approved network", "stethoscope", "Capacity"),
      StatCard("Pending Review", rows.filter((row) => /pending|review/i.test(row.status)).length, "Recruitment queue", "hourglass", "Action"),
      StatCard("Verified", context.doctors.length, "Credentialed clinicians", "verified_user", "Trust")
    ],
    chart: AnalyticsCard("Recruitment pipeline", "Applications, reviewed candidates, and approved doctors.", SegmentChart([{ label: "Applications", value: rows.length }, { label: "Approved doctors", value: context.doctors.length }, { label: "Pending", value: rows.filter((row) => /pending|review/i.test(row.status)).length }]), [{ label: "Doctor operations", href: "/admin/doctor-operations" }]),
    table: DataTable({ title: "Candidate review", description: "Submitted doctor applications from the recruitment workflow.", rows, columns: [["candidate", "Candidate"], ["specialty", "Specialty"], ["status", "Status"], ["submitted", "Submitted"]], searchKey: "candidate", emptyKey: "recruitment", actions: [{ label: "Doctor careers", href: "/doctor-careers" }] })
  });
}

function renderSupportCenter(context) {
  const rows = [
    ...context.users.slice(0, 12).map((user) => ({ request: accountName(user), type: user.role || "Account", status: displayStatus(user.status || "active"), owner: "Support" })),
    ...context.logs.slice(0, 8).map((log) => ({ request: log.action || "Audit event", type: log.entity_type || log.entityType || "Event", status: "Review", owner: "Operations" }))
  ];
  return SectionScaffold({
    stats: [
      StatCard("Support Signals", rows.length, "Accounts and events", "support_agent", "Queue"),
      StatCard("Users", context.users.length, "Accounts", "groups", "Identity"),
      StatCard("Recent Events", context.logs.length, "Audit activity", "receipt_long", "Context"),
      StatCard("Doctors", context.doctors.length, "Clinical contacts", "stethoscope", "Care")
    ],
    chart: AnalyticsCard("Support mix", "Account and operational signals routed into support review.", SegmentChart([{ label: "Accounts", value: context.users.length }, { label: "Events", value: context.logs.length }, { label: "Doctors", value: context.doctors.length }]), [{ label: "User analytics", href: "/admin/user-analytics" }]),
    table: DataTable({ title: "Support workbench", description: "Searchable support-relevant records from real platform data.", rows, columns: [["request", "Record"], ["type", "Type"], ["status", "Status"], ["owner", "Owner"]], searchKey: "request", emptyKey: "support", actions: [{ label: "Contact page", href: "/contact" }] })
  });
}

function renderAuditLogs(context) {
  return SectionScaffold({
    stats: [
      StatCard("Audit Logs", context.logs.length, "Recorded events", "receipt_long", "Evidence"),
      StatCard("Actors", new Set(context.logs.map((log) => log.actor_id || log.actorId).filter(Boolean)).size, "Unique actors", "person_search", "Identity"),
      StatCard("Entities", new Set(context.logs.map((log) => log.entity_type || log.entityType).filter(Boolean)).size, "Touched areas", "schema", "Scope"),
      StatCard("Security", context.logs.filter((log) => /auth|password|login/i.test(log.action || "")).length, "Sensitive events", "shield_lock", "Review")
    ],
    chart: AnalyticsCard("Audit distribution", "Control-plane activity by event type.", SegmentChart([{ label: "Auth", value: context.logs.filter((log) => /auth|login/i.test(log.action || "")).length }, { label: "Admin", value: context.logs.filter((log) => /admin/i.test(log.action || "")).length }, { label: "Other", value: context.logs.length }]), [{ label: "Security center", href: "/admin/security" }]),
    table: DataTable({ title: "Event history", description: "Search and filter persisted audit logs.", rows: logRows(context.logs), columns: [["action", "Action"], ["actor", "Actor"], ["entity", "Entity"], ["time", "Time"]], searchKey: "action", emptyKey: "logs", actions: [{ label: "Compliance center", href: "/admin/compliance" }] })
  });
}

function renderSystemHealth(context) {
  const metrics = context.reportMetrics;
  const rows = [
    { system: "Report processing", value: metrics.reports_processed || 0, status: Number(metrics.failed_extractions || 0) ? "Review" : "Healthy" },
    { system: "OCR failure rate", value: `${metrics.ocr_failure_rate || 0}%`, status: Number(metrics.ocr_failure_rate || 0) > 10 ? "Review" : "Healthy" },
    { system: "Average confidence", value: `${metrics.average_confidence || 0}%`, status: "Measured" },
    { system: "AI throttle", value: context.ai.emergencyThrottle ? "Enabled" : "Clear", status: context.ai.emergencyThrottle ? "Review" : "Healthy" }
  ];
  return SectionScaffold({
    stats: [
      StatCard("Reports Processed", metrics.reports_processed || 0, "Extraction workload", "description", "Pipeline"),
      StatCard("Failed Extractions", metrics.failed_extractions || 0, "Review queue", "report_problem", "Quality"),
      StatCard("OCR Failure", `${metrics.ocr_failure_rate || 0}%`, "Document scan risk", "document_scanner", "OCR"),
      StatCard("Confidence", `${metrics.average_confidence || 0}%`, "Average extraction", "verified", "Quality")
    ],
    chart: AnalyticsCard("Infrastructure posture", "Processing quality and AI operating controls.", TrendChart(rows.map((row) => ({ label: row.system, value: Number(String(row.value).replace(/\D/g, "")) || 0 }))), [{ label: "AI operations", href: "/admin/ai-operations" }]),
    table: DataTable({ title: "System checks", description: "Operational readiness from backend health metrics.", rows, columns: [["system", "System"], ["value", "Value"], ["status", "Status"]], searchKey: "system", emptyKey: "reports", actions: [{ label: "Health center", href: "/admin/system-health" }] })
  });
}

function renderDoctorSection(section, context) {
  if (section.href === "/doctor") return renderDoctorOverview(context);
  if (section.href === "/doctor/settings") return AvailabilityCard();

  const config = doctorSectionConfig(section.href, section.label);
  if (config.bodyOnly) return AnalyticsCard(config.title, config.description, config.summary(context), config.actions);
  return `
    ${AnalyticsCard(config.title, config.description, config.summary(context), config.actions)}
    ${DataTable({
      title: config.tableTitle,
      description: config.tableDescription,
      rows: config.rows(context),
      columns: config.columns,
      searchKey: config.searchKey,
      emptyKey: config.emptyKey,
      actions: config.actions
    })}
  `;
}

function renderDoctorOverview(context) {
  const upcoming = doctorRowsFor("/doctor/appointments", context).slice(0, 5);
  const reports = doctorRowsFor("/doctor/medical-reports", context).slice(0, 5);
  return `
    <section class="metric-grid doctor-focus-grid">
      ${StatCard("Today", context.appointments.length, "Scheduled appointments", "calendar_month", "Care")}
      ${StatCard("Reports", context.reports.length, "Ready for review", "clinical_notes", "Review")}
      ${StatCard("Messages", context.consultations.length, "Open consultation threads", "forum", "Clinical")}
    </section>
    <section class="ops-grid ops-grid-2">
      ${DataTable({ title: "Upcoming care", description: "Appointments that need your attention next.", rows: upcoming, columns: [["name", "Patient"], ["detail", "Reason"], ["status", "Status"], ["time", "Time"]], searchKey: "name", emptyKey: "doctorAppointments", actions: [{ label: "Appointments", href: "/doctor/appointments" }] })}
      ${DataTable({ title: "Reports to review", description: "Patient reports shared with your clinical workspace.", rows: reports, columns: [["name", "Report"], ["detail", "Status"], ["time", "Updated"]], searchKey: "name", emptyKey: "doctorReports", actions: [{ label: "Medical reports", href: "/doctor/medical-reports" }] })}
    </section>
  `;
}

function doctorSectionConfig(route, fallbackTitle) {
  const configs = {
    "/doctor/patient-queue": {
      title: "Patient queue",
      description: "Patients currently tied to appointments, reports, or active care conversations.",
      tableTitle: "Patients",
      tableDescription: "Scan assigned patients and open the next care action.",
      columns: [["name", "Patient"], ["detail", "Context"], ["status", "Status"], ["time", "Updated"]],
      rows: (context) => doctorPatientRows(context),
      searchKey: "name",
      emptyKey: "doctorQueue",
      actions: [{ label: "Appointments", href: "/doctor/appointments" }],
      summary: (context) => DoctorFocusSummary("Care load", [{ label: "Appointments", value: context.appointments.length }, { label: "Shared reports", value: context.reports.length }, { label: "Consultations", value: context.consultations.length }])
    },
    "/doctor/appointments": {
      title: "Appointments",
      description: "Scheduled consultations and appointment requests that need clinical follow-through.",
      tableTitle: "Appointment schedule",
      tableDescription: "Review appointment timing, status, and patient context.",
      columns: [["name", "Patient"], ["detail", "Reason"], ["status", "Status"], ["time", "Scheduled"]],
      rows: (context) => doctorRowsFor("/doctor/appointments", context),
      searchKey: "name",
      emptyKey: "doctorAppointments",
      actions: [{ label: "Availability", href: "/doctor/settings" }],
      summary: (context) => DoctorFocusSummary("Schedule", [{ label: "Scheduled", value: context.appointments.length }, { label: "Active consults", value: context.consultations.length }])
    },
    "/doctor/consultations": {
      title: "Consultations",
      description: "Active patient consultation rooms and care conversations.",
      tableTitle: "Consultation rooms",
      tableDescription: "Open patient conversations and continue care safely.",
      columns: [["name", "Consultation"], ["detail", "Patient"], ["status", "Status"], ["time", "Updated"]],
      rows: (context) => doctorRowsFor("/doctor/consultations", context),
      searchKey: "name",
      emptyKey: "doctorConsultations",
      actions: [{ label: "Messages", href: "/doctor/messages" }],
      summary: (context) => DoctorFocusSummary("Conversation load", [{ label: "Open rooms", value: context.consultations.length }, { label: "Appointments", value: context.appointments.length }])
    },
    "/doctor/medical-reports": {
      title: "Medical reports",
      description: "Patient reports shared with you for clinical review.",
      tableTitle: "Assigned reports",
      tableDescription: "Review extracted patient files and report status.",
      columns: [["name", "Report"], ["detail", "Status"], ["status", "Review"], ["time", "Updated"]],
      rows: (context) => doctorRowsFor("/doctor/medical-reports", context),
      searchKey: "name",
      emptyKey: "doctorReports",
      actions: [{ label: "Patient queue", href: "/doctor/patient-queue" }],
      summary: (context) => DoctorFocusSummary("Review queue", [{ label: "Reports", value: context.reports.length }, { label: "Appointments", value: context.appointments.length }])
    },
    "/doctor/messages": {
      title: "Messages",
      description: "Clinical messages from active consultation threads.",
      tableTitle: "Patient messages",
      tableDescription: "Track conversations that need a response.",
      columns: [["name", "Thread"], ["detail", "Patient"], ["status", "Status"], ["time", "Updated"]],
      rows: (context) => doctorRowsFor("/doctor/messages", context),
      searchKey: "name",
      emptyKey: "doctorMessages",
      actions: [{ label: "Consultations", href: "/doctor/consultations" }],
      summary: (context) => DoctorFocusSummary("Inbox", [{ label: "Threads", value: context.consultations.length }, { label: "Appointments", value: context.appointments.length }])
    },
    "/doctor/profile": {
      title: "Profile",
      description: "Your public doctor profile should communicate trust, specialty, and availability clearly.",
      tableTitle: "Profile signals",
      tableDescription: "Profile details will appear here when the doctor profile API returns them.",
      columns: [["name", "Item"], ["detail", "Detail"], ["status", "Status"], ["time", "Updated"]],
      rows: (context) => doctorProfileRows(context),
      searchKey: "name",
      emptyKey: "doctorProfile",
      actions: [{ label: "Verification", href: "/doctor/verification-status" }],
      bodyOnly: true,
      summary: () => EmptyState("account_circle", "Profile workspace is ready", operationEmptyCopy.doctorProfile[1], [{ label: "Verification", href: "/doctor/verification-status" }])
    },
    "/doctor/verification-status": {
      title: "Verification",
      description: "Credential status and trust signals for your doctor account.",
      tableTitle: "Verification records",
      tableDescription: "Credential records will appear here when verification data is available.",
      columns: [["name", "Credential"], ["detail", "Detail"], ["status", "Status"], ["time", "Updated"]],
      rows: (context) => doctorProfileRows(context),
      searchKey: "name",
      emptyKey: "doctorVerification",
      actions: [{ label: "Profile", href: "/doctor/profile" }],
      bodyOnly: true,
      summary: () => EmptyState("verified_user", "Verification center is ready", operationEmptyCopy.doctorVerification[1], [{ label: "Profile", href: "/doctor/profile" }])
    },
    "/doctor/analytics": {
      title: "Analytics",
      description: "Care activity, review volume, and patient communication patterns.",
      tableTitle: "Activity breakdown",
      tableDescription: "Operational activity from real appointments, reports, and consultations.",
      columns: [["name", "Metric"], ["detail", "Value"], ["status", "Status"]],
      rows: (context) => doctorAnalyticsRows(context),
      searchKey: "name",
      emptyKey: "doctorAnalytics",
      actions: [{ label: "Overview", href: "/doctor" }],
      summary: (context) => SegmentChart([{ label: "Appointments", value: context.appointments.length }, { label: "Reports", value: context.reports.length }, { label: "Consultations", value: context.consultations.length }])
    }
  };
  return configs[route] || {
    title: fallbackTitle,
    description: "Focused doctor workspace.",
    tableTitle: fallbackTitle,
    tableDescription: "Records from your clinical workspace.",
    columns: [["name", "Record"], ["detail", "Detail"], ["status", "Status"], ["time", "Time"]],
    rows: (context) => doctorRowsFor(route, context),
    searchKey: "name",
    emptyKey: "doctorQueue",
    actions: [],
    summary: () => EmptyState("medical_services", "Workspace ready", "Clinical records will appear here when available.", [])
  };
}

function SectionScaffold({ stats, chart, table, secondary = "" }) {
  return `
    ${MetricGrid(stats)}
    <section class="ops-grid ${secondary ? "ops-grid-2" : ""}">
      ${chart}
      ${secondary}
    </section>
    ${table}
  `;
}

function MetricGrid(cards) {
  return `<section class="metric-grid">${cards.join("")}</section>`;
}

function DoctorFocusSummary(title, items = []) {
  const rows = items.filter((item) => item.value !== undefined && item.value !== null);
  if (!rows.length) return EmptyState("medical_services", "Workspace ready", "Clinical records will appear here when available.", []);
  return `
    <div class="segment-chart" aria-label="${escapeHtml(title)}">
      ${rows
        .map(
          (row) => `<div class="segment-row"><div><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.value)}</span></div><div class="meter-track"><span style="width:${summaryMeterWidth(row.value, rows)}%"></span></div></div>`
        )
        .join("")}
    </div>
  `;
}

function summaryMeterWidth(value, rows) {
  if (typeof value !== "number") return 100;
  const max = Math.max(1, ...rows.map((row) => (typeof row.value === "number" ? row.value : 0)));
  return Math.max(8, Math.round((value / max) * 100));
}

function StatCard(title, value, label, iconName, trend = "") {
  return `
    <article class="stat-card">
      <div class="stat-card-top"><span>${icon(iconName)}</span>${trend ? `<small>${escapeHtml(trend)}</small>` : ""}</div>
      <strong>${escapeHtml(value)}</strong>
      <div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(label)}</p></div>
    </article>
  `;
}

function AnalyticsCard(title, description, body, actions = []) {
  return `
    <article class="analytics-card">
      <div class="card-header">
        <div><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(description)}</p></div>
        ${ActionBar(actions)}
      </div>
      ${body}
    </article>
  `;
}

function DataTable({ title, description, rows, columns, searchKey, emptyKey, actions = [] }) {
  const searchId = `search-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const tableRows = rows || [];
  return `
    <section class="data-table-card">
      <div class="data-table-toolbar">
        <div><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(description)}</p></div>
        <div class="data-table-controls">
          <label class="ops-search" for="${searchId}">${icon("search")}<span class="sr-only">Search ${escapeHtml(title)}</span><input id="${searchId}" data-table-search="${escapeHtml(searchKey)}" type="search" placeholder="Search"></label>
          <select data-table-filter aria-label="Filter ${escapeHtml(title)}"><option value="">All statuses</option><option value="active">Active</option><option value="review">Review</option><option value="pending">Pending</option><option value="healthy">Healthy</option></select>
          ${ActionBar(actions)}
        </div>
      </div>
      ${
        tableRows.length
          ? `<div class="table-wrap"><table data-ops-table><thead><tr>${columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr></thead><tbody>${tableRows
              .map((row) => `<tr data-search-text="${escapeHtml(Object.values(row).join(" ").toLowerCase())}">${columns.map(([key]) => `<td>${formatCell(row[key])}</td>`).join("")}</tr>`)
              .join("")}</tbody></table></div>`
          : EmptyState("inbox", operationEmptyCopy[emptyKey]?.[0] || "Workspace is ready", operationEmptyCopy[emptyKey]?.[1] || "Records will appear here when backend activity is available.", actions)
      }
    </section>
  `;
}

function EmptyState(iconName, title, description, actions = []) {
  return `<section class="ops-empty-state"><div class="state-icon">${icon(iconName)}</div><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(description)}</p>${ActionBar(actions)}</section>`;
}

function SkeletonLoader(title) {
  return `<section class="ops-skeleton" aria-busy="true"><div><span class="skeleton-line wide"></span><span class="skeleton-line"></span></div><div class="metric-grid">${Array.from({ length: 4 }, () => `<article class="stat-card skeleton-card"></article>`).join("")}</div><article class="analytics-card"><span class="skeleton-line wide"></span><span class="skeleton-chart"></span></article><p class="muted">${escapeHtml(title)}</p></section>`;
}

function TrendChart(rows = []) {
  const data = rows.filter((row) => Number(row.value) >= 0);
  if (!data.length) return EmptyState("monitoring", "Trend canvas is ready", "Chart lines will render as operational metrics arrive.", []);
  const width = 520;
  const height = 180;
  const max = Math.max(1, ...data.map((row) => Number(row.value || 0)));
  const points = data
    .map((row, index) => {
      const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
      const y = height - (Number(row.value || 0) / max) * 140 - 20;
      return `${x},${y}`;
    })
    .join(" ");
  return `<div class="trend-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Trend chart"><path d="M0 150 H520" class="chart-grid-line"></path><polyline points="${points}" fill="none" stroke="#FF6E5C" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline></svg><div class="chart-legend">${data.map((row) => `<span><strong>${escapeHtml(row.value)}</strong>${escapeHtml(row.label)}</span>`).join("")}</div></div>`;
}

function SegmentChart(rows = []) {
  const data = rows.filter((row) => Number(row.value || 0) >= 0);
  if (!data.length) return EmptyState("donut_large", "Segments are ready", "Distribution charts will render as records are recorded.", []);
  const total = data.reduce((sum, row) => sum + Number(row.value || 0), 0) || 1;
  return `<div class="segment-chart">${data
    .map((row) => {
      const percent = Math.round((Number(row.value || 0) / total) * 100);
      return `<div class="segment-row"><div><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.value)}</span></div><div class="meter-track"><span style="width:${percent}%"></span></div></div>`;
    })
    .join("")}</div>`;
}

function ActivityTimeline(title, items = [], emptyKey = "logs") {
  const rows = items.map((item) => ({
    title: item.action || item.reason || item.title || item.file_name || item.status || "Operational event",
    detail: item.entity_type || item.patient_first_name || item.doctor_first_name || item.status || "Recorded activity",
    time: formatDate(item.created_at || item.createdAt || item.scheduled_at || item.updated_at)
  }));
  return AnalyticsCard(
    title,
    "Recent activity ordered for quick operational scanning.",
    rows.length
      ? `<ol class="activity-timeline">${rows.map((row) => `<li><span></span><div><strong>${escapeHtml(row.title)}</strong><p class="muted">${escapeHtml(row.detail)} · ${escapeHtml(row.time)}</p></div></li>`).join("")}</ol>`
      : EmptyState("timeline", operationEmptyCopy[emptyKey]?.[0] || "Activity rail is ready", operationEmptyCopy[emptyKey]?.[1] || "Events will appear here when activity is recorded.", []),
    []
  );
}

function ActionBar(actions = []) {
  if (!actions.length) return "";
  return `<div class="actions">${actions.map((action) => `<a class="btn ${action.primary ? "btn-primary" : "btn-secondary"}" href="${action.href}">${escapeHtml(action.label)}</a>`).join("")}</div>`;
}

function CouponForm() {
  return `
    <form class="form ops-form coupon-form" data-coupon-form novalidate>
      <div class="form-message" data-form-message hidden></div>
      <div class="coupon-field field">
        <label for="coupon-code">Code</label>
        <div class="control-shell">
          <span class="control-icon">${icon("sell")}</span>
          <input id="coupon-code" name="code" autocomplete="off" inputmode="text" placeholder="Generated if blank">
        </div>
      </div>
      <div class="coupon-form-grid">
        <div class="coupon-field field">
          <label for="coupon-discount-type">Discount type</label>
          <div class="control-shell control-shell-select">
            <span class="control-icon">${icon("percent")}</span>
            <select id="coupon-discount-type" name="discountType" data-discount-type>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Naira</option>
            </select>
          </div>
        </div>
        <div class="coupon-field field">
          <label for="coupon-discount-value">Discount value <span class="required">*</span></label>
          <div class="control-shell" data-discount-control>
            <span class="control-icon" data-discount-symbol>%</span>
            <input id="coupon-discount-value" name="discountValue" type="number" min="1" required placeholder="10">
          </div>
        </div>
      </div>
      <div class="coupon-form-grid">
        <div class="coupon-field field">
          <label for="coupon-max-uses">Max uses</label>
          <div class="control-shell">
            <span class="control-icon">${icon("groups")}</span>
            <input id="coupon-max-uses" name="maxUses" type="number" min="1" placeholder="Optional">
          </div>
        </div>
        <div class="coupon-field field">
          <label for="coupon-expiry-date">Expiry date</label>
          <div class="control-shell">
            <span class="control-icon">${icon("event")}</span>
            <input id="coupon-expiry-date" name="expiryDate" type="datetime-local">
          </div>
        </div>
      </div>
      <button class="btn btn-primary btn-full coupon-submit" type="submit">${icon("add")}Create coupon</button>
    </form>
  `;
}

function AvailabilityCard() {
  return AnalyticsCard(
    "Availability scheduler",
    "Keep patient access predictable with a clear weekly availability window.",
    `<form class="form ops-form" data-availability-form><div class="form-message" data-form-message hidden></div>${field("Day of week", "dayOfWeek", "number", true)}${field("Starts", "startsAt", "time", true)}${field("Ends", "endsAt", "time", true)}<button class="btn btn-primary" type="submit">${icon("schedule")}Save availability</button></form>`,
    []
  );
}

function bindOperationsControls() {
  document.querySelectorAll("[data-table-search]").forEach((input) => {
    input.addEventListener("input", () => filterTable(input.closest(".data-table-card")));
  });
  document.querySelectorAll("[data-table-filter]").forEach((select) => {
    select.addEventListener("change", () => filterTable(select.closest(".data-table-card")));
  });
}

function filterTable(card) {
  const search = card.querySelector("[data-table-search]")?.value.toLowerCase() || "";
  const filter = card.querySelector("[data-table-filter]")?.value.toLowerCase() || "";
  card.querySelectorAll("tbody tr").forEach((row) => {
    const text = row.dataset.searchText || row.textContent.toLowerCase();
    row.hidden = Boolean(search && !text.includes(search)) || Boolean(filter && !text.includes(filter));
  });
}

function bindDoctorWorkspaceActions() {
  bindOperationsControls();
  document.querySelector("[data-availability-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitLoading(form, true);
    try {
      await apiRequest("/doctor/availability", { method: "POST", body: Object.fromEntries(new FormData(form).entries()) });
      showFormMessage(form, "success", "Availability saved.");
    } catch (error) {
      showFormMessage(form, "error", error.message || "Availability could not be saved.");
    } finally {
      setSubmitLoading(form, false);
    }
  });
}

function couponFormPayload(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  if (!payload.code) delete payload.code;
  if (!payload.maxUses) delete payload.maxUses;
  if (payload.expiryDate) payload.expiryDate = new Date(payload.expiryDate).toISOString();
  else delete payload.expiryDate;
  payload.discountValue = Number(payload.discountValue);
  if (payload.maxUses) payload.maxUses = Number(payload.maxUses);
  return payload;
}

function bindAdminCouponForm() {
  const form = document.querySelector("[data-coupon-form]");
  if (!form) return;
  const discountType = form.querySelector("[data-discount-type]");
  const discountSymbol = form.querySelector("[data-discount-symbol]");
  const syncDiscountSymbol = () => {
    if (discountSymbol) discountSymbol.textContent = discountType?.value === "fixed" ? "₦" : "%";
  };
  syncDiscountSymbol();
  discountType?.addEventListener("change", syncDiscountSymbol);
  form.querySelectorAll("input, select").forEach((control) => {
    const syncValueState = () => control.closest(".control-shell")?.toggleAttribute("data-has-value", Boolean(control.value));
    syncValueState();
    control.addEventListener("input", syncValueState);
    control.addEventListener("change", syncValueState);
  });
  form.addEventListener("submit", async (event) => {
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

function doctorRowsFor(route, context) {
  if (route.includes("report")) return context.reports.map((report) => ({ name: report.title || report.file_name || "Medical report", detail: report.status || "Review", status: displayStatus(report.status || "received"), time: formatDate(report.created_at || report.updated_at) }));
  if (route.includes("consultation") || route.includes("message")) return context.consultations.map((item) => ({ name: item.title || item.reason || "Consultation", detail: item.patient_name || item.status || "Patient room", status: displayStatus(item.status || "active"), time: formatDate(item.created_at || item.updated_at) }));
  return context.appointments.map((item) => ({ name: patientName(item), detail: item.reason || "Appointment", status: displayStatus(item.status || "scheduled"), time: formatDate(item.scheduled_at || item.created_at) }));
}

function doctorPatientRows(context) {
  const appointments = context.appointments.map((item) => ({
    name: patientName(item),
    detail: item.reason || "Appointment",
    status: displayStatus(item.status || "scheduled"),
    time: formatDate(item.scheduled_at || item.created_at)
  }));
  const consultations = context.consultations.map((item) => ({
    name: item.patient_name || item.patientName || "Patient",
    detail: item.title || item.reason || "Consultation",
    status: displayStatus(item.status || "active"),
    time: formatDate(item.updated_at || item.created_at)
  }));
  const reports = context.reports.map((report) => ({
    name: report.patient_name || report.patientName || report.owner_name || "Patient",
    detail: report.title || report.file_name || "Medical report",
    status: displayStatus(report.status || "received"),
    time: formatDate(report.updated_at || report.created_at)
  }));
  return [...appointments, ...consultations, ...reports];
}

function doctorProfileRows() {
  return [];
}

function doctorAnalyticsRows(context) {
  const rows = [
    { name: "Appointments", detail: context.appointments.length, status: "Tracked" },
    { name: "Reports", detail: context.reports.length, status: "Tracked" },
    { name: "Consultations", detail: context.consultations.length, status: "Tracked" }
  ];
  return rows.some((row) => Number(row.detail) > 0) ? rows : [];
}

function patientName(item = {}) {
  return [item.patient_first_name, item.patient_last_name, item.patientFirstName, item.patientLastName].filter(Boolean).slice(0, 2).join(" ") || item.patient_name || item.patientName || "Patient";
}

function adminSharedMetrics(context) {
  return {
    users: context.users.length,
    doctors: roleCount(context.users, "doctor") || context.doctors.length,
    revenue: Number(context.monetization.monthly_revenue_cents || 0),
    failedPayments: Number(context.monetization.failed_payments || 0),
    aiRequests: Number(context.ai.summary?.total_requests || 0),
    blockedAi: Number(context.ai.summary?.blocked_requests || 0),
    failedReports: Number(context.reportMetrics.failed_extractions || 0)
  };
}

function roleCount(users, role) {
  return users.filter((user) => String(user.role || "").toLowerCase() === role).length;
}

function logRows(logs) {
  return logs.map((log) => ({
    action: log.action || "Audit event",
    actor: log.actor_email || log.actorId || log.actor_id || "System",
    entity: [log.entityType || log.entity_type, log.entityId || log.entity_id].filter(Boolean).join(": ") || "Platform",
    time: formatDate(log.createdAt || log.created_at)
  }));
}

function accountName(user = {}) {
  return [user.firstName, user.lastName, user.first_name, user.last_name].filter(Boolean).slice(0, 2).join(" ") || user.email || "Account";
}

function doctorName(doctor = {}) {
  return [doctor.firstName, doctor.lastName, doctor.first_name, doctor.last_name].filter(Boolean).slice(0, 2).join(" ") || doctor.name || doctor.email || "Doctor";
}

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatCell(value) {
  if (value === null || value === undefined || value === "") return `<span class="muted">Recorded</span>`;
  const raw = String(value);
  if (raw.includes("<a ") || raw.includes("<span ")) return raw;
  if (/active|healthy|stable|live|verified|tracked|measured|controlled/i.test(raw)) return `<span class="badge badge-success">${escapeHtml(raw)}</span>`;
  if (/review|failed|risk|pending|awaiting/i.test(raw)) return `<span class="badge badge-warning">${escapeHtml(raw)}</span>`;
  return escapeHtml(raw);
}
