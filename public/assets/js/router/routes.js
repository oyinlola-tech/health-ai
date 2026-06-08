/**
 * @file Route aliases, navigation metadata, and route constants.
 * @module assets/js/router/routes.js
 */

// -----------------------------------------------------------------------------
// Route aliases, navigation metadata, and route constants.
// -----------------------------------------------------------------------------

const routeAliases = new Map([
  ["/upload", "/reports"],
  ["/history", "/reports"],
  ["/repots", "/reports"],
  ["/report", "/reports"],
  ["/admin/login", "/login"],
  ["/auth/login.html", "/login"],
  ["/auth/signup.html", "/register"],
  ["/auth/welcome.html", "/"],
  ["/auth/splash.html", "/splash"],
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
  ["/privacy-policy", "/privacy"],
  ["/terms-of-service", "/terms"],
  ["/premium/plans.html", "/subscription"],
  ["/premium/payment.html", "/update-plan"],
  ["/premium/activated.html", "/payment-success"],
  ["/learning-center/home.html", "/medical-knowledge"],
  ["/learning-center/articles.html", "/medical-knowledge"],
  ["/learning-center/trusted-source.html", "/medical-knowledge"],
  ["/medical-knowlegde", "/medical-knowledge"],
  ["/notifications/list.html", "/notifications"],
  ["/admin/index.html", "/admin"],
  ["/admin/user.html", "/admin/users"],
  ["/admin/report.html", "/admin/reports"],
  ["/admin/system-health.html", "/admin/system"],
  ["/success-state/appointment.html", "/success/appointment-booked"],
  ["/success-state/upload.html", "/success/report-uploaded"],
  ["/success-state/payment.html", "/success/payment"],
  ["/error-state/upload.html", "/error/report-processing"],
  ["/error-state/payment.html", "/error/payment"],
  ["/error-state/server.html", "/error/500"],
  ["/error-state/network.html", "/offline"],
  ["/error-state/analysis.html", "/error/ai"],
  ["/empty-state/report.html", "/empty/no-reports"],
  ["/empty-state/appointment.html", "/empty/no-appointments"],
  ["/empty-state/conversation.html", "/empty/no-chat-history"]
]);

const primaryNav = [
  { label: "Chat", href: "/chat", icon: "chat" },
  { label: "Reports", href: "/reports", icon: "description" },
  { label: "Doctors", href: "/doctors", icon: "stethoscope" },
  { label: "Profile", href: "/profile", icon: "account_circle" }
];

const doctorPrimaryNav = [
  { label: "Overview", href: "/doctor", icon: "space_dashboard" },
  { label: "Queue", href: "/doctor/patient-queue", icon: "groups" },
  { label: "Appointments", href: "/doctor/appointments", icon: "calendar_month" },
  { label: "Reports", href: "/doctor/medical-reports", icon: "clinical_notes" },
  { label: "Messages", href: "/doctor/messages", icon: "forum" }
];

const adminPrimaryNav = [
  { label: "Overview", href: "/admin", icon: "space_dashboard" },
  { label: "Revenue", href: "/admin/revenue", icon: "monitoring" },
  { label: "Users", href: "/admin/user-analytics", icon: "groups" },
  { label: "Doctors", href: "/admin/doctor-operations", icon: "stethoscope" },
  { label: "System", href: "/admin/system-health", icon: "dns" }
];

const footerSections = [
  { title: "Company", links: [["About", "/"], ["Contact", "/contact"]] },
  { title: "Product", links: [["Reports", "/reports"], ["Doctors", "/doctors"], ["Doctor careers", "/doctor-careers"], ["Subscription", "/subscription"]] },
  { title: "Resources", links: [["Help", "/help"], ["Medical Knowledge", "/medical-knowledge"], ["Data policy", "/data-policy"]] },
  { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"]] }
];

const pageMeta = {
  "/": { title: "Calm healthcare intelligence", description: "Upload reports, understand results, and connect with verified medical support in one steady workspace." },
  "/splash": { title: "Welcome to MedExplain AI", description: "A calm, secure place to understand reports and manage healthcare decisions." },
  "/onboarding": { title: "Get started", description: "Set up your secure MedExplain AI workspace." },
  "/login": { title: "Welcome back", description: "Sign in to continue your private health workspace." },
  "/register": { title: "Create your account", description: "Start a private MedExplain AI workspace." },
  "/dashboard": { title: "AI health chat", description: "Ask questions and continue your MedExplain AI conversation." },
  "/reports": { title: "Reports", description: "Report history, upload workflow, processing status, and health document insights." },
  "/chat": { title: "AI health chat", description: "Ask questions about your reports and health context." },
  "/doctors": { title: "Doctors", description: "Connect with verified doctors and manage consultations." },
  "/doctor-careers": { title: "Doctor careers", description: "Apply for verified doctor roles and track application status securely." },
  "/appointments": { title: "Appointments", description: "Review doctor bookings and consultation status." },
  "/profile": { title: "Profile", description: "Review and update your account information." },
  "/settings": { title: "Settings", description: "Manage account, security, notifications, privacy, subscription, and billing address details." },
  "/subscription": { title: "Subscription", description: "Manage your plan and billing status." },
  "/checkout": { title: "Checkout", description: "Apply coupons and complete subscription checkout securely." },
  "/payment-success": { title: "Payment success", description: "Verify your OPay payment and activate premium access." },
  "/payment-failed": { title: "Payment failed", description: "Review payment status and retry securely." },
  "/maintenance": { title: "Maintenance mode", description: "Scheduled platform improvements are in progress." },
  "/offline": { title: "Offline mode", description: "Reconnect to continue your secure healthcare workspace." },
  "/billing-history": { title: "Billing history", description: "Review OPay transactions, refunds, and invoices." },
  "/update-plan": { title: "Update plan", description: "Choose a premium plan and continue to OPay checkout." },
  "/cancel-subscription": { title: "Cancel subscription", description: "Manage cancellation for your active premium plan." },
  "/help": { title: "Help center", description: "Find guidance, support, and trusted medical knowledge." },
  "/medical-knowledge": { title: "Medical knowledge", description: "Trusted medical education resources used to support report explanations." },
  "/contact": { title: "Contact", description: "Reach the MedExplain AI support team." },
  "/privacy": { title: "Privacy", description: "How MedExplain AI protects and handles personal health information." },
  "/terms": { title: "Terms", description: "Terms for using MedExplain AI." },
  "/consent": { title: "Account permissions", description: "Review the platform permissions covered by your account terms." },
  "/data-policy": { title: "Data usage transparency", description: "Understand why data is collected and what MedExplain AI does not do with it." },
  "/notifications": { title: "Notification center", description: "Review email, AI, payment, security, and doctor notifications." },
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
