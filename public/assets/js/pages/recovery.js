/**
 * @file Error, empty, maintenance, offline, and success state pages.
 * @module assets/js/pages/recovery.js
 */

// -----------------------------------------------------------------------------
// Error, empty, maintenance, offline, and success state pages.
// -----------------------------------------------------------------------------

const recoveryPages = {
  "/error/400": {
    code: "400",
    iconName: "rule",
    title: "We couldn't understand this request.",
    description: "Some information arrived in a format the secure healthcare workspace could not verify.",
    actions: [
      { label: "Try Again", action: "retry", iconName: "refresh" },
      { label: "Return Home", href: "/dashboard", iconName: "home" }
    ],
    details: ["Check required fields before resubmitting.", "Avoid refreshing while a file or payment is still uploading."]
  },
  "/error/401": {
    code: "401",
    iconName: "lock",
    title: "You need to sign in to continue.",
    description: "This area protects private medical information and requires an active session.",
    actions: [
      { label: "Login", href: "/login", iconName: "login" },
      { label: "Register", href: "/register", iconName: "person_add" }
    ],
    details: ["Use the same account that owns the report, appointment, or payment.", "Sessions may expire after inactivity for your privacy."]
  },
  "/error/403": {
    code: "403",
    iconName: "shield_lock",
    title: "You don't have permission to access this area.",
    description: "Your role or account permissions do not allow this request to continue.",
    actions: [
      { label: "Return Dashboard", href: "/dashboard", iconName: "dashboard" },
      { label: "Contact Support", href: "/contact", iconName: "support_agent" }
    ],
    details: ["Patients, doctors, and admins see different protected workspaces.", "Account permissions can restrict doctor or AI access when required."]
  },
  "/error/404": {
    code: "404",
    iconName: "travel_explore",
    title: "The page you're looking for does not exist.",
    description: "The link may be outdated, or the record may no longer be available in your account.",
    actions: [
      { label: "Return Home", href: "/dashboard", iconName: "home" },
      { label: "Search Reports", href: "/reports", iconName: "manage_search" }
    ],
    details: ["Report and doctor links must match the signed-in account.", "Use navigation to return to a verified route."]
  },
  "/error/408": {
    code: "408",
    iconName: "timer",
    title: "The request took too long to complete.",
    description: "The connection timed out before the secure service could finish processing.",
    actions: [
      { label: "Retry", action: "retry", iconName: "refresh" },
      { label: "Return Dashboard", href: "/dashboard", iconName: "dashboard" }
    ],
    details: ["Large uploads and AI analysis can take longer on unstable networks.", "Retry once the connection is steady."]
  },
  "/error/429": {
    code: "429",
    iconName: "speed",
    title: "Too many requests detected.",
    description: "Rate limits are protecting medical data, AI credits, and payment operations from abuse.",
    actions: [
      { label: "Wait and Retry", action: "retry", iconName: "hourglass_top" },
      { label: "Upgrade Plan", href: "/subscription", iconName: "workspace_premium" }
    ],
    cooldownSeconds: 60,
    details: ["Burst protection applies to sign-in, uploads, AI, booking, and payment endpoints.", "Repeated attempts may temporarily pause access."]
  },
  "/error/500": {
    code: "500",
    iconName: "medical_services",
    title: "Something unexpected happened on our side.",
    description: "The system could not complete this healthcare workflow safely.",
    actions: [
      { label: "Retry", action: "retry", iconName: "refresh" },
      { label: "Contact Support", href: "/contact", iconName: "support_agent" }
    ],
    details: ["No medical report data is shown in this error screen.", "Support can review request logs without exposing protected content."]
  },
  "/error/database": {
    code: "DB",
    iconName: "database",
    title: "We're having trouble accessing your data.",
    description: "The application cannot reach the secure MySQL service right now.",
    actions: [
      { label: "Retry Connection", action: "retry", iconName: "refresh" },
      { label: "Status Page", href: "/help", iconName: "monitor_heart" }
    ],
    details: ["Existing records are not reset by this page.", "Retry after the database service is healthy."]
  },
  "/error/ai": {
    code: "AI",
    iconName: "psychology",
    title: "The AI assistant is temporarily unavailable.",
    description: "Gemini-backed analysis is paused, but your uploaded reports and history remain protected.",
    actions: [
      { label: "Retry Analysis", action: "retry", iconName: "refresh" },
      { label: "View Previous Reports", href: "/reports", iconName: "description" }
    ],
    statusBadge: "Gemini service status: unavailable",
    details: ["AI calls only run through the backend.", "Previous analyses remain available when the reports service is reachable."]
  },
  "/error/report-processing": {
    code: "REPORT",
    iconName: "upload_file",
    title: "We couldn't process this medical report.",
    description: "The uploaded document could not be prepared for secure OCR and AI explanation.",
    actions: [
      { label: "Upload New Report", href: "/reports", iconName: "upload_file" },
      { label: "Learn More", href: "/help", iconName: "help" }
    ],
    detailTitle: "Possible reasons",
    details: ["Poor image quality", "Unsupported format", "Corrupted file"]
  },
  "/error/ocr": {
    code: "OCR",
    iconName: "document_scanner",
    title: "We couldn't read the report content.",
    description: "The text extraction step could not identify enough readable clinical content.",
    actions: [
      { label: "Upload Higher Quality File", href: "/reports", iconName: "upload_file" },
      { label: "Contact Support", href: "/contact", iconName: "support_agent" }
    ],
    details: ["Use a clear PDF, PNG, or JPG.", "Keep the full report visible with no cropped lab values."]
  },
  "/error/payment": {
    code: "PAY",
    iconName: "payments",
    title: "Your payment could not be completed.",
    description: "The OPay transaction was not confirmed by server-side verification.",
    actions: [
      { label: "Retry Payment", href: "/update-plan", iconName: "refresh" },
      { label: "Change Payment Method", href: "/update-plan", iconName: "credit_card" }
    ],
    detailTitle: "Payment troubleshooting",
    details: ["Confirm sufficient balance or card approval.", "Do not close OPay until verification completes.", "Contact support if your account was debited."]
  },
  "/error/subscription-expired": {
    code: "PLAN",
    iconName: "workspace_premium",
    title: "Your premium access has expired.",
    description: "Premium report analysis and consultation tools require an active verified subscription.",
    actions: [
      { label: "Renew Subscription", href: "/update-plan", iconName: "workspace_premium" },
      { label: "View Plans", href: "/subscription", iconName: "list_alt" }
    ],
    details: ["Existing reports remain in your history.", "Premium access resumes after payment verification."]
  },
  "/error/doctor-unavailable": {
    code: "DOCTOR",
    iconName: "stethoscope",
    title: "This doctor is currently unavailable.",
    description: "The selected doctor is not accepting this appointment or consultation request right now.",
    actions: [
      { label: "Browse Other Doctors", href: "/doctors", iconName: "groups" },
      { label: "Request Notification", href: "/contact", iconName: "notifications_active" }
    ],
    details: ["Availability can change when doctors update schedules.", "Verified alternatives may be available by specialization."]
  },
  "/error/booking": {
    code: "BOOK",
    iconName: "event_busy",
    title: "We couldn't complete your booking.",
    description: "The appointment slot may no longer be available or could not be confirmed safely.",
    actions: [
      { label: "Choose Another Time", href: "/doctors", iconName: "event" },
      { label: "Retry Booking", action: "retry", iconName: "refresh" }
    ],
    details: ["Only confirmed appointments appear in your schedule.", "Payment and account permission checks must pass before booking is finalized."]
  },
  "/error/chat-disconnected": {
    code: "CHAT",
    iconName: "forum",
    title: "Connection to chat was interrupted.",
    description: "Real-time consultation messaging lost its WebSocket connection.",
    actions: [
      { label: "Reconnect", action: "retry", iconName: "sync" },
      { label: "Return Dashboard", href: "/dashboard", iconName: "dashboard" }
    ],
    connectionStatus: "Disconnected"
  },
  "/error/file-too-large": {
    code: "FILE",
    iconName: "upload",
    title: "The uploaded file exceeds the allowed size.",
    description: "The report was blocked before processing to protect upload stability and storage limits.",
    actions: [
      { label: "Upload Smaller File", href: "/reports", iconName: "upload_file" },
      { label: "View Upload Requirements", href: "/help", iconName: "rule" }
    ],
    details: ["Compress large scans before uploading.", "Use one report file per upload whenever possible."]
  },
  "/error/file-type": {
    code: "TYPE",
    iconName: "draft",
    title: "This file format is not supported.",
    description: "Only approved medical report formats can enter the secure processing pipeline.",
    actions: [
      { label: "View Supported Formats", href: "/help", iconName: "fact_check" },
      { label: "Upload Another File", href: "/reports", iconName: "upload_file" }
    ],
    details: ["Use PDF, PNG, or JPG files.", "Avoid executable, archive, or editable document formats."]
  },
  "/maintenance": {
    code: "MAINT",
    iconName: "build",
    title: "We're performing scheduled improvements.",
    description: "MedExplain AI is being updated to keep the healthcare workspace stable and secure.",
    actions: [
      { label: "Check Status Page", href: "/help", iconName: "monitor_heart" },
      { label: "Notify Me When Back", href: "/contact", iconName: "notifications_active" }
    ],
    countdownSeconds: 900,
    details: ["Uploads, AI analysis, and payments may be paused during maintenance.", "No user data is reset by maintenance mode."]
  },
  "/offline": {
    code: "OFFLINE",
    iconName: "wifi_off",
    title: "No internet connection detected.",
    description: "Reconnect to continue secure uploads, AI analysis, doctor booking, and payments.",
    actions: [
      { label: "Retry Connection", action: "retry", iconName: "refresh" },
      { label: "View Cached Data", href: "/dashboard", iconName: "folder_open" }
    ],
    connectionStatus: "Offline"
  }
};

const emptyPages = {
  "/empty/no-reports": {
    iconName: "description",
    title: "No reports yet",
    description: "Uploaded medical reports will appear here after secure processing.",
    primary: { label: "Upload Report", href: "/reports", iconName: "upload_file" },
    secondary: { label: "Learn More", href: "/help", iconName: "help" }
  },
  "/empty/no-appointments": {
    iconName: "calendar_month",
    title: "No appointments scheduled",
    description: "Your confirmed doctor consultations will appear here.",
    primary: { label: "Find Doctors", href: "/doctors", iconName: "stethoscope" },
    secondary: { label: "Return Dashboard", href: "/dashboard", iconName: "dashboard" }
  },
  "/empty/no-notifications": {
    iconName: "notifications",
    title: "No notifications",
    description: "Important report, appointment, payment, and security alerts will collect here.",
    primary: { label: "Return Dashboard", href: "/dashboard", iconName: "dashboard" },
    secondary: { label: "Settings", href: "/settings", iconName: "settings" }
  },
  "/empty/no-doctors": {
    iconName: "stethoscope",
    title: "No doctors found",
    description: "No verified doctors match the current specialization or availability filters.",
    primary: { label: "Adjust Search", href: "/doctors", iconName: "tune" },
    secondary: { label: "Doctor Careers", href: "/doctor-careers", iconName: "work" }
  },
  "/empty/no-search-results": {
    iconName: "manage_search",
    title: "No search results",
    description: "Try another report term, doctor name, specialization, or appointment status.",
    primary: { label: "Clear Search", href: "/doctors", iconName: "backspace" },
    secondary: { label: "Help", href: "/help", iconName: "help" }
  },
  "/empty/no-chat-history": {
    iconName: "forum",
    title: "No chat history",
    description: "AI and consultation conversations will appear after you start a secure chat.",
    primary: { label: "Start Chat", href: "/chat", iconName: "chat" },
    secondary: { label: "View Reports", href: "/reports", iconName: "description" }
  },
  "/empty/no-health-history": {
    iconName: "monitor_heart",
    title: "No health history",
    description: "Health timeline entries are created from verified reports and account activity.",
    primary: { label: "Open Profile", href: "/profile", iconName: "person" },
    secondary: { label: "Help", href: "/help", iconName: "help" }
  },
  "/empty/no-payments": {
    iconName: "payments",
    title: "No payments",
    description: "Verified OPay transactions and invoices will appear once billing begins.",
    primary: { label: "View Plans", href: "/subscription", iconName: "workspace_premium" },
    secondary: { label: "Billing History", href: "/billing-history", iconName: "receipt_long" }
  },
  "/empty/no-subscriptions": {
    iconName: "workspace_premium",
    title: "No subscription found",
    description: "Choose a plan when you are ready to unlock premium analysis and consultation tools.",
    primary: { label: "View Plans", href: "/subscription", iconName: "list_alt" },
    secondary: { label: "Return Dashboard", href: "/dashboard", iconName: "dashboard" }
  },
  "/empty/no-ai-analyses": {
    iconName: "psychology",
    title: "No AI analyses",
    description: "AI explanations will appear after a report is uploaded and your account has access.",
    primary: { label: "Analyze Report", href: "/reports", iconName: "upload_file" },
    secondary: { label: "AI Chat", href: "/chat", iconName: "chat" }
  }
};

const successPages = {
  "/success/report-uploaded": {
    iconName: "upload_file",
    title: "Report Uploaded Successfully",
    description: "Your medical report entered the secure processing workflow.",
    primary: { label: "View Reports", href: "/reports", iconName: "description" },
    secondary: { label: "Upload Another", href: "/reports", iconName: "upload_file" }
  },
  "/success/analysis-complete": {
    iconName: "verified",
    title: "Analysis Complete",
    description: "Your report explanation is ready with source-grounded clinical context.",
    primary: { label: "View Analysis", href: "/reports", iconName: "analytics" },
    secondary: { label: "Ask AI", href: "/chat", iconName: "psychology" }
  },
  "/success/appointment-booked": {
    iconName: "event_available",
    title: "Appointment Booked",
    description: "Your doctor consultation was confirmed and added to your schedule.",
    primary: { label: "View Appointments", href: "/appointments", iconName: "calendar_month" },
    secondary: { label: "Find Doctors", href: "/doctors", iconName: "stethoscope" }
  },
  "/success/payment": {
    iconName: "payments",
    title: "Payment Successful",
    description: "Your OPay transaction was verified by the backend.",
    primary: { label: "Billing History", href: "/billing-history", iconName: "receipt_long" },
    secondary: { label: "Open Dashboard", href: "/dashboard", iconName: "dashboard" }
  },
  "/success/subscription-activated": {
    iconName: "workspace_premium",
    title: "Subscription Activated",
    description: "Premium access is now active for eligible AI and consultation workflows.",
    primary: { label: "View Subscription", href: "/subscription", iconName: "workspace_premium" },
    secondary: { label: "Analyze Reports", href: "/reports", iconName: "description" }
  },
  "/success/doctor-application": {
    iconName: "badge",
    title: "Doctor Application Submitted",
    description: "Your application was received for secure administrative review.",
    primary: { label: "Track Status", href: "/doctor-careers", iconName: "track_changes" },
    secondary: { label: "Return Home", href: "/dashboard", iconName: "home" }
  },
  "/success/profile-updated": {
    iconName: "manage_accounts",
    title: "Profile Updated",
    description: "Your account details were saved successfully.",
    primary: { label: "View Profile", href: "/profile", iconName: "person" },
    secondary: { label: "Return Dashboard", href: "/dashboard", iconName: "dashboard" }
  },
  "/success/password-changed": {
    iconName: "lock_reset",
    title: "Password Changed",
    description: "Your sign-in credentials were updated securely.",
    primary: { label: "Login", href: "/login", iconName: "login" },
    secondary: { label: "Return Home", href: "/", iconName: "home" }
  }
};

function actionButton(action, index = 0) {
  const className = index === 0 ? "btn btn-primary" : "btn btn-secondary";
  const label = `${icon(action.iconName || "arrow_forward")}${escapeHtml(action.label)}`;
  if (action.action) return `<button class="${className}" type="button" data-action="${escapeHtml(action.action)}">${label}</button>`;
  return `<a class="${className}" href="${escapeHtml(action.href || "/dashboard")}">${label}</a>`;
}

function renderRecoverySignal(page) {
  const signals = [];
  if (page.statusBadge) signals.push(`<div class="state-badge status-warning">${icon("cloud_off")}<span>${escapeHtml(page.statusBadge)}</span></div>`);
  if (page.connectionStatus) signals.push(`<div class="state-badge status-error"><span class="connection-dot" aria-hidden="true"></span><span>${escapeHtml(page.connectionStatus)}</span></div>`);
  if (page.cooldownSeconds) {
    signals.push(`<div class="timer-panel"><span class="caption">Cooldown</span><strong data-countdown-seconds="${page.cooldownSeconds}">${page.cooldownSeconds}s</strong><span class="muted">Rate limits reset automatically.</span></div>`);
  }
  if (page.countdownSeconds) {
    signals.push(`<div class="timer-panel"><span class="caption">Estimated return</span><strong data-countdown-seconds="${page.countdownSeconds}">${Math.ceil(page.countdownSeconds / 60)}m</strong><span class="muted">This estimate updates on the page.</span></div>`);
  }
  if (page.details?.length) {
    signals.push(`<div class="info-list"><h2>${escapeHtml(page.detailTitle || "What to know")}</h2><ul>${page.details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`);
  }
  return signals.join("");
}

function renderRecoveryPage(path) {
  const page = recoveryPages[path] || recoveryPages["/error/404"];
  document.title = `${page.title} | MedExplain AI`;
  setMain(`
    <section class="state-page recovery-page" aria-labelledby="state-title">
      <div class="state-visual" aria-hidden="true">
        <div class="state-code">${escapeHtml(page.code)}</div>
        <div class="state-orbit"><div class="state-icon-large">${icon(page.iconName)}</div></div>
        <p class="caption">Secure healthcare recovery</p>
      </div>
      <div class="state-panel stack-lg">
        <p class="eyebrow">Recovery guidance</p>
        <h1 id="state-title">${escapeHtml(page.title)}</h1>
        <p class="lead">${escapeHtml(page.description)}</p>
        <div class="state-actions actions">${page.actions.map(actionButton).join("")}<a class="btn btn-quiet" href="/contact">${icon("support_agent")}Contact support</a></div>
        ${renderRecoverySignal(page)}
      </div>
    </section>
  `);
  bindCountdowns();
}

function renderEmptyPage(path) {
  const page = emptyPages[path] || emptyPages["/empty/no-search-results"];
  document.title = `${page.title} | MedExplain AI`;
  setMain(`
    <section class="state-page empty-page" aria-labelledby="state-title">
      <div class="state-visual" aria-hidden="true">
        <div class="state-orbit"><div class="state-icon-large">${icon(page.iconName)}</div></div>
        <p class="caption">Nothing to show yet</p>
      </div>
      <div class="state-panel stack-lg">
        <p class="eyebrow">Empty state</p>
        <h1 id="state-title">${escapeHtml(page.title)}</h1>
        <p class="lead">${escapeHtml(page.description)}</p>
        <div class="state-actions actions">${[page.primary, page.secondary].filter(Boolean).map(actionButton).join("")}</div>
      </div>
    </section>
  `);
}

function renderSuccessPage(path) {
  const page = successPages[path] || successPages["/success/report-uploaded"];
  document.title = `${page.title} | MedExplain AI`;
  setMain(`
    <section class="state-page success-page" aria-labelledby="state-title">
      <div class="state-visual" aria-hidden="true">
        <div class="state-orbit success-orbit"><div class="state-icon-large">${icon(page.iconName)}</div></div>
        <p class="caption">Workflow completed</p>
      </div>
      <div class="state-panel stack-lg">
        <p class="eyebrow">Success</p>
        <h1 id="state-title">${escapeHtml(page.title)}</h1>
        <p class="lead">${escapeHtml(page.description)}</p>
        <div class="state-actions actions">${[page.primary, page.secondary].filter(Boolean).map(actionButton).join("")}</div>
      </div>
    </section>
  `);
}

function bindCountdowns() {
  document.querySelectorAll("[data-countdown-seconds]").forEach((element) => {
    let remaining = Number(element.dataset.countdownSeconds || 0);
    const tick = () => {
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      element.textContent = minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
      remaining = Math.max(0, remaining - 1);
    };
    tick();
    const timer = window.setInterval(() => {
      if (!document.body.contains(element) || remaining <= 0) return window.clearInterval(timer);
      tick();
    }, 1000);
  });
}
