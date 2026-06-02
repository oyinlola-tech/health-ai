import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

function hasSmtpConfig() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export const emailService = {
  async sendMail({ to, subject, text }) {
    if (!hasSmtpConfig()) {
      logger.info("Email skipped because SMTP is not configured.", { to, subject });
      return { sent: false, reason: "smtp_not_configured" };
    }

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text
    });
    return { sent: true };
  },

  async sendDoctorCredentials({ to, email, password }) {
    return this.sendMail({
      to,
      subject: "Your MedExplain AI doctor account",
      text: `Your MedExplain AI doctor account has been created.\n\nEmail: ${email}\nTemporary password: ${password}\n\nSign in and change this password immediately.`
    });
  }
};
