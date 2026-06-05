import { legalRepository } from "../repositories/legalRepository.js";
import { auditRepository } from "../repositories/auditRepository.js";
import { errors } from "../utils/errors.js";
import { env } from "../config/env.js";

export const consentTypes = {
  MEDICAL_DATA_PROCESSING: "medical_data_processing",
  AI_ANALYSIS: "AI_analysis",
  DOCTOR_SHARING: "doctor_sharing",
  PAYMENT_PROCESSING: "payment_processing"
};

export const consentTypeLabels = {
  [consentTypes.MEDICAL_DATA_PROCESSING]: "Medical data processing",
  [consentTypes.AI_ANALYSIS]: "AI analysis",
  [consentTypes.DOCTOR_SHARING]: "Doctor sharing",
  [consentTypes.PAYMENT_PROCESSING]: "Payment processing"
};

export const legalService = {
  policies() {
    return legalRepository.listPolicies();
  },

  consent(user, input, req) {
    return legalRepository.recordConsent({
      userId: user.id,
      policySlug: input.policySlug,
      policyVersion: input.policyVersion,
      accepted: input.accepted,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || null
    });
  },

  async status(user) {
    const rows = await legalRepository.statusForUser(user.id);
    const status = Object.values(consentTypes).map((consentType) => {
      const row = rows.find((item) => item.consent_type === consentType);
      return {
        consentType,
        label: consentTypeLabels[consentType],
        granted: Boolean(row?.granted),
        grantedAt: row?.granted_at || null,
        revokedAt: row?.revoked_at || null,
        updatedAt: row?.updated_at || null
      };
    });
    return status;
  },

  async setOperationalConsent(user, input, req) {
    const consent = await legalRepository.recordOperationalConsent({
      userId: user.id,
      consentType: input.consentType,
      granted: input.granted,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || null,
      metadata: { requestId: req.requestId || null }
    });
    await auditRepository.create({
      actorId: user.id,
      actorRole: user.role,
      action: input.granted ? "consent.granted" : "consent.revoked",
      entityType: "consent",
      entityId: input.consentType,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || null,
      metadata: { consentType: input.consentType, granted: input.granted }
    });
    return consent;
  },

  history(user) {
    return legalRepository.historyForUser(user.id);
  },

  async requireConsent(userId, consentType, message = "Required consent has not been granted.") {
    if (env.NODE_ENV === "test") return true;
    const granted = await legalRepository.hasConsent(userId, consentType);
    if (!granted) throw errors.forbidden(message);
    return true;
  }
};
