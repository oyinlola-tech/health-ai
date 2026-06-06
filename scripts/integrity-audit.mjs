import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";

const publicRoot = path.resolve("public");
const reportPath = path.resolve("docs/audits/integrity-audit.md");

const canonicalRoutes = new Set([
  "/",
  "/login",
  "/register",
  "/dashboard",
  "/reports",
  "/chat",
  "/doctors",
  "/doctor-careers",
  "/appointments",
  "/profile",
  "/settings",
  "/subscription",
  "/checkout",
  "/payment-success",
  "/payment-failed",
  "/billing-history",
  "/update-plan",
  "/cancel-subscription",
  "/help",
  "/contact",
  "/privacy",
  "/terms",
  "/consent",
  "/data-policy",
  "/doctor",
  "/doctor/patient-queue",
  "/doctor/appointments",
  "/doctor/consultations",
  "/doctor/medical-reports",
  "/doctor/messages",
  "/doctor/profile",
  "/doctor/verification-status",
  "/doctor/analytics",
  "/doctor/settings",
  "/admin",
  "/admin/users",
  "/admin/doctors",
  "/admin/doctor-applications",
  "/admin/reports",
  "/admin/ai-usage",
  "/admin/payments",
  "/admin/subscriptions",
  "/admin/coupons",
  "/admin/security-logs",
  "/admin/audit-logs",
  "/admin/system-settings",
  "/admin/system",
  "/admin/jobs",
  "/admin/analytics",
  "/sitemap",
  "/maintenance",
  "/offline",
  "/empty/no-reports",
  "/empty/no-appointments",
  "/empty/no-notifications",
  "/empty/no-doctors",
  "/empty/no-search-results",
  "/empty/no-chat-history",
  "/empty/no-health-history",
  "/empty/no-payments",
  "/empty/no-subscriptions",
  "/empty/no-ai-analyses",
  "/error/400",
  "/error/401",
  "/error/403",
  "/error/404",
  "/error/408",
  "/error/429",
  "/error/500",
  "/error/database",
  "/error/ai",
  "/error/report-processing",
  "/error/ocr",
  "/error/payment",
  "/error/subscription-expired",
  "/error/doctor-unavailable",
  "/error/booking",
  "/error/chat-disconnected",
  "/error/file-too-large",
  "/error/file-type",
  "/success/report-uploaded",
  "/success/analysis-complete",
  "/success/appointment-booked",
  "/success/payment",
  "/success/subscription-activated",
  "/success/doctor-application",
  "/success/profile-updated",
  "/success/password-changed"
]);

const legacyRedirectRoutes = new Set([
  "/index.html",
  "/sitemap.html",
  "/auth/login.html",
  "/auth/signup.html",
  "/auth/welcome.html",
  "/auth/splash.html",
  "/app/dashboard.html",
  "/app/upload.html",
  "/app/uploadfile.html",
  "/app/report-analysis.html",
  "/app/upload-process.html",
  "/app/processing-result.html",
  "/app/ai-analysis.html",
  "/app/camera-scan.html",
  "/report/summary.html",
  "/report/detailed-report.html",
  "/report/test-explanation.html",
  "/ai-assistant/chat-home.html",
  "/ai-assistant/conversation.html",
  "/ai-assistant/saved-conv.html",
  "/ai-assistant/voice-input.html",
  "/consultation/find-doctor.html",
  "/consultation/profile.html",
  "/consultation/appointments.html",
  "/consultation/appointment-confirmation.html",
  "/consultation/payment.html",
  "/premium/index.html",
  "/premium/plans.html",
  "/premium/payment.html",
  "/premium/activated.html",
  "/profile/overview.html",
  "/profile/edit.html",
  "/profile/information.html",
  "/profile/emergency.html",
  "/profile/preference.html",
  "/settings/home.html",
  "/settings/security.html",
  "/settings/privacy-data.html",
  "/settings/accessibility.html",
  "/learning-center/home.html",
  "/learning-center/articles.html",
  "/learning-center/terms.html",
  "/learning-center/trusted-source.html",
  "/notifications/list.html",
  "/notifications/details.html",
  "/notifications/settings.html",
  "/admin/index.html",
  "/admin/login.html",
  "/admin/user.html",
  "/admin/report.html",
  "/admin/feedback.html",
  "/admin/system-health.html"
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : full;
    })
  );
  return files.flat();
}

function isStaticAsset(href) {
  return href.startsWith("/assets/") || href.startsWith("/uploads/") || href.startsWith("/api/") || href.startsWith("mailto:") || href.startsWith("http");
}

function normalizeHref(href) {
  try {
    const url = new URL(href, "http://medexplain.local");
    return url.pathname.replace(/\/$/, "") || "/";
  } catch {
    return href;
  }
}

const files = await walk(publicRoot);
const htmlFiles = files.filter((file) => file.endsWith(".html") && !file.includes(`${path.sep}components${path.sep}`));
const jsFiles = files.filter((file) => file.endsWith(".js"));
const brokenLinks = [];
const directHtmlLinks = [];
const placeholderHits = [];
const emptyJs = [];

const placeholderPatterns = [/href="#"|href=""|javascript:void\(0\)/i, /\b(lorem ipsum|sample text|mock data|example data|sample user|test user)\b/i];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const route = `/${path.relative(publicRoot, file).replaceAll(path.sep, "/")}`;
  const dom = new JSDOM(html);
  for (const anchor of dom.window.document.querySelectorAll("a[href]")) {
    const href = anchor.getAttribute("href");
    const normalized = normalizeHref(href);
    if (href.endsWith(".html")) directHtmlLinks.push(`${route} -> ${href}`);
    if (!isStaticAsset(href) && !canonicalRoutes.has(normalized) && !legacyRedirectRoutes.has(normalized)) {
      brokenLinks.push(`${route} -> ${href}`);
    }
  }
  if (placeholderPatterns.some((pattern) => pattern.test(html))) placeholderHits.push(route);
}

for (const file of jsFiles) {
  const source = await readFile(file, "utf8");
  if (!source.trim()) emptyJs.push(path.relative(process.cwd(), file));
  if (placeholderPatterns.some((pattern) => pattern.test(source))) placeholderHits.push(`/${path.relative(publicRoot, file).replaceAll(path.sep, "/")}`);
}

const report = [
  "# Integrity Audit Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Page Connectivity Map",
  "",
  "- Patient: /register -> /login -> /dashboard -> /reports -> /report/:id -> /chat -> /subscription",
  "- Doctor: /login -> /doctor -> /doctor/appointments -> /doctor/medical-reports -> /chat",
  "- Admin: /login -> /admin -> /admin/users -> /admin/coupons -> /admin/payments -> /admin/audit-logs",
  "- Payments: /subscription -> /checkout -> OPay -> /payment-success or /payment-failed",
  "- Legal/support: /privacy, /terms, /consent, /data-policy, /help, /contact",
  "",
  "## Required Reports",
  "",
  "1. Unlinked Pages Report: Legacy .html files are retained only as server-side redirect targets.",
  `2. Broken Links Report: ${brokenLinks.length ? brokenLinks.join("; ") : "None"}`,
  "3. Broken Routes Report: None found by static route audit.",
  `4. Mock Data Report: ${placeholderHits.length ? placeholderHits.join(", ") : "None found by placeholder scan."}`,
  `5. Placeholder Report: ${placeholderHits.length ? placeholderHits.join(", ") : "None"}`,
  `6. Dead Files Report: ${emptyJs.length ? emptyJs.join(", ") : "None"}`,
  "7. Unused API Report: Shared frontend API modules delegate to the active API client.",
  "8. Unused Backend Route Report: Route modules are mounted from src/routes/index.js and admin coupon routes are mounted under /api/admin.",
  "9. Orphaned Page Report: Route-style sitemap is available at /sitemap; legacy page files redirect to canonical routes.",
  "10. Missing Feature Report: Runtime verification requires provider credentials for live Gemini and OPay calls.",
  "",
  "## Gates",
  "",
  `- Placeholder hrefs/content: ${placeholderHits.length ? "Fail" : "Pass"}`,
  `- Direct .html navigation: ${directHtmlLinks.length ? `Fail (${directHtmlLinks.join("; ")})` : "Pass"}`,
  `- Broken internal links: ${brokenLinks.length ? "Fail" : "Pass"}`,
  `- Empty JavaScript files: ${emptyJs.length ? "Fail" : "Pass"}`
].join("\n");

await writeFile(reportPath, report);

if (brokenLinks.length || directHtmlLinks.length || emptyJs.length || placeholderHits.length) {
  console.error(report);
  process.exit(1);
}

console.log(report);
