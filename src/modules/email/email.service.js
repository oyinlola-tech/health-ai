import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { emailQueue } from "./email.queue.js";
import { emailTemplates } from "./email.templates.js";

let transporter = null;
const adminAlertCooldown = new Map();
const recipientThrottle = new Map();

function hasSmtpConfig() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function smtpTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });
  return transporter;
}

async function deliver({ to, subject, html, text }) {
  if (!hasSmtpConfig()) {
    logger.info("Email skipped because SMTP is not configured.", { module: "email", to, subject });
    return { sent: false, reason: "smtp_not_configured" };
  }
  await smtpTransporter().sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
    text
  });
  return { sent: true };
}

async function queueAndDeliver({ to, subject, templateType, payload, html, text, eventLogId = null, eventType = null }) {
  const throttleKey = `${to}:${templateType}`;
  const now = Date.now();
  const recent = (recipientThrottle.get(throttleKey) || []).filter((timestamp) => now - timestamp < 60 * 60 * 1000);
  if (recent.length >= 20) {
    logger.warn("Email throttled to prevent recipient spam.", { module: "email", to, templateType });
    recipientThrottle.set(throttleKey, recent);
    return { sent: false, queued: false, reason: "recipient_throttled" };
  }
  recent.push(now);
  recipientThrottle.set(throttleKey, recent);
  const queued = await emailQueue.enqueue({ to, subject, templateType, payload, html, text });
  const emailLog = await emailQueue.createEmailLog({
    queueId: queued?.id || null,
    eventLogId,
    eventType,
    recipient: to,
    subject,
    templateType
  });
  try {
    const result = await deliver({ to, subject, html, text });
    if (result.sent) {
      await emailQueue.markSent(queued?.id).catch((error) => {
        logger.warn("Email was delivered, but queue status could not be marked sent.", {
          module: "email",
          to,
          subject,
          message: error.message
        });
      });
      await emailQueue.markEmailLogSent(emailLog?.id).catch(() => null);
    }
    return { ...result, queued: Boolean(queued?.id) };
  } catch (error) {
    await emailQueue.markFailed(queued?.id, error).catch((queueError) => {
      logger.warn("Email delivery failed, and queue failure state could not be persisted.", {
        module: "email",
        to,
        subject,
        message: queueError.message
      });
    });
    await emailQueue.markEmailLogFailed(emailLog?.id, error).catch(() => null);
    logger.error("Email delivery failed.", { module: "email", to, subject, message: error.message });
    return { sent: false, queued: Boolean(queued?.id), reason: "delivery_failed" };
  }
}

function money(amount) {
  return `NGN ${Number(amount || 0).toLocaleString("en-NG")}`;
}

export const emailService = {
  sendEmail(to, subject, template, data = {}, options = {}) {
    return this.sendTemplate({ to, subject, templateType: template, payload: data, ...options });
  },

  sendMail({ to, subject, text, html }) {
    return queueAndDeliver({ to, subject, templateType: "custom", payload: {}, html: html || text, text });
  },

  sendTemplate({ to, subject, templateType, payload, eventLogId = null, eventType = null }) {
    const builder = emailTemplates[templateType];
    if (!builder) throw new Error(`Unknown email template: ${templateType}`);
    const rendered = builder(payload || {});
    return queueAndDeliver({ to, subject, templateType, payload, eventLogId, eventType, ...rendered });
  },

  sendWelcome(user) {
    return this.sendTemplate({ to: user.email, subject: "Welcome to MedExplain AI", templateType: "welcome", payload: { user } });
  },

  sendEmailVerification({ user, token }) {
    return this.sendTemplate({ to: user.email, subject: "Verify your MedExplain AI email", templateType: "emailVerification", payload: { user, token } });
  },

  sendPasswordReset({ user, token }) {
    return this.sendTemplate({ to: user.email, subject: "Reset your MedExplain AI password", templateType: "passwordReset", payload: { user, token } });
  },

  sendTrialStarted({ user, days }) {
    return this.sendTemplate({ to: user.email, subject: "Your MedExplain AI trial is active", templateType: "trialStarted", payload: { user, days } });
  },

  sendTrialExpiryWarning({ user, daysRemaining = 3 }) {
    return this.sendTemplate({ to: user.email, subject: "Your MedExplain AI trial ends soon", templateType: "trialExpiryWarning", payload: { user, daysRemaining } });
  },

  sendSubscriptionActivated({ user, planName }) {
    return this.sendTemplate({ to: user.email, subject: "Your MedExplain AI subscription is active", templateType: "subscriptionActivated", payload: { user, planName } });
  },

  sendPaymentSuccess({ user, amount, reference }) {
    return this.sendTemplate({
      to: user.email,
      subject: "MedExplain AI payment received",
      templateType: "paymentSuccess",
      payload: { user, amount: money(amount), reference }
    });
  },

  sendCouponApplied({ user, code, discountAmount }) {
    return this.sendTemplate({
      to: user.email,
      subject: "Your MedExplain AI coupon was applied",
      templateType: "couponApplied",
      payload: { user, code, discountAmount: money(discountAmount) }
    });
  },

  sendAdminAlert({ subject, title, message, ctaPath = "/admin", metadata }) {
    const cooldownKey = `${subject}:${title}`;
    const lastSent = adminAlertCooldown.get(cooldownKey) || 0;
    if (Date.now() - lastSent < 5 * 60 * 1000) {
      return { sent: false, reason: "admin_alert_cooldown" };
    }
    adminAlertCooldown.set(cooldownKey, Date.now());
    return this.sendTemplate({
      to: env.ADMIN_EMAIL,
      subject,
      templateType: "adminAlert",
      payload: { title, message, ctaPath, metadata }
    });
  },

  async sendDoctorCredentials({ to, email, password }) {
    return this.sendMail({
      to,
      subject: "Your MedExplain AI doctor account",
      text: `Your MedExplain AI doctor account has been created.\n\nEmail: ${email}\nTemporary password: ${password}\n\nSign in and change this password immediately.`
    });
  }
};
