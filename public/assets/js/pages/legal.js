/**
 * @file Profile, static, legal, privacy, and consent pages.
 * @module assets/js/pages/legal.js
 */

// -----------------------------------------------------------------------------
// Profile, static, legal, privacy, and consent pages.
// -----------------------------------------------------------------------------

async function renderProfile() {
  const meta = routeTitle("/profile");
  setMain(`${pageHeader(meta)}${loadingState("Loading profile")}`);
  try {
    const response = await cachedRequest("me", "/me");
    const user = response.data?.user || response.data || {};
    setMain(`
      ${pageHeader(meta)}
      <section class="form-card">
        <form class="form" data-profile-form novalidate>
          <div class="form-message" data-form-message hidden></div>
          ${field("First name", "firstName", "text", true, user.firstName || "")}
          ${field("Last name", "lastName", "text", true, user.lastName || "")}
          <button class="btn btn-primary" type="submit">${icon("save")}Save profile</button>
        </form>
      </section>
    `);
    document.querySelector("[data-profile-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!validateForm(form)) return;
      const payload = Object.fromEntries(new FormData(form).entries());
      setSubmitLoading(form, true);
      try {
        await apiRequest("/me", { method: "PUT", body: payload });
        showFormMessage(form, "success", "Profile saved.");
      } catch {
        showFormMessage(form, "error", "We could not save your profile. Please retry.");
      } finally {
        setSubmitLoading(form, false);
      }
    });
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load your profile")}`);
  }
}

function renderStaticPage(path) {
  const meta = routeTitle(path);
  if (path === "/settings") {
    renderSettings();
    return;
  }
  if (path === "/medical-knowledge") {
    renderMedicalKnowledge();
    return;
  }
  const content = {
    "/help": {
      badge: "Support",
      sections: [
        ["Upload reports", "Use PDF, PNG, JPG, JPEG, or WebP files. Keep one report per upload for cleaner extraction.", "upload_file", "/reports"],
        ["AI explanations", "MedExplain AI explains report content and suggests questions. It does not diagnose or replace a clinician.", "psychology", "/chat"],
        ["Doctor support", "Book verified doctor consultations when you need human review of reports or symptoms.", "stethoscope", "/doctors"]
      ]
    },
    "/contact": {
      badge: "Support",
      sections: [
        ["Account help", "Use this path for login, profile, or access issues.", "support_agent", "/profile"],
        ["Billing help", "Review subscriptions and payment records before contacting support about OPay transactions.", "receipt_long", "/billing-history"],
        ["Medical data help", "For upload, OCR, or AI explanation issues, include the report title and time of upload.", "description", "/reports"]
      ]
    }
  }[path];

  if (!content) {
    setMain(`${pageHeader(meta)}${renderStaticFallback(meta)}`);
    return;
  }

  setMain(`
    ${path === "/help" ? "" : pageHeader(meta)}
    <section class="grid grid-3">
      ${content.sections.map(([title, description, iconName, href]) => `<article class="card stack"><div class="icon-tile">${icon(iconName)}</div><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(description)}</p><a class="btn btn-quiet" href="${href}">Open</a></article>`).join("")}
    </section>
  `);
}

function stripKnowledgeMarkup(text = "") {
  const container = document.createElement("div");
  container.innerHTML = String(text || "");
  return (container.textContent || container.innerText || "").replace(/\s+/g, " ").trim();
}

function knowledgeSummary(text = "", maxLength = 220) {
  const clean = stripKnowledgeMarkup(text);
  if (!clean) return "No summary is available for this imported source yet.";
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}

function renderKnowledgeSource(item = {}, index = 0) {
  return `<button class="knowledge-result" type="button" data-knowledge-result="${index}">
    <span class="caption">${escapeHtml(item.type || item.source || "Medical source")}</span>
    <strong>${escapeHtml(item.title || "Untitled source")}</strong>
    ${item.source ? `<span class="badge">${escapeHtml(item.source)}</span>` : ""}
    <span class="muted">${escapeHtml(knowledgeSummary(item.summary, 130))}</span>
  </button>`;
}

function renderKnowledgeDetail(item = null) {
  if (!item) {
    return `<section class="knowledge-detail empty-state">
      <div class="state-content">
        <div class="state-icon">${icon("manage_search")}</div>
        <h2>Search a medical term</h2>
        <p class="muted">Enter a word like triglycerides, tuberculosis, kidney disease, or vitamin C to view trusted MedlinePlus and PubMed information.</p>
      </div>
    </section>`;
  }

  return `<article class="knowledge-detail card stack">
    <div class="card-header">
      <div>
        <p class="caption">${escapeHtml(item.type || "Medical source")}</p>
        <h2>${escapeHtml(item.title || "Untitled source")}</h2>
      </div>
      ${item.source ? `<span class="badge">${escapeHtml(item.source)}</span>` : ""}
    </div>
    <p class="muted">${escapeHtml(stripKnowledgeMarkup(item.summary))}</p>
    ${item.url ? `<a class="btn btn-secondary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${icon("open_in_new")}Open trusted source</a>` : ""}
  </article>`;
}

function renderKnowledgeResults(results = [], hasSearched = false) {
  if (!hasSearched) return `<div class="knowledge-results"><p class="muted">Results will appear here after you search.</p></div>`;
  if (!results.length) {
    return `<div class="knowledge-results">${emptyState({ iconName: "travel_explore", title: "No matching source found", description: "Try another medical word or a shorter term.", actionLabel: "", actionHref: "" })}</div>`;
  }
  return `<div class="knowledge-results">${results.map(renderKnowledgeSource).join("")}</div>`;
}

function bindKnowledgeResultClicks(results = []) {
  document.querySelectorAll("[data-knowledge-result]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.knowledgeResult || 0);
      document.querySelectorAll("[data-knowledge-result]").forEach((item) => item.removeAttribute("aria-current"));
      button.setAttribute("aria-current", "true");
      const detail = document.querySelector("[data-knowledge-detail]");
      if (detail) detail.innerHTML = renderKnowledgeDetail(results[index]);
    });
  });
}

async function renderMedicalKnowledge() {
  setMain(`
    <section class="medical-knowledge-page">
      <section class="form-card knowledge-search-card">
        <form class="form" data-knowledge-search novalidate>
          <div class="field">
            <label for="knowledge-query">Search medical knowledge</label>
            <div class="knowledge-search-row">
              <input id="knowledge-query" name="q" type="search" required minlength="2" autocomplete="off" placeholder="Search a term or topic" />
              <button class="btn btn-primary" type="submit">${icon("search")}Search</button>
            </div>
          </div>
          <p class="muted">Sources come from imported MedlinePlus topics, MedlinePlus definitions, and PubMed articles.</p>
          <div class="form-message" data-form-message hidden></div>
        </form>
      </section>
      <section class="knowledge-browser">
        <div data-knowledge-results>${renderKnowledgeResults([], false)}</div>
        <div data-knowledge-detail>${renderKnowledgeDetail()}</div>
      </section>
    </section>
  `);

  const form = document.querySelector("[data-knowledge-search]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = new FormData(form).get("q")?.toString().trim();
    const message = form.querySelector("[data-form-message]");
    if (!query || query.length < 2) {
      showFormMessage(form, "error", "Enter at least two characters to search.");
      return;
    }
    if (message) message.hidden = true;
    const resultsTarget = document.querySelector("[data-knowledge-results]");
    const detailTarget = document.querySelector("[data-knowledge-detail]");
    resultsTarget.innerHTML = `<div class="knowledge-results"><p class="muted">Searching trusted sources...</p></div>`;
    detailTarget.innerHTML = renderKnowledgeDetail();
    try {
      const response = await apiRequest(`/medical-knowledge/search?q=${encodeURIComponent(query)}`);
      const results = response.data?.results || [];
      resultsTarget.innerHTML = renderKnowledgeResults(results, true);
      detailTarget.innerHTML = renderKnowledgeDetail(results[0] || null);
      bindKnowledgeResultClicks(results);
      document.querySelector("[data-knowledge-result]")?.setAttribute("aria-current", "true");
    } catch (error) {
      resultsTarget.innerHTML = errorState(error?.status === 401 ? "Please sign in again." : "Server connection unavailable. Please try again.", false);
    }
  });
}

async function renderSettings() {
  const meta = routeTitle("/settings");
  setMain(`${pageHeader(meta)}${loadingState("Loading settings")}`);
  try {
    const [settingsResponse, subscriptionResponse] = await Promise.all([apiRequest("/me/settings"), apiRequest("/subscriptions/me").catch(() => ({ data: {} }))]);
    const settings = settingsResponse.data?.settings || {};
    const profile = settings.profile || {};
    const notifications = settings.notifications || {};
    const privacy = settings.privacy || {};
    const billingAddress = settings.billingAddress || {};
    const subscription = subscriptionResponse.data || {};
    setMain(`
      <section class="grid grid-2">
        <article class="form-card">
          <form class="form" data-settings-profile-form novalidate>
            <div class="card-header"><div><h2>Profile Settings</h2><p class="muted">Name and email changes are saved to your account.</p></div>${icon("account_circle")}</div>
            <div class="form-message" data-form-message hidden></div>
            ${field("First name", "firstName", "text", true, profile.firstName || "")}
            ${field("Last name", "lastName", "text", true, profile.lastName || "")}
            ${field("Email address", "email", "email", true, profile.email || "")}
            <label class="actions"><input type="checkbox" name="consentPromptLearning" ${profile.consentPromptLearning ? "checked" : ""} /> <span class="muted">Use my reports, messages, conversations, and AI responses to improve MedExplain AI.</span></label>
            <button class="btn btn-primary hide" type="submit" data-save-on-change>${icon("save")}Save profile</button>
          </form>
        </article>
        <article class="form-card">
          <form class="form" data-settings-password-form novalidate>
            <div class="card-header"><div><h2>Security Settings</h2><p class="muted">Changing your password signs out existing refresh sessions.</p></div>${icon("lock")}</div>
            <div class="form-message" data-form-message hidden></div>
            ${field("Current password", "currentPassword", "password", true)}
            ${field("New password", "newPassword", "password", true)}
            <button class="btn btn-primary hide" type="submit" data-save-on-change>${icon("key")}Change password</button>
          </form>
        </article>
        <article class="form-card">
          <form class="form" data-settings-notifications-form novalidate>
            <div class="card-header"><div><h2>Notification Settings</h2><p class="muted">Choose which account events generate notifications.</p></div>${icon("notifications")}</div>
            <div class="form-message" data-form-message hidden></div>
            ${settingsCheckbox("email", "Email notifications", notifications.email)}
            ${settingsCheckbox("product", "Product updates", notifications.product)}
            ${settingsCheckbox("security", "Security alerts", notifications.security)}
            ${settingsCheckbox("billing", "Billing and payment alerts", notifications.billing)}
            ${settingsCheckbox("doctor", "Doctor and appointment alerts", notifications.doctor)}
            <button class="btn btn-primary hide" type="submit" data-save-on-change>${icon("save")}Save notifications</button>
          </form>
        </article>
        <article class="form-card">
          <form class="form" data-settings-privacy-form novalidate>
            <div class="card-header"><div><h2>Privacy Settings</h2><p class="muted">Privacy preferences are stored with your account metadata.</p></div>${icon("privacy_tip")}</div>
            <div class="form-message" data-form-message hidden></div>
            <div class="field"><label for="profileVisibility">Profile visibility</label><select id="profileVisibility" name="profileVisibility"><option value="private" ${privacy.profileVisibility === "private" ? "selected" : ""}>Private</option><option value="doctors" ${privacy.profileVisibility === "doctors" ? "selected" : ""}>Verified doctors</option></select><span class="field-error" data-error-for="profileVisibility"></span></div>
            ${settingsCheckbox("allowDoctorSharing", "Doctor sharing preference", privacy.allowDoctorSharing)}
            ${settingsCheckbox("allowAiAnalysis", "AI analysis preference", privacy.allowAiAnalysis)}
            ${settingsCheckbox("allowPromptLearning", "AI training and improvement preference", privacy.allowPromptLearning)}
            <button class="btn btn-primary hide" type="submit" data-save-on-change>${icon("save")}Save privacy</button>
          </form>
        </article>
        <article class="form-card">
          <form class="form" data-settings-billing-address-form novalidate>
            <div class="card-header"><div><h2>Billing Address</h2><p class="muted">Used for billing records and payment receipts.</p></div>${icon("location_on")}</div>
            <div class="form-message" data-form-message hidden></div>
            ${field("Billing name", "fullName", "text", false, billingAddress.fullName || "")}
            ${field("Phone number", "phone", "tel", false, billingAddress.phone || "")}
            ${field("Address line 1", "line1", "text", false, billingAddress.line1 || "")}
            ${field("Address line 2", "line2", "text", false, billingAddress.line2 || "")}
            ${field("City", "city", "text", false, billingAddress.city || "")}
            ${field("State", "state", "text", false, billingAddress.state || "")}
            ${field("Postal code", "postalCode", "text", false, billingAddress.postalCode || "")}
            ${field("Country", "country", "text", false, billingAddress.country || "Nigeria")}
            <button class="btn btn-primary hide" type="submit" data-save-on-change>${icon("save")}Save billing address</button>
          </form>
        </article>
      </section>
      <section class="card stack">
        <div class="card-header">
          <div><h2>Subscription Settings</h2><p class="muted">${escapeHtml(subscription.plan || "FREE")} access is managed through the billing workspace.</p></div>
          <span class="badge">${escapeHtml(subscription.subscription?.status || subscription.trial?.status || "free")}</span>
        </div>
        <div class="actions"><a class="btn btn-secondary" href="/subscription">Manage plan</a><a class="btn btn-secondary" href="/billing-history">Billing history</a></div>
      </section>
    `);
    bindSettingsForms();
  } catch (error) {
    setMain(`${pageHeader(meta)}${errorState(error?.status === 401 ? "Please sign in again." : "Server connection unavailable. Please try again.")}`);
  }
}

function settingsCheckbox(name, label, checked = true) {
  return `<label class="actions"><input type="checkbox" name="${escapeHtml(name)}" ${checked ? "checked" : ""} /> <span class="muted">${escapeHtml(label)}</span></label>`;
}

function checked(form, name) {
  return Boolean(form.querySelector(`[name="${CSS.escape(name)}"]`)?.checked);
}

function markSettingsFormSaved(form) {
  form.dataset.dirty = "false";
  const button = form.querySelector("[data-save-on-change]");
  if (!button) return;
  button.classList.add("hide");
}

function watchSettingsFormChanges(form) {
  const button = form.querySelector("[data-save-on-change]");
  if (!button) return;
  const showSave = () => {
    form.dataset.dirty = "true";
    button.classList.remove("hide");
  };
  form.addEventListener("input", showSave);
  form.addEventListener("change", showSave);
  markSettingsFormSaved(form);
}

function bindSettingsForms() {
  document.querySelectorAll("[data-settings-profile-form], [data-settings-password-form], [data-settings-notifications-form], [data-settings-privacy-form], [data-settings-billing-address-form]").forEach(watchSettingsFormChanges);

  document.querySelector("[data-settings-profile-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return;
    const data = Object.fromEntries(new FormData(form).entries());
    await submitSettingsForm(form, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      consentPromptLearning: checked(form, "consentPromptLearning"),
      privacy: { allowPromptLearning: checked(form, "consentPromptLearning") }
    });
  });
  document.querySelector("[data-settings-password-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return;
    const data = Object.fromEntries(new FormData(form).entries());
    setSubmitLoading(form, true);
    try {
      await apiRequest("/me/password", { method: "PUT", body: { currentPassword: data.currentPassword, newPassword: data.newPassword } });
      form.reset();
      markSettingsFormSaved(form);
      showFormMessage(form, "success", "Password changed. Sign in again on other devices.");
    } catch (error) {
      showFormMessage(form, "error", error?.status === 401 ? "Current password is incorrect." : "Server connection unavailable. Please try again.");
    } finally {
      setSubmitLoading(form, false);
    }
  });
  document.querySelector("[data-settings-notifications-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    await submitSettingsForm(form, {
      notifications: {
        email: checked(form, "email"),
        product: checked(form, "product"),
        security: checked(form, "security"),
        billing: checked(form, "billing"),
        doctor: checked(form, "doctor")
      }
    });
  });
  document.querySelector("[data-settings-privacy-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    await submitSettingsForm(form, {
      privacy: {
        profileVisibility: form.querySelector('[name="profileVisibility"]').value,
        allowDoctorSharing: checked(form, "allowDoctorSharing"),
        allowAiAnalysis: checked(form, "allowAiAnalysis"),
        allowPromptLearning: checked(form, "allowPromptLearning")
      }
    });
  });
  document.querySelector("[data-settings-billing-address-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    await submitSettingsForm(form, {
      billingAddress: {
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country
      }
    });
  });
}

async function submitSettingsForm(form, body) {
  setSubmitLoading(form, true);
  try {
    await apiRequest("/me/settings", { method: "PUT", body });
    markSettingsFormSaved(form);
    showFormMessage(form, "success", "Settings saved.");
  } catch (error) {
    const message = error?.status === 401 ? "Please sign in again." : error?.status === 409 ? "That email address is already in use." : "Server connection unavailable. Please try again.";
    showFormMessage(form, "error", message);
  } finally {
    setSubmitLoading(form, false);
  }
}

function renderStaticFallback(meta) {
  return `<section class="card stack"><div class="icon-tile">${icon("info")}</div><h2>${escapeHtml(meta.title)}</h2><p class="muted">${escapeHtml(meta.description)}</p><div class="actions"><a class="btn btn-primary" href="/dashboard">Return to dashboard</a><a class="btn btn-secondary" href="/help">Open help</a></div></section>`;
}

const legalFallbacks = {
  terms: [
    "MedExplain AI provides AI medical report explanations, verified doctor marketplace workflows, OPay-backed payments, real-time consultation tools, and privacy controls.",
    "AI explanations are informational only. MedExplain AI is not a doctor, does not diagnose conditions, does not prescribe treatment, and does not replace emergency or professional medical care.",
    "Creating an account means you agree to the platform permissions required to operate MedExplain AI, including medical report processing, AI analysis, doctor sharing for consultation workflows, payment processing, audit logging, account security checks, and AI training/improvement from saved reports, messages, conversations, and AI responses.",
    "Users must provide accurate information, upload only records they are authorized to use, keep account credentials safe, and avoid abuse, scraping, impersonation, fraud, prompt-injection attempts, or unauthorized access.",
    "Payments are processed through OPay and premium access activates only after server-side verification. Refunds may be limited by payment status, subscription consumption, fraud review, provider rules, and applicable law.",
    "Doctor verification reduces risk but does not guarantee clinical outcomes, availability, future conduct, or suitability for every user.",
    "Accounts may be restricted or terminated for abuse, safety risks, non-payment, fraud, privacy violations, legal compliance, or attempts to bypass controls."
  ],
  privacy: [
    "MedExplain AI collects profile data, medical reports, extracted report text, AI chat history, AI responses, payment records, consultation records, consent records, and security/audit logs required to operate the platform.",
    "Data is stored in MySQL and backend-controlled file storage. Uploaded reports are not exposed from the public web directory.",
    "Gemini AI processing happens through backend services only and is controlled by account permissions, rate limits, trusted-source RAG, prompt-injection filters, and access controls. Saved reports, messages, conversations, and AI responses may be used to train and improve MedExplain AI unless the user turns off the related preference in Settings.",
    "MedExplain AI does not sell medical data, publish medical reports publicly, or share patient data with unauthorized third parties.",
    "Doctors access patient information only through authorized consultation/report workflows.",
    "Security practices include RBAC, input validation, SQL parameterization, secure uploads, audit logs, account permission checks, rate limiting, and production-safe errors."
  ],
  "data-policy": [
    "Data is collected to operate accounts, explain reports, support consultations, process subscriptions, prevent abuse, and maintain auditability.",
    "Uploaded reports are used for extraction, AI explanations, and AI training/improvement under the account terms accepted when a user creates an account.",
    "Doctors access patient data only when appointment/report relationships allow it.",
    "Admins use logs, payment records, AI usage metrics, recruitment records, and audit trails to operate and secure the system.",
    "MedExplain AI does not sell data, expose medical reports publicly, misuse external marketing tracking, or let AI systems directly access the database.",
    "Consent records are timestamped and include request metadata for compliance tracking."
  ]
};

async function renderLegalPage(slug) {
  const meta = routeTitle(slug === "data-policy" ? "/data-policy" : `/${slug}`);
  setMain(`${pageHeader(meta)}${loadingState("Loading policy")}`);
  try {
    const response = await apiRequest("/legal/policies");
    const policy = (response.data?.policies || []).find((item) => item.slug === slug || item.policy_key === slug);
    const paragraphs = policy?.body ? String(policy.body).split(/\n{2,}/) : legalFallbacks[slug];
    setMain(`
      ${pageHeader(meta)}
      <section class="card stack">
        <div class="card-header"><div><h2>${escapeHtml(policy?.title || meta.title)}</h2><p class="muted">Version ${escapeHtml(policy?.version || "current")}</p></div><span class="badge">Legal</span></div>
        ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        <div class="actions"><a class="btn btn-secondary" href="/contact">Contact support</a></div>
      </section>
    `);
  } catch {
    const paragraphs = legalFallbacks[slug] || [];
    setMain(`${pageHeader(meta)}<section class="card stack">${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`);
  }
}

function renderConsentToggle(consent) {
  return `<article class="card stack">
    <div class="card-header"><div><h2>${escapeHtml(consent.label)}</h2><p class="muted">${escapeHtml(consent.consentType)}</p></div><span class="badge ${consent.granted ? "badge-success" : "badge-error"}">${consent.granted ? "Granted" : "Revoked"}</span></div>
    <p class="muted">${consent.granted ? "Covered by your account terms." : "Access is currently restricted for this permission."}</p>
    <p class="muted">Last updated ${escapeHtml(consent.updatedAt || consent.grantedAt || consent.revokedAt || "not recorded")}</p>
  </article>`;
}

async function renderConsentCenter() {
  const meta = routeTitle("/consent");
  setMain(`${pageHeader(meta)}${loadingState("Loading consent controls")}`);
  try {
    const response = await apiRequest("/legal/consents/status");
    const consents = response.data?.consents || [];
    setMain(`
      ${pageHeader(meta)}
      <section class="grid grid-2">${consents.map(renderConsentToggle).join("")}</section>
      <section class="card stack"><h2>Consent history</h2><p class="muted">Download a timestamped JSON log of consent grants and revocations for your account.</p><button class="btn btn-secondary" type="button" data-download-consent>${icon("download")}Download history</button></section>
    `);
    document.querySelector("[data-download-consent]")?.addEventListener("click", async () => {
      const history = await apiRequest("/legal/consents/history");
      const blob = new Blob([JSON.stringify(history.data?.history || [], null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "medexplain-consent-history.json";
      link.click();
      URL.revokeObjectURL(url);
    });
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load consent controls")}`);
  }
}
