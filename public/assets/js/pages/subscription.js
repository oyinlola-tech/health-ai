/**
 * @file Subscription, billing, payment status, and cancellation pages.
 * @module assets/js/pages/subscription.js
 */

// -----------------------------------------------------------------------------
// Subscription, billing, payment status, and cancellation pages.
// -----------------------------------------------------------------------------

function renderPlanCard(plan, currentPlan) {
  const isCurrent = currentPlan === plan.code || (currentPlan === "FREE" && plan.code === "FREE");
  const features = Array.isArray(plan.features) ? plan.features : [];
  return `<article class="card stack">
    <div class="card-header"><div><h2>${escapeHtml(plan.name)}</h2><p class="muted">${plan.interval === "free" ? "Included by default" : `${money(plan.price_cents, plan.currency)} / ${plan.interval}`}</p></div><span class="badge ${isCurrent ? "badge-success" : ""}">${isCurrent ? "Current" : "Available"}</span></div>
    <ul class="clean-list">${features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
    ${plan.code === "FREE" ? `<a class="btn btn-secondary" href="/reports">Use free plan</a>` : `<button class="btn btn-primary" data-plan-code="${escapeHtml(plan.code)}">${icon("payments")}Upgrade with OPay</button>`}
  </article>`;
}

async function renderSubscription() {
  const meta = routeTitle("/subscription");
  setMain(`${pageHeader(meta)}${loadingState("Loading subscription")}`);
  try {
    const [response, aiUsage] = await Promise.all([apiRequest("/subscriptions/me"), apiRequest("/ai/usage/me")]);
    const data = response.data || {};
    const subscription = data.subscription || {};
    setMain(`
      ${pageHeader(meta)}
      <section class="grid grid-3">
        ${summaryCard("Current Plan", "workspace_premium", data.plan || "FREE", "/update-plan")}
        ${summaryCard("Renewal Date", "event_repeat", subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "No renewal", "/billing-history")}
        ${summaryCard("Status", "verified", subscription.status || "free", "/subscription")}
      </section>
      ${renderUsageOverview(data)}
      ${renderAiUsageOverview(aiUsage.data?.usage || {})}
      <section class="grid grid-3">${(data.plans || []).map((plan) => renderPlanCard(plan, subscription.plan_code || data.plan)).join("")}</section>
      <section class="card stack"><h2>Billing Actions</h2><div class="actions"><a class="btn btn-secondary" href="/billing-history">Billing history</a><a class="btn btn-secondary" href="/update-plan">Update plan</a><a class="btn btn-secondary" href="/cancel-subscription">Cancel subscription</a></div></section>
    `);
    bindPlanButtons();
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load subscription details")}`);
  }
}

function bindPlanButtons() {
  document.querySelectorAll("[data-plan-code]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      const card = button.closest(".card");
      let message = card?.querySelector("[data-plan-message]");
      if (!message && card) {
        card.insertAdjacentHTML("afterbegin", `<div class="form-message" data-plan-message hidden></div>`);
        message = card.querySelector("[data-plan-message]");
      }
      try {
        const response = await apiRequest("/subscriptions/checkout", { method: "POST", body: { planCode: button.dataset.planCode } });
        window.location.assign(response.data?.checkoutUrl || response.checkoutUrl);
      } catch {
        button.disabled = false;
        if (message) {
          message.hidden = false;
          message.dataset.state = "error";
          message.textContent = "We could not start OPay checkout. Please retry.";
        }
      }
    });
  });
}

async function renderBillingHistory() {
  const meta = routeTitle("/billing-history");
  setMain(`${pageHeader(meta)}${loadingState("Loading billing history")}`);
  try {
    const response = await apiRequest("/subscriptions/billing-history");
    const payments = response.data?.payments || [];
    const rows = payments.map((payment) => `<tr><td>${escapeHtml(payment.provider_reference)}</td><td>${money(payment.amount_cents, payment.currency)}</td><td><span class="badge ${badgeClassForStatus(payment.status)}">${escapeHtml(payment.status)}</span></td><td>${new Date(payment.created_at).toLocaleDateString()}</td></tr>`).join("");
    setMain(`${pageHeader(meta)}<section class="table-card stack"><h2>Transaction History</h2><div class="table-wrap"><table><thead><tr><th>Reference</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows || `<tr><td colspan="4">No billing transactions yet.</td></tr>`}</tbody></table></div></section>`);
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load billing history")}`);
  }
}

async function renderPaymentStatus(success) {
  const meta = routeTitle(success ? "/payment-success" : "/payment-failed");
  const reference = new URLSearchParams(location.search).get("reference");
  if (!success || !reference) {
    setMain(`${pageHeader(meta)}${emptyState({ iconName: "payments", title: "Payment not completed", description: "No verified payment reference was provided.", actionLabel: "Back to subscription", actionHref: "/subscription" })}`);
    return;
  }
  setMain(`${pageHeader(meta)}${loadingState("Verifying payment")}`);
  try {
    await apiRequest("/subscriptions/verify", { method: "POST", body: { reference } });
    state.dataCache.delete("subscription");
    setMain(`${pageHeader(meta)}${emptyState({ iconName: "verified", title: "Premium activated", description: "OPay confirmed your payment and premium access is active.", actionLabel: "Open dashboard", actionHref: "/dashboard" })}`);
  } catch {
    setMain(`${pageHeader(routeTitle("/payment-failed"))}${errorState("OPay has not verified this payment", false)}<section class="actions"><a class="btn btn-primary" href="/subscription">Retry upgrade</a><a class="btn btn-secondary" href="/billing-history">Billing history</a></section>`);
  }
}

async function renderCancelSubscription() {
  const meta = routeTitle("/cancel-subscription");
  setMain(`${pageHeader(meta)}<section class="card stack"><h2>Cancel Premium</h2><p class="muted">Cancellation is processed on the server and records a billing audit event.</p><div class="actions"><button class="btn btn-primary" data-action="cancel-subscription">${icon("cancel")}Cancel subscription</button><a class="btn btn-secondary" href="/subscription">Keep plan</a></div></section>`);
  document.querySelector('[data-action="cancel-subscription"]')?.addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    try {
      await apiRequest("/subscriptions/cancel", { method: "POST" });
      state.dataCache.delete("subscription");
      setMain(`${pageHeader(meta)}${emptyState({ iconName: "done", title: "Subscription cancelled", description: "Premium access has been cancelled for this account.", actionLabel: "Return to subscription", actionHref: "/subscription" })}`);
    } catch {
      setMain(`${pageHeader(meta)}${errorState("We could not cancel this subscription", false)}`);
    }
  });
}

