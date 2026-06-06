/**
 * @file Path normalization, route titles, route dispatch, and global bindings.
 * @module assets/js/router/router.js
 */

// -----------------------------------------------------------------------------
// Path normalization, route titles, route dispatch, and global bindings.
// -----------------------------------------------------------------------------

function normalizePath(pathname) {
  const cleanPath = pathname.replace(/\/$/, "") || "/";
  if (routeAliases.has(cleanPath)) return routeAliases.get(cleanPath);
  if (cleanPath.startsWith("/report/") || cleanPath.startsWith("/reports/") || cleanPath.startsWith("/analysis/")) return "/report/:id";
  if (cleanPath === "/doctor-dashboard") return "/doctor";
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
  return pageMeta[path] || { title: "Page unavailable", description: "Use the navigation to continue in your healthcare workspace." };
}

function renderNotFound() {
  setMain(`${pageHeader(routeTitle(state.path))}${emptyState({ iconName: "map", title: "Page unavailable", description: "Use the navigation to continue in your healthcare workspace.", actionLabel: "Go to dashboard", actionHref: "/dashboard" })}`);
}

function bindGlobalActions() {
  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "retry") rerenderCurrentRoute();
    if (action === "logout") {
      clearAccessToken();
      window.location.assign("/login");
    }
  });
}

function bindRealtimeUpdates() {
  window.addEventListener("medexplain:realtime", (event) => {
    const { type, payload } = event.detail || {};
    const toast = document.querySelector("[data-realtime-toast]");
    if (toast && ["notification_push", "appointment_created", "appointment_confirmed", "message_receive", "ai_analysis_ready"].includes(type)) {
      toast.hidden = false;
      toast.textContent = payload?.notification?.title || payload?.type || type.replaceAll("_", " ");
      window.setTimeout(() => {
        toast.hidden = true;
      }, 3200);
    }

    if (type?.startsWith("ai_processing")) {
      const card = document.querySelector("[data-ai-progress-card]");
      const bar = document.querySelector("[data-ai-progress-bar]");
      const value = document.querySelector("[data-ai-progress-value]");
      const text = document.querySelector("[data-ai-progress-text]");
      if (card && bar && value && text) {
        const progress = Math.max(0, Math.min(100, Number(payload?.progress || 0)));
        card.hidden = false;
        bar.style.width = `${progress}%`;
        value.textContent = `${progress}%`;
        text.textContent = payload?.status || type.replaceAll("_", " ");
      }
    }

    if (type === "message_receive" && document.querySelector("[data-consultation-output]")) {
      const stack = document.querySelector("[data-consultation-output] .stack");
      if (stack && payload?.message?.content) stack.insertAdjacentHTML("beforeend", `<p class="message-bubble">${escapeHtml(payload.message.content)}</p>`);
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
  if (state.path === "/doctors") return renderDoctors();
  if (state.path === "/doctor-careers") return renderDoctorCareers();
  if (state.path === "/doctor/:id") return renderDoctorProfile();
  if (state.path === "/appointments") return renderAppointments();
  if (state.path === "/profile") return renderProfile();
  if (state.path === "/subscription" || state.path === "/update-plan" || state.path === "/checkout") return renderSubscription();
  if (state.path === "/billing-history") return renderBillingHistory();
  if (state.path === "/payment-success") return renderPaymentStatus(true);
  if (state.path === "/payment-failed") return renderPaymentStatus(false);
  if (state.path === "/cancel-subscription") return renderCancelSubscription();
  if (state.path === "/terms") return renderLegalPage("terms");
  if (state.path === "/privacy") return renderLegalPage("privacy");
  if (state.path === "/data-policy") return renderLegalPage("data-policy");
  if (state.path === "/consent") return renderConsentCenter();
  if (recoveryPages[state.path]) return renderRecoveryPage(state.path);
  if (emptyPages[state.path]) return renderEmptyPage(state.path);
  if (successPages[state.path]) return renderSuccessPage(state.path);
  if (["/settings", "/help", "/contact"].includes(state.path)) return renderStaticPage(state.path);
  if (state.path === "/doctor" || state.path.startsWith("/doctor/")) return renderDoctorDashboard();
  if (state.path === "/admin" || state.path.startsWith("/admin/")) return renderAdminDashboard();
  return renderNotFound();
}

/**
 * Starts the frontend application after all responsibility modules have loaded.
 * Preserves the original startup order: shell, realtime client, actions, realtime events, route render.
 * @returns {void}
 */
function startFrontendApp() {
  renderShell();
  if (getAccessToken()) loadRealtimeClient();
  bindGlobalActions();
  bindRealtimeUpdates();
  route();
}
