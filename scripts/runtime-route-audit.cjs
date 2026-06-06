const routes = [
  "/",
  "/login",
  "/register",
  "/dashboard",
  "/reports",
  "/report/00000000-0000-7000-8000-000000000001",
  "/chat",
  "/doctors",
  "/doctor/00000000-0000-7000-8000-000000000002",
  "/profile",
  "/settings",
  "/subscription",
  "/help",
  "/contact",
  "/privacy",
  "/terms",
  "/admin",
  "/doctor"
];

const baseUrl = process.env.ROUTE_AUDIT_BASE_URL || "http://127.0.0.1:3000";

(async () => {
  const failures = [];

  for (const route of routes) {
    try {
      const response = await fetch(`${baseUrl}${route}`, { signal: AbortSignal.timeout(5000) });
      const body = await response.text();

      if (!response.ok) failures.push(`${route}: HTTP ${response.status}`);
      if (!body.includes("<title>MedExplain AI</title>")) failures.push(`${route}: missing app shell title`);
      if (!body.includes("/assets/js/frontend-app.js")) failures.push(`${route}: missing frontend app script`);
      if (!body.includes("/assets/css/app.css")) failures.push(`${route}: missing shared app stylesheet`);
    } catch (error) {
      failures.push(`${route}: ${error.message}`);
    }
  }

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(`HTTP route audit passed for ${routes.length} route-style paths.`);
})();
