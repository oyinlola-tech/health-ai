import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { legalRepository } from "../repositories/legalRepository.js";
import { userRepository } from "../repositories/userRepository.js";
import { logger } from "../utils/logger.js";

const policies = [
  {
    slug: "terms",
    title: "Terms and Conditions",
    version: "2026.06.02",
    body: "MedExplain AI is proprietary software and provides educational support only."
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    version: "2026.06.02",
    body: "Patient data is stored securely and used only according to explicit consent."
  },
  {
    slug: "medical-disclaimer",
    title: "Medical Disclaimer",
    version: "2026.06.02",
    body: "AI explanations do not replace professional medical advice, diagnosis, or treatment."
  }
];

async function seed() {
  for (const policy of policies) {
    await legalRepository.upsertPolicy(policy);
  }

  if (process.env.ADMIN_SEED_EMAIL && process.env.ADMIN_SEED_PASSWORD) {
    const existing = await userRepository.findByEmail(process.env.ADMIN_SEED_EMAIL);
    if (!existing) {
      await userRepository.createUser({
        email: process.env.ADMIN_SEED_EMAIL,
        passwordHash: await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD, 12),
        firstName: "System",
        lastName: "Admin",
        role: "Admin"
      });
    }
  }

  logger.info("Seed data applied.");
}

seed()
  .then(async () => pool.end())
  .catch(async (error) => {
    logger.error("Seed failed.", { message: error.message });
    await pool.end();
    process.exit(1);
  });
