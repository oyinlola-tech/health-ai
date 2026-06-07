import bcrypt from "bcryptjs";
import { withTransaction } from "../config/database.js";
import { userRepository } from "../repositories/userRepository.js";
import { auditRepository } from "../repositories/auditRepository.js";
import { signAccessToken, signEmailVerificationToken, signRefreshToken, verifyEmailVerificationToken, verifyRefreshToken } from "./tokenService.js";
import { errors } from "../utils/errors.js";
import { generateSecurePassword } from "../utils/password.js";
import { randomToken, tokenDigest } from "../utils/crypto.js";
import { env } from "../config/env.js";
import { trialService } from "../modules/promotions/trial.service.js";
import { analyticsEvents, eventTracker } from "../modules/analytics/event.tracker.js";
import { eventBus } from "../modules/events/event.bus.js";
import { eventTypes } from "../modules/events/event.types.js";
import { legalService } from "./legalService.js";

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.email_verified_at,
    consentPromptLearning: user.consent_prompt_learning
  };
}

function settingsForUser(user) {
  const metadata = user.metadata || {};
  return {
    profile: {
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      consentPromptLearning: Boolean(user.consent_prompt_learning)
    },
    notifications: {
      email: metadata.notifications?.email ?? true,
      product: metadata.notifications?.product ?? true,
      security: metadata.notifications?.security ?? true,
      billing: metadata.notifications?.billing ?? true,
      doctor: metadata.notifications?.doctor ?? true
    },
    privacy: {
      profileVisibility: metadata.privacy?.profileVisibility || "private",
      allowDoctorSharing: metadata.privacy?.allowDoctorSharing ?? true,
      allowAiAnalysis: metadata.privacy?.allowAiAnalysis ?? true,
      allowPromptLearning: metadata.privacy?.allowPromptLearning ?? Boolean(user.consent_prompt_learning)
    },
    billingAddress: {
      fullName: metadata.billingAddress?.fullName || "",
      phone: metadata.billingAddress?.phone || "",
      line1: metadata.billingAddress?.line1 || "",
      line2: metadata.billingAddress?.line2 || "",
      city: metadata.billingAddress?.city || "",
      state: metadata.billingAddress?.state || "",
      postalCode: metadata.billingAddress?.postalCode || "",
      country: metadata.billingAddress?.country || "Nigeria"
    }
  };
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

const failedLoginAttempts = new Map();

async function issueSession(user, client) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, tokenId } = signRefreshToken(user);
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_SECONDS * 1000);
  await userRepository.createRefreshToken({ id: tokenId, userId: user.id, tokenHash: tokenDigest(refreshToken), expiresAt }, client);
  return { accessToken, refreshToken, refreshTokenId: tokenId };
}

export const authService = {
  publicUser,

  settingsForUser,

  async registerPatient(input, req = null) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw errors.conflict("An account with this email already exists.");

    const passwordHash = await hashPassword(input.password);
    const { user, trial, session } = await withTransaction(async (client) => {
      const created = await userRepository.createUser(
        {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: "Patient",
          metadata: {
            privacy: {
              profileVisibility: "private",
              allowDoctorSharing: true,
              allowAiAnalysis: true,
              allowPromptLearning: true
            }
          }
        },
        client
      );
      const updated = await userRepository.updateProfile(created.id, { consentPromptLearning: true, metadata: {} }, client);
      await legalService.ensurePlatformConsents(updated, req, client);
      const startedTrial = await trialService.startTrial(created.id, client);
      const createdSession = await issueSession(updated, client);
      return { user: updated, trial: startedTrial, session: createdSession };
    });
    const emailVerificationToken = signEmailVerificationToken(user);
    await eventTracker.track({
      userId: user.id,
      eventType: analyticsEvents.USER_REGISTERED,
      entityType: "users",
      entityId: user.id,
      metadata: { role: user.role }
    });
    eventBus.publishLater(eventTypes.USER_REGISTERED, {
      user,
      adminMessage: `${user.email} created a ${user.role} account.`
    }, { userId: user.id, entityType: "users", entityId: user.id });
    eventBus.publishLater(eventTypes.EMAIL_VERIFICATION_REQUESTED, { user, token: emailVerificationToken }, { userId: user.id });
    eventBus.publishLater(eventTypes.TRIAL_STARTED, { user, days: env.FREE_TRIAL_DAYS }, { userId: user.id });
    return { user: publicUser(user), trial, emailVerificationToken, ...session };
  },

  async login({ email, password }, req = null) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw errors.unauthorized("Invalid email or password.");
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (failedLoginAttempts.get(user.id) || []).filter((timestamp) => Date.now() - timestamp < 15 * 60 * 1000);
      attempts.push(Date.now());
      failedLoginAttempts.set(user.id, attempts);
      if (attempts.length >= 5) {
        eventBus.publishLater(eventTypes.LOGIN_FAILED_MULTIPLE, {
          user,
          keyData: { Attempts: attempts.length, Window: "15 minutes" }
        }, { userId: user.id, entityType: "users", entityId: user.id, idempotencyKey: `login-failed:${user.id}:${Math.floor(Date.now() / 900000)}` });
      }
      throw errors.unauthorized("Invalid email or password.");
    }
    failedLoginAttempts.delete(user.id);
    await legalService.ensurePlatformConsents(user, req);
    const session = await issueSession(user);
    return { user: publicUser(user), ...session };
  },

  async refresh(refreshToken) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw errors.unauthorized("Invalid refresh token.");
    }

    return withTransaction(async (client) => {
      const stored = await userRepository.findRefreshToken(payload.jti, tokenDigest(refreshToken), client);
      if (!stored) throw errors.unauthorized("Refresh token is no longer valid.");
      await userRepository.revokeRefreshToken(payload.jti, client);
      const user = await userRepository.findById(payload.sub, client);
      if (!user || user.deleted_at || user.status === "disabled") throw errors.unauthorized("User session is no longer valid.");
      const session = await issueSession(user, client);
      return { user: publicUser(user), ...session };
    });
  },

  async logout(refreshToken) {
    if (!refreshToken) return;
    try {
      const payload = verifyRefreshToken(refreshToken);
      await userRepository.revokeRefreshToken(payload.jti);
    } catch {
      return;
    }
  },

  async requestPasswordReset(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) return { sent: true };
    const token = randomToken(32);
    await userRepository.setPasswordReset(user.id, tokenDigest(token), new Date(Date.now() + 30 * 60 * 1000));
    await eventTracker.track({
      userId: user.id,
      eventType: analyticsEvents.PASSWORD_RESET_REQUEST,
      entityType: "users",
      entityId: user.id
    });
    eventBus.publishLater(eventTypes.PASSWORD_RESET_REQUESTED, { user, token }, { userId: user.id, entityType: "users", entityId: user.id });
    return { sent: true };
  },

  async resetPassword({ token, password }) {
    const user = await userRepository.findByPasswordResetHash(tokenDigest(token));
    if (!user) throw errors.unauthorized("Password reset token is invalid or expired.");
    await userRepository.updatePassword(user.id, await hashPassword(password));
    await userRepository.revokeUserRefreshTokens(user.id);
    eventBus.publishLater(eventTypes.PASSWORD_CHANGED, { user }, { userId: user.id, entityType: "users", entityId: user.id });
    return { reset: true };
  },

  async verifyEmail(token) {
    let payload;
    try {
      payload = verifyEmailVerificationToken(token);
    } catch {
      throw errors.unauthorized("Email verification token is invalid or expired.");
    }
    if (payload.purpose !== "email_verification") throw errors.unauthorized("Invalid verification token.");
    const user = await userRepository.verifyEmail(payload.sub);
    return { user: publicUser(user) };
  },

  async updateSettings(user, input) {
    if (input.email && input.email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await userRepository.findByEmail(input.email);
      if (existing && existing.id !== user.id) throw errors.conflict("An account with this email already exists.");
    }
    const metadata = {
      ...(input.notifications ? { notifications: input.notifications } : {}),
      ...(input.privacy ? { privacy: input.privacy } : {}),
      ...(input.billingAddress ? { billingAddress: input.billingAddress } : {})
    };
    const updated = await userRepository.updateSettings(user.id, {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      consentPromptLearning: input.consentPromptLearning,
      metadata
    });
    return { user: publicUser(updated), settings: settingsForUser(updated) };
  },

  async changePassword(user, { currentPassword, newPassword }) {
    const stored = await userRepository.findById(user.id);
    const valid = stored ? await bcrypt.compare(currentPassword, stored.password_hash) : false;
    if (!valid) throw errors.unauthorized("Current password is incorrect.");
    await userRepository.updatePassword(user.id, await hashPassword(newPassword));
    await userRepository.revokeUserRefreshTokens(user.id);
    eventBus.publishLater(eventTypes.PASSWORD_CHANGED, { user }, { userId: user.id, entityType: "users", entityId: user.id });
    return { changed: true };
  },

  async createDoctor(input, actor) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw errors.conflict("An account with this email already exists.");

    const temporaryPassword = generateSecurePassword();
    const result = await withTransaction(async (client) => {
      const user = await userRepository.createUser(
        {
          email: input.email,
          passwordHash: await hashPassword(temporaryPassword),
          firstName: input.firstName,
          lastName: input.lastName,
          role: "Doctor",
          status: "active"
        },
        client
      );
      await userRepository.createDoctorProfile(
        {
          userId: user.id,
          specialty: input.specialty,
          licenseNumber: input.licenseNumber,
          bio: input.bio,
          yearsExperience: input.yearsExperience,
          verificationStatus: input.verificationStatus
        },
        client
      );
      await auditRepository.create(
        {
          actorId: actor.id,
          action: "doctor.created",
          entityType: "users",
          entityId: user.id,
          metadata: { specialty: input.specialty }
        },
        client
      );
      return user;
    });

    eventBus.publishLater(eventTypes.DOCTOR_ASSIGNED, {
      user: result,
      email: result.email,
      temporaryPassword,
      message: "Your MedExplain AI doctor account has been created. Sign in and change this temporary password immediately.",
      adminMessage: `${result.email} was created by ${actor.email || actor.id}.`
    }, { userId: result.id, entityType: "users", entityId: result.id });
    return { user: publicUser(result), temporaryPassword };
  }
};
