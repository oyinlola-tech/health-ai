import bcrypt from "bcryptjs";
import { withTransaction } from "../config/database.js";
import { userRepository } from "../repositories/userRepository.js";
import { auditRepository } from "../repositories/auditRepository.js";
import { emailService } from "./emailService.js";
import { signAccessToken, signEmailVerificationToken, signRefreshToken, verifyEmailVerificationToken, verifyRefreshToken } from "./tokenService.js";
import { errors } from "../utils/errors.js";
import { generateSecurePassword } from "../utils/password.js";
import { randomToken, sha256 } from "../utils/crypto.js";
import { env } from "../config/env.js";

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

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function issueSession(user, client) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, tokenId } = signRefreshToken(user);
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_SECONDS * 1000);
  await userRepository.createRefreshToken({ id: tokenId, userId: user.id, tokenHash: sha256(refreshToken), expiresAt }, client);
  return { accessToken, refreshToken };
}

export const authService = {
  publicUser,

  async registerPatient(input) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw errors.conflict("An account with this email already exists.");

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.createUser({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: "Patient",
      metadata: {}
    });
    await userRepository.updateProfile(user.id, { consentPromptLearning: input.consentPromptLearning, metadata: {} });
    const emailVerificationToken = signEmailVerificationToken(user);
    await emailService.sendMail({
      to: user.email,
      subject: "Verify your MedExplain AI account",
      text: `Use this verification token to verify your account: ${emailVerificationToken}`
    });
    return { user: publicUser(user), emailVerificationToken };
  },

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw errors.unauthorized("Invalid email or password.");
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw errors.unauthorized("Invalid email or password.");
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
      const stored = await userRepository.findRefreshToken(payload.jti, sha256(refreshToken), client);
      if (!stored) throw errors.unauthorized("Refresh token is no longer valid.");
      await userRepository.revokeRefreshToken(payload.jti, client);
      const user = await userRepository.findById(payload.sub, client);
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
    await userRepository.setPasswordReset(user.id, sha256(token), new Date(Date.now() + 30 * 60 * 1000));
    await emailService.sendMail({
      to: user.email,
      subject: "Reset your MedExplain AI password",
      text: `Use this password reset token within 30 minutes: ${token}`
    });
    return { sent: true };
  },

  async resetPassword({ token, password }) {
    const user = await userRepository.findByPasswordResetHash(sha256(token));
    if (!user) throw errors.unauthorized("Password reset token is invalid or expired.");
    await userRepository.updatePassword(user.id, await hashPassword(password));
    await userRepository.revokeUserRefreshTokens(user.id);
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

    await emailService.sendDoctorCredentials({ to: result.email, email: result.email, password: temporaryPassword });
    return { user: publicUser(result), temporaryPassword };
  }
};
