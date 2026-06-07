import { env } from "../../config/env.js";
import { createId } from "../../utils/uuid.js";
import { emailService } from "./email.service.js";
import { adminEventTypes, eventTypes } from "../events/event.types.js";

function money(amount) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(amount || 0));
}

function userEmail(payload = {}) {
  return payload.user?.email || payload.email || null;
}

function userName(payload = {}) {
  const user = payload.user || {};
  return [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(" ") || user.email || "";
}

function userId(payload = {}) {
  return payload.user?.id || payload.userId || null;
}

function adminEmailPayload(event, title, message, keyData = {}) {
  return {
    to: env.ADMIN_EMAIL,
    subject: title,
    templateType: "adminAlert",
    payload: { title, message, ctaPath: "/admin", metadata: event.type, keyData }
  };
}

async function notificationCenter({ client, eventLog, payload, type, category, title, body }) {
  const targetUserId = userId(payload);
  if (!targetUserId) return null;
  const id = createId();
  try {
    const { rows } = await client.query(
      `insert into notification_center (id, user_id, event_log_id, type, category, title, body, delivery_channel)
       values ($1, $2, $3, $4, $5, $6, $7, 'email')
       returning *`,
      [id, targetUserId, eventLog?.id || null, type, category, title, body]
    );
    return rows[0] || null;
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE" || String(error?.message || "").includes("notification_center")) return null;
    throw error;
  }
}

function scenario(event) {
  const payload = event.payload || {};
  const name = userName(payload);
  const common = { user: payload.user || { email: payload.email } };

  const scenarios = {
    [eventTypes.USER_REGISTERED]: {
      subject: "Welcome to MedExplain AI",
      templateType: "welcome",
      payload: common,
      category: "security",
      title: "Welcome to MedExplain AI",
      body: "Your account was created successfully."
    },
    [eventTypes.USER_LOGIN_NEW_DEVICE]: {
      subject: "New login detected",
      templateType: "security",
      payload: {
        ...common,
        title: "New login detected",
        message: "A login was recorded for your account. If this was not you, reset your password immediately.",
        keyData: { Time: payload.time || new Date().toISOString(), Device: payload.device || "Unknown device" }
      },
      category: "security",
      title: "New login detected",
      body: "A login was recorded for your account."
    },
    [eventTypes.EMAIL_VERIFICATION_REQUESTED]: {
      subject: "Verify your MedExplain AI email",
      templateType: "emailVerification",
      payload: { ...common, token: payload.token },
      category: "security",
      title: "Email verification",
      body: "Verify your email address to protect your account."
    },
    [eventTypes.PASSWORD_RESET_REQUESTED]: {
      subject: "Reset your MedExplain AI password",
      templateType: "passwordReset",
      payload: { ...common, token: payload.token },
      category: "security",
      title: "Password reset requested",
      body: "A password reset token was requested."
    },
    [eventTypes.PASSWORD_CHANGED]: {
      subject: "Your password was changed",
      templateType: "security",
      payload: { ...common, title: "Password changed", message: "Your MedExplain AI password was changed successfully." },
      category: "security",
      title: "Password changed",
      body: "Your password was changed."
    },
    [eventTypes.LOGIN_FAILED_MULTIPLE]: {
      subject: "Multiple failed login attempts",
      templateType: "security",
      payload: { ...common, title: "Failed login alert", message: "Multiple failed login attempts were detected for your account." },
      category: "security",
      title: "Failed login alert",
      body: "Multiple failed login attempts were detected."
    },
    [eventTypes.ACCOUNT_LOCKED]: {
      subject: "Your account was locked",
      templateType: "security",
      payload: { ...common, title: "Account locked", message: "Your account was locked to protect your data. Contact support to restore access." },
      category: "security",
      title: "Account locked",
      body: "Your account was locked to protect your data."
    },
    [eventTypes.AI_REPORT_ANALYZED]: {
      subject: "Your report analysis is ready",
      templateType: "medicalAlert",
      payload: {
        ...common,
        title: "Report analysis ready",
        message: "Your AI-assisted report explanation is ready in your secure workspace.",
        keyData: { Report: payload.reportTitle || payload.report?.title || "Medical report" }
      },
      category: "ai",
      title: "Report analysis ready",
      body: "Your AI-assisted report explanation is ready."
    },
    [eventTypes.AI_CRITICAL_HEALTH_FLAG]: {
      subject: "Important health finding to review",
      templateType: "medicalAlert",
      payload: {
        ...common,
        title: "Important health finding",
        message: "Your report analysis includes a finding that should be reviewed with a qualified clinician.",
        keyData: { Report: payload.reportTitle || "Medical report", Urgency: payload.urgencyLevel || "Review recommended" }
      },
      category: "ai",
      title: "Important health finding",
      body: "A report finding should be reviewed with a clinician."
    },
    [eventTypes.AI_WEEKLY_SUMMARY]: {
      subject: "Your weekly health AI summary",
      templateType: "engagement",
      payload: { ...common, title: "Weekly health summary", message: payload.message || "Your weekly AI usage and health workspace summary is ready." },
      category: "ai",
      title: "Weekly health summary",
      body: "Your weekly health workspace summary is ready."
    },
    [eventTypes.DOCTOR_ASSIGNED]: {
      subject: "Doctor workflow update",
      templateType: "lifecycle",
      payload: {
        ...common,
        title: "Doctor workflow update",
        message: payload.message || "A doctor workflow update is available in your workspace.",
        ctaLabel: "Open doctors",
        ctaPath: "/doctors",
        metadata: "Doctor care",
        keyData: payload.temporaryPassword ? { Email: payload.email, "Temporary password": payload.temporaryPassword } : {}
      },
      category: "doctor",
      title: "Doctor workflow update",
      body: "A doctor workflow update is available."
    },
    [eventTypes.DOCTOR_RESPONSE_RECEIVED]: {
      subject: "Doctor response received",
      templateType: "lifecycle",
      payload: { ...common, title: "Doctor response received", message: "A doctor responded in your consultation room.", ctaLabel: "Open chat", ctaPath: "/chat" },
      category: "doctor",
      title: "Doctor response received",
      body: "A doctor responded in your consultation room."
    },
    [eventTypes.DOCTOR_VERIFIED]: {
      subject: "Doctor verification updated",
      templateType: "lifecycle",
      payload: { ...common, title: "Doctor verification updated", message: payload.message || "Your doctor verification status was updated.", ctaLabel: "Open doctor dashboard", ctaPath: "/doctor" },
      category: "doctor",
      title: "Doctor verification updated",
      body: "Your doctor verification status was updated."
    },
    [eventTypes.APPOINTMENT_CONFIRMED]: {
      subject: "Appointment confirmed",
      templateType: "lifecycle",
      payload: { ...common, title: "Appointment confirmed", message: "Your doctor appointment has been confirmed.", ctaLabel: "View appointments", ctaPath: "/appointments" },
      category: "doctor",
      title: "Appointment confirmed",
      body: "Your appointment has been confirmed."
    },
    [eventTypes.APPOINTMENT_CANCELLED]: {
      subject: "Appointment cancelled",
      templateType: "lifecycle",
      payload: { ...common, title: "Appointment cancelled", message: "Your appointment was cancelled. You can book another time from your workspace.", ctaLabel: "View appointments", ctaPath: "/appointments" },
      category: "doctor",
      title: "Appointment cancelled",
      body: "Your appointment was cancelled."
    },
    [eventTypes.APPOINTMENT_REMINDER]: {
      subject: "Appointment reminder",
      templateType: "lifecycle",
      payload: { ...common, title: "Appointment reminder", message: "You have an upcoming doctor appointment.", ctaLabel: "View appointments", ctaPath: "/appointments" },
      category: "doctor",
      title: "Appointment reminder",
      body: "You have an upcoming appointment."
    },
    [eventTypes.PAYMENT_SUCCESS]: {
      subject: "Payment received",
      templateType: "financial",
      payload: {
        ...common,
        title: "Payment received",
        message: `We verified your payment${name ? `, ${name}` : ""}.`,
        keyData: { Amount: money(payload.amount || payload.amountNaira), Reference: payload.reference || "-" }
      },
      category: "payment",
      title: "Payment received",
      body: "Your payment was verified."
    },
    [eventTypes.PAYMENT_FAILED]: {
      subject: "Payment failed",
      templateType: "financial",
      payload: { ...common, title: "Payment failed", message: "Your payment was not completed. No premium access was activated." },
      category: "payment",
      title: "Payment failed",
      body: "Your payment was not completed."
    },
    [eventTypes.SUBSCRIPTION_RENEWAL]: {
      subject: "Subscription renewal",
      templateType: "financial",
      payload: { ...common, title: "Subscription renewal", message: "Your subscription renewal was processed." },
      category: "payment",
      title: "Subscription renewal",
      body: "Your subscription renewal was processed."
    },
    [eventTypes.SUBSCRIPTION_ACTIVATED]: {
      subject: "Your MedExplain AI subscription is active",
      templateType: "subscriptionActivated",
      payload: { ...common, planName: payload.planName || "Premium" },
      category: "payment",
      title: "Subscription activated",
      body: "Your subscription access is active."
    },
    [eventTypes.SUBSCRIPTION_EXPIRED]: {
      subject: "Subscription expired",
      templateType: "financial",
      payload: { ...common, title: "Subscription expired", message: "Your subscription has expired and access has been adjusted." },
      category: "payment",
      title: "Subscription expired",
      body: "Your subscription has expired."
    },
    [eventTypes.REFUND_PROCESSED]: {
      subject: "Refund processed",
      templateType: "financial",
      payload: { ...common, title: "Refund processed", message: "Your refund request has been processed." },
      category: "payment",
      title: "Refund processed",
      body: "Your refund request has been processed."
    },
    [eventTypes.COUPON_APPLIED]: {
      subject: "Coupon applied",
      templateType: "couponApplied",
      payload: { ...common, code: payload.code || payload.couponCode, discountAmount: money(payload.discountAmount) },
      category: "payment",
      title: "Coupon applied",
      body: "Your coupon was applied successfully."
    },
    [eventTypes.COUPON_EXPIRING_SOON]: {
      subject: "Coupon expiring soon",
      templateType: "lifecycle",
      payload: { ...common, title: "Coupon expiring soon", message: "A coupon available to you is expiring soon.", ctaLabel: "View subscription", ctaPath: "/subscription" },
      category: "payment",
      title: "Coupon expiring soon",
      body: "A coupon available to you is expiring soon."
    },
    [eventTypes.TRIAL_STARTED]: {
      subject: "Your free trial has started",
      templateType: "trialStarted",
      payload: { ...common, days: payload.days || 14 },
      category: "account",
      title: "Trial started",
      body: "Your free trial has started."
    },
    [eventTypes.TRIAL_EXPIRING_SOON]: {
      subject: "Your trial ends soon",
      templateType: "trialExpiryWarning",
      payload: { ...common, daysRemaining: payload.daysRemaining || 3 },
      category: "account",
      title: "Trial ends soon",
      body: "Your trial ends soon."
    },
    [eventTypes.TRIAL_EXPIRED]: {
      subject: "Your trial has expired",
      templateType: "lifecycle",
      payload: { ...common, title: "Trial expired", message: "Your free trial has expired. Choose a plan to restore premium access.", ctaLabel: "Choose plan", ctaPath: "/subscription" },
      category: "account",
      title: "Trial expired",
      body: "Your free trial has expired."
    },
    [eventTypes.WEEKLY_USAGE_REPORT]: {
      subject: "Your weekly usage report",
      templateType: "engagement",
      payload: { ...common, title: "Weekly usage report", message: payload.message || "Your weekly MedExplain AI usage report is ready.", keyData: payload.keyData || {} },
      category: "engagement",
      title: "Weekly usage report",
      body: "Your weekly usage report is ready."
    },
    [eventTypes.INACTIVITY_REMINDER]: {
      subject: "Your health workspace is waiting",
      templateType: "engagement",
      payload: { ...common, title: "Workspace reminder", message: "You have not used MedExplain AI recently. Your secure workspace is ready when you need it." },
      category: "engagement",
      title: "Workspace reminder",
      body: "Your workspace is ready when you need it."
    },
    [eventTypes.MILESTONE_REACHED]: {
      subject: "Milestone reached",
      templateType: "engagement",
      payload: { ...common, title: "Milestone reached", message: payload.message || "You reached a MedExplain AI milestone." },
      category: "engagement",
      title: "Milestone reached",
      body: "You reached a workspace milestone."
    },
    [eventTypes.CONSENT_UPDATED]: {
      subject: "Consent preferences updated",
      templateType: "compliance",
      payload: { ...common, title: "Consent updated", message: "Your consent preferences were updated." },
      category: "compliance",
      title: "Consent updated",
      body: "Your consent preferences were updated."
    },
    [eventTypes.DATA_ACCESS_LOGGED]: {
      subject: "Data access logged",
      templateType: "compliance",
      payload: { ...common, title: "Data access logged", message: "A data access event was recorded for your account." },
      category: "compliance",
      title: "Data access logged",
      body: "A data access event was recorded."
    },
    [eventTypes.MEDICAL_DISCLAIMER_SENT]: {
      subject: "Medical guidance reminder",
      templateType: "compliance",
      payload: { ...common, title: "Medical guidance reminder", message: "MedExplain AI provides education and does not replace professional medical care." },
      category: "compliance",
      title: "Medical guidance reminder",
      body: "MedExplain AI provides education and does not replace professional medical care."
    }
  };

  if (adminEventTypes.has(event.type)) {
    const title =
      {
        [eventTypes.NEW_DOCTOR_APPLICATION]: "New doctor application",
        [eventTypes.HIGH_AI_COST_ALERT]: "AI usage spike detected",
        [eventTypes.SYSTEM_ERROR_ALERT]: "System error detected",
        [eventTypes.DB_STORAGE_WARNING]: "Database storage warning",
        [eventTypes.LOGIN_FAILED_MULTIPLE]: "Suspicious login pattern",
        [eventTypes.ACCOUNT_LOCKED]: "Account locked",
        [eventTypes.PAYMENT_SUCCESS]: "Payment received",
        [eventTypes.PAYMENT_FAILED]: "Payment failed",
        [eventTypes.REFUND_PROCESSED]: "Refund processed"
      }[event.type] || event.type;
    return {
      ...(scenarios[event.type] || {}),
      admin: adminEmailPayload(event, title, payload.adminMessage || payload.message || `${event.type} event recorded.`, payload.keyData || {})
    };
  }

  return scenarios[event.type] || null;
}

export const emailMapper = {
  async handle(event, { eventLog, client }) {
    const mapped = scenario(event);
    if (!mapped) return null;
    const payload = event.payload || {};
    const sends = [];

    if (mapped.subject && userEmail(payload)) {
      sends.push(
        emailService.sendTemplate({
          to: userEmail(payload),
          subject: mapped.subject,
          templateType: mapped.templateType,
          payload: mapped.payload,
          eventLogId: eventLog?.id,
          eventType: event.type
        })
      );
      await notificationCenter({
        client,
        eventLog,
        payload,
        type: event.type,
        category: mapped.category || "system",
        title: mapped.title || mapped.subject,
        body: mapped.body || mapped.payload?.message || mapped.subject
      });
    }

    if (mapped.admin?.to) {
      sends.push(
        emailService.sendTemplate({
          ...mapped.admin,
          eventLogId: eventLog?.id,
          eventType: event.type
        })
      );
    }

    return Promise.allSettled(sends);
  }
};
