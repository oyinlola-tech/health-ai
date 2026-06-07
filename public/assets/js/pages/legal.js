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
  const content = {
    "/settings": {
      badge: "Protected",
      sections: [
        ["Account", "Manage profile details, password recovery, and active sessions from your secure account workspace.", "account_circle", "/profile"],
        ["Privacy and consent", "Review medical processing, AI analysis, doctor sharing, and payment permissions.", "privacy_tip", "/consent"],
        ["Plan and billing", "Check subscription access, usage limits, and verified OPay billing history.", "workspace_premium", "/subscription"]
      ]
    },
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
        ["Account help", "Use this path for login, profile, consent, or access issues.", "support_agent", "/profile"],
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
    ${pageHeader(meta)}
    <section class="card card-accent stack">
      <div class="card-header">
        <div>
          <h2>${escapeHtml(meta.title)}</h2>
          <p class="muted">${escapeHtml(meta.description)}</p>
        </div>
        <span class="badge">${escapeHtml(content.badge)}</span>
      </div>
    </section>
    <section class="grid grid-3">
      ${content.sections.map(([title, description, iconName, href]) => `<article class="card stack"><div class="icon-tile">${icon(iconName)}</div><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(description)}</p><a class="btn btn-quiet" href="${href}">Open</a></article>`).join("")}
    </section>
  `);
}

function renderStaticFallback(meta) {
  return `<section class="card stack"><div class="icon-tile">${icon("info")}</div><h2>${escapeHtml(meta.title)}</h2><p class="muted">${escapeHtml(meta.description)}</p><div class="actions"><a class="btn btn-primary" href="/dashboard">Return to dashboard</a><a class="btn btn-secondary" href="/help">Open help</a></div></section>`;
}

const legalFallbacks = {
  terms: [
    "MedExplain AI provides AI medical report explanations, verified doctor marketplace workflows, OPay-backed payments, real-time consultation tools, and privacy controls.",
    "AI explanations are informational only. MedExplain AI is not a doctor, does not diagnose conditions, does not prescribe treatment, and does not replace emergency or professional medical care.",
    "Users must provide accurate information, upload only records they are authorized to use, keep account credentials safe, and avoid abuse, scraping, impersonation, fraud, prompt-injection attempts, or unauthorized access.",
    "Payments are processed through OPay and premium access activates only after server-side verification. Refunds may be limited by payment status, subscription consumption, fraud review, provider rules, and applicable law.",
    "Doctor verification reduces risk but does not guarantee clinical outcomes, availability, future conduct, or suitability for every user.",
    "Accounts may be restricted or terminated for abuse, safety risks, non-payment, fraud, privacy violations, legal compliance, or attempts to bypass controls."
  ],
  privacy: [
    "MedExplain AI collects profile data, medical reports, extracted report text, AI chat history, payment records, consultation records, consent records, and security/audit logs required to operate the platform.",
    "Data is stored in MySQL and backend-controlled file storage. Uploaded reports are not exposed from the public web directory.",
    "Gemini AI processing happens through backend services only and is controlled by consent checks, rate limits, trusted-source RAG, prompt-injection filters, and access controls.",
    "MedExplain AI does not sell medical data, publish medical reports publicly, or share patient data with unauthorized third parties.",
    "Doctors access patient information only through authorized consultation/report workflows and active doctor-sharing consent.",
    "Security practices include RBAC, input validation, SQL parameterization, secure uploads, audit logs, consent enforcement, rate limiting, and production-safe errors."
  ],
  "data-policy": [
    "Data is collected to operate accounts, explain reports, support consultations, process subscriptions, prevent abuse, and maintain auditability.",
    "Uploaded reports are used for extraction and AI explanations only when medical data processing and AI analysis consents are active.",
    "Doctors access patient data only when appointment/report relationships and doctor-sharing consent allow it.",
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
        <div class="actions"><a class="btn btn-primary" href="/consent">${icon("privacy_tip")}Manage consent</a><a class="btn btn-secondary" href="/contact">Contact support</a></div>
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
    <label class="toggle-row"><input type="checkbox" data-consent-toggle="${escapeHtml(consent.consentType)}" ${consent.granted ? "checked" : ""} /> <span>${consent.granted ? "Consent is active" : "Consent is not active"}</span></label>
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
    document.querySelectorAll("[data-consent-toggle]").forEach((input) => {
      input.addEventListener("change", async () => {
        input.disabled = true;
        try {
          await apiRequest("/legal/consents/status", {
            method: "POST",
            body: { consentType: input.dataset.consentToggle, granted: input.checked }
          });
          await renderConsentCenter();
        } catch {
          input.checked = !input.checked;
          input.disabled = false;
        }
      });
    });
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
