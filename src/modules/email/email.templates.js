import { env } from "../../config/env.js";

const tokens = {
  primary: "#2B2724",
  secondary: "#A19890",
  tertiary: "#FF6E5C",
  background: "#FDF6F3",
  surface: "#FFFFFF",
  border: "#E8E4E1"
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function absoluteUrl(path = "/") {
  const base = env.PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function plainText({ greeting, message, ctaLabel, ctaUrl, footer = "MedExplain AI", keyData = {} }) {
  const dataLines = Object.entries(keyData).map(([key, value]) => `${key}: ${value}`);
  return [greeting, "", message, dataLines.length ? dataLines.join("\n") : "", ctaLabel && ctaUrl ? `${ctaLabel}: ${ctaUrl}` : "", "", footer]
    .filter(Boolean)
    .join("\n");
}

function layout({ title, preview, name, message, ctaLabel, ctaPath, metadata = "", footerNote = "", keyData = {} }) {
  const ctaUrl = ctaPath ? absoluteUrl(ctaPath) : null;
  const greeting = name ? `Hello ${name},` : "Hello,";
  const keyDataHtml = Object.entries(keyData)
    .map(
      ([key, value]) =>
        `<div class="data-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`
    )
    .join("");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin:0; background:${tokens.background}; color:${tokens.primary}; font-family: Inter, Arial, sans-serif; }
      .shell { width:100%; padding:32px 12px; }
      .container { max-width:640px; margin:0 auto; }
      .brand { font-weight:800; font-size:18px; color:${tokens.primary}; margin-bottom:16px; }
      .card { background:${tokens.surface}; border:1px solid ${tokens.border}; border-radius:8px; padding:28px; }
      h1 { margin:0 0 12px; color:${tokens.primary}; font-family: Georgia, serif; font-size:28px; line-height:1.2; letter-spacing:0; }
      p { margin:0 0 16px; font-size:16px; line-height:1.65; color:${tokens.primary}; }
      .muted { color:${tokens.secondary}; font-size:14px; }
      .button { display:inline-block; background:${tokens.tertiary}; color:#ffffff !important; text-decoration:none; border-radius:6px; padding:12px 18px; font-weight:700; margin-top:8px; }
      .data-block { border:1px solid ${tokens.border}; border-radius:8px; margin:18px 0; overflow:hidden; }
      .data-row { display:flex; justify-content:space-between; gap:16px; padding:12px 14px; border-bottom:1px solid ${tokens.border}; }
      .data-row:last-child { border-bottom:0; }
      .data-row span { color:${tokens.secondary}; }
      .data-row strong { color:${tokens.primary}; text-align:right; }
      .footer { color:${tokens.secondary}; font-size:13px; line-height:1.6; padding:18px 4px 0; }
      .footer a { color:${tokens.primary}; }
    </style>
  </head>
  <body>
    <span style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${escapeHtml(preview || title)}</span>
    <main class="shell">
      <div class="container">
        <div class="brand">MedExplain AI</div>
        <section class="card">
          <p class="muted">${escapeHtml(metadata || "Secure healthcare workspace")}</p>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(greeting)}</p>
          <p>${escapeHtml(message)}</p>
          ${keyDataHtml ? `<div class="data-block">${keyDataHtml}</div>` : ""}
          ${ctaLabel && ctaUrl ? `<a class="button" href="${escapeHtml(ctaUrl)}">${escapeHtml(ctaLabel)}</a>` : ""}
        </section>
        <footer class="footer">
          <p>${escapeHtml(footerNote || "Need help? Contact support from your MedExplain AI workspace.")}</p>
          <p><a href="${escapeHtml(absoluteUrl("/privacy"))}">Privacy</a> &nbsp; <a href="${escapeHtml(absoluteUrl("/terms"))}">Terms</a> &nbsp; <a href="${escapeHtml(absoluteUrl("/contact"))}">Support</a></p>
        </footer>
      </div>
    </main>
  </body>
</html>`;

  return {
    html,
    text: plainText({ greeting, message, ctaLabel, ctaUrl, footer: footerNote || "MedExplain AI", keyData })
  };
}

function displayName(user = {}) {
  return [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(" ") || user.email || "";
}

export const emailTemplates = {
  welcome({ user }) {
    return layout({
      title: "Welcome to MedExplain AI",
      preview: "Your private health workspace is ready.",
      name: displayName(user),
      message: "Your account is ready. You can now upload reports, review explanations, and manage your healthcare workspace securely.",
      ctaLabel: "Open dashboard",
      ctaPath: "/dashboard"
    });
  },

  emailVerification({ user, token }) {
    return layout({
      title: "Verify your email",
      preview: "Confirm your MedExplain AI account.",
      name: displayName(user),
      message: `Use this verification token to confirm your account: ${token}`,
      ctaLabel: "Verify email",
      ctaPath: "/login",
      metadata: "Account security"
    });
  },

  passwordReset({ user, token }) {
    return layout({
      title: "Reset your password",
      preview: "Your password reset token is ready.",
      name: displayName(user),
      message: `Use this password reset token within 30 minutes: ${token}`,
      ctaLabel: "Reset password",
      ctaPath: "/login",
      metadata: "Security request"
    });
  },

  trialStarted({ user, days = 14 }) {
    return layout({
      title: "Your free trial has started",
      preview: `${days} days of MedExplain AI access are active.`,
      name: displayName(user),
      message: `Your ${days}-day free trial is active. Use this time to analyze reports, explore trusted medical explanations, and decide which plan fits your needs.`,
      ctaLabel: "View subscription",
      ctaPath: "/subscription",
      metadata: "Free trial"
    });
  },

  trialExpiryWarning({ user, daysRemaining = 3 }) {
    return layout({
      title: "Your trial ends soon",
      preview: `${daysRemaining} days left in your trial.`,
      name: displayName(user),
      message: `Your free trial has ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining. Choose a plan to keep premium access active.`,
      ctaLabel: "Choose plan",
      ctaPath: "/subscription",
      metadata: "Trial reminder"
    });
  },

  subscriptionActivated({ user, planName = "Premium" }) {
    return layout({
      title: "Subscription activated",
      preview: `${planName} access is active.`,
      name: displayName(user),
      message: `Your ${planName} subscription is active. Entitlements have been updated on your account.`,
      ctaLabel: "Open dashboard",
      ctaPath: "/dashboard",
      metadata: "Subscription"
    });
  },

  paymentSuccess({ user, amount, reference }) {
    return layout({
      title: "Payment received",
      preview: "Your OPay payment was verified.",
      name: displayName(user),
      message: `We verified your payment of ${amount}. Reference: ${reference}. Your subscription access has been updated.`,
      ctaLabel: "View billing",
      ctaPath: "/billing-history",
      metadata: "OPay payment"
    });
  },

  couponApplied({ user, code, discountAmount }) {
    return layout({
      title: "Coupon applied",
      preview: "Your promotion was applied successfully.",
      name: displayName(user),
      message: `Coupon ${code} was applied successfully. Discount: ${discountAmount}.`,
      ctaLabel: "View subscription",
      ctaPath: "/subscription",
      metadata: "Promotion"
    });
  },

  adminAlert({ title, message, ctaPath = "/admin", metadata = "Admin alert" }) {
    return layout({
      title,
      preview: message,
      name: "Admin",
      message,
      ctaLabel: "Open admin",
      ctaPath,
      metadata,
      footerNote: "This operational alert was generated by MedExplain AI."
    });
  },

  lifecycle({ user, title, message, ctaLabel = "Open workspace", ctaPath = "/dashboard", metadata = "Account update", keyData = {} }) {
    return layout({ title, preview: message, name: displayName(user), message, ctaLabel, ctaPath, metadata, keyData });
  },

  security({ user, title, message, keyData = {} }) {
    return layout({
      title,
      preview: message,
      name: displayName(user),
      message,
      ctaLabel: "Review security",
      ctaPath: "/settings",
      metadata: "Security alert",
      keyData
    });
  },

  medicalAlert({ user, title, message, keyData = {} }) {
    return layout({
      title,
      preview: message,
      name: displayName(user),
      message,
      ctaLabel: "Review health workspace",
      ctaPath: "/reports",
      metadata: "Medical alert",
      keyData,
      footerNote: "This is educational support and not a diagnosis. Contact a qualified clinician for medical decisions."
    });
  },

  financial({ user, title, message, keyData = {} }) {
    return layout({
      title,
      preview: message,
      name: displayName(user),
      message,
      ctaLabel: "View billing",
      ctaPath: "/billing-history",
      metadata: "Billing update",
      keyData
    });
  },

  engagement({ user, title, message, keyData = {} }) {
    return layout({
      title,
      preview: message,
      name: displayName(user),
      message,
      ctaLabel: "Open dashboard",
      ctaPath: "/dashboard",
      metadata: "Workspace summary",
      keyData
    });
  },

  compliance({ user, title, message, keyData = {} }) {
    return layout({
      title,
      preview: message,
      name: displayName(user),
      message,
      ctaLabel: "Review privacy",
      ctaPath: "/consent",
      metadata: "Privacy and compliance",
      keyData
    });
  }
};
