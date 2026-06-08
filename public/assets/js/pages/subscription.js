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
  const price = Number(plan.price_naira ?? plan.price_cents ?? 0);
  return `<article class="card stack">
    <div class="card-header"><div><h2>${escapeHtml(plan.name)}</h2><p class="muted">${plan.code === "FREE" ? "Included by default" : `${money(price, plan.currency)} / ${plan.interval}`}</p></div><span class="badge ${isCurrent ? "badge-success" : ""}">${isCurrent ? "Current" : "Available"}</span></div>
    <ul class="clean-list">${features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
    ${
      plan.code === "FREE"
        ? `<a class="btn btn-secondary" href="/reports">Use free plan</a>`
        : `<div class="form stack-sm" data-checkout-panel="${escapeHtml(plan.code)}">
            <label>Coupon code<input name="couponCode" autocomplete="off" placeholder="MED-8F3K2X"></label>
            <div class="form-message" data-plan-message hidden></div>
            <div class="muted" data-price-breakdown>Subtotal ${money(price, plan.currency)}. No coupon applied.</div>
            <div class="actions"><button class="btn btn-secondary" data-apply-coupon="${escapeHtml(plan.code)}" type="button">${icon("sell")}Apply coupon</button><button class="btn btn-primary" data-plan-code="${escapeHtml(plan.code)}" type="button">${icon("payments")}Continue</button></div>
          </div>`
    }
  </article>`;
}

function safeCheckoutUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function renderSubscription() {
  const meta = routeTitle("/subscription");
  setMain(`${pageHeader(meta)}${loadingState("Loading subscription")}`);
  try {
    const [response, aiUsage] = await Promise.all([apiRequest("/subscriptions/me"), apiRequest("/ai/usage/me")]);
    const data = response.data || {};
    const subscription = data.subscription || {};
    const trial = data.trial || {};
    setMain(`
      ${trial.status ? `<section class="card stack"><div class="card-header"><div><h2>Free Trial</h2><p class="muted">${trial.status === "active" ? `${trial.daysRemaining} day${trial.daysRemaining === 1 ? "" : "s"} remaining` : "Trial expired. Free access now applies."}</p></div><span class="badge ${trial.status === "active" ? "badge-success" : "badge-warning"}">${escapeHtml(trial.status)}</span></div></section>` : ""}
      ${renderUsageOverview(data)}
      ${renderAiUsageOverview(aiUsage.data?.usage || {})}
      <section class="grid grid-3">${(data.plans || []).map((plan) => renderPlanCard(plan, subscription.plan_code || data.plan)).join("")}</section>
      <section class="card stack"><h2>Billing Actions</h2><div class="actions"><a class="btn btn-secondary" href="/billing-history">Billing history</a><a class="btn btn-secondary" href="/update-plan">Update plan</a><a class="btn btn-secondary" href="/cancel-subscription">Cancel subscription</a></div></section>
    `);
    bindPlanButtons();
    bindCouponButtons();
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load subscription details")}`);
  }
}

function panelForPlan(planCode) {
  return document.querySelector(`[data-checkout-panel="${CSS.escape(planCode)}"]`);
}

function couponPayload(panel, planCode) {
  const couponCode = panel?.querySelector('[name="couponCode"]')?.value.trim().toUpperCase();
  return couponCode ? { planCode, couponCode } : { planCode };
}

function showPlanMessage(panel, stateName, text) {
  const message = panel?.querySelector("[data-plan-message]");
  if (!message) return;
  message.hidden = false;
  message.dataset.state = stateName;
  message.textContent = text;
}

function updateBreakdown(panel, quote) {
  const target = panel?.querySelector("[data-price-breakdown]");
  if (!target) return;
  target.textContent = `Subtotal ${money(quote.baseAmount)}. Discount ${money(quote.discountAmount)}. Total ${money(quote.finalAmount)}.`;
}

function bindCouponButtons() {
  document.querySelectorAll("[data-apply-coupon]").forEach((button) => {
    button.addEventListener("click", async () => {
      const planCode = button.dataset.applyCoupon;
      const panel = panelForPlan(planCode);
      const payload = couponPayload(panel, planCode);
      if (!payload.couponCode) {
        showPlanMessage(panel, "error", "Enter a coupon code first.");
        return;
      }
      button.disabled = true;
      try {
        const response = await apiRequest("/subscriptions/coupons/validate", { method: "POST", body: payload });
        updateBreakdown(panel, response.data || {});
        showPlanMessage(panel, "success", Number(response.data?.finalAmount || 0) === 0 ? "Coupon covers the full amount. Payment details will not be requested." : "Coupon applied.");
      } catch (error) {
        showPlanMessage(panel, "error", error.message || "Coupon could not be applied.");
      } finally {
        button.disabled = false;
      }
    });
  });
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
        const panel = panelForPlan(button.dataset.planCode);
        const response = await apiRequest("/subscriptions/checkout", { method: "POST", body: couponPayload(panel, button.dataset.planCode) });
        if (response.data?.checkoutSkipped) {
          state.dataCache.delete("subscription");
          setMain(`${pageHeader(routeTitle("/payment-success"))}${emptyState({ iconName: "verified", title: "Subscription activated", description: "The backend applied your promotion and activated access without requesting payment details.", actionLabel: "Open dashboard", actionHref: "/dashboard" })}`);
          return;
        }
        const checkoutUrl = safeCheckoutUrl(response.data?.checkoutUrl || response.checkoutUrl);
        if (!checkoutUrl) throw new Error("Invalid checkout URL.");
        window.location.assign(checkoutUrl);
      } catch {
        button.disabled = false;
        if (message) {
          message.hidden = false;
          message.dataset.state = "error";
          message.textContent = "We could not start checkout. Please retry.";
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
    const rows = payments.map((payment) => ({
      reference: payment.provider_reference || "Payment record",
      amount: money(payment.amount_naira ?? payment.amount_cents, payment.currency),
      status: payment.status || "recorded",
      date: payment.created_at ? new Date(payment.created_at).toLocaleDateString() : "Recently"
    }));
    setMain(`
      <section class="patient-command">
        ${DataTable({ title: "Transaction history", description: "Search payment records by reference, amount, status, or date.", rows, columns: [["reference", "Reference"], ["amount", "Amount"], ["status", "Status"], ["date", "Date"]], searchKey: "reference", emptyKey: "payments", actions: [{ label: "Manage plan", href: "/subscription", primary: true }] })}
      </section>
    `);
    bindOperationsControls();
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
    const response = await apiRequest("/subscriptions/verify", { method: "POST", body: { reference } });
    const payment = response.data?.payment || {};
    if (payment.status !== "verified") {
      setMain(`${pageHeader(meta)}${emptyState({ iconName: "pending", title: "Payment confirmation pending", description: "OPay has not sent verified webhook confirmation yet. Access activates automatically when the backend receives it.", actionLabel: "Check billing history", actionHref: "/billing-history" })}`);
      return;
    }
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
