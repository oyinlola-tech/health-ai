import crypto from "node:crypto";
import { env } from "../../config/env.js";

const sensitiveKeys = new Set(
  ["authorization", "card", "cardNo", "cardNumber", "cvv", "cvc", "expiry", "merchantId", "merchantSignature", "otp", "pan", "password", "pin", "secret", "signature", "token"].map((key) =>
    key.toLowerCase()
  )
);

function key() {
  return crypto.createHash("sha256").update(env.PAYMENT_DATA_ENCRYPTION_SECRET).digest();
}

function redact(value) {
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([field, fieldValue]) => [field, sensitiveKeys.has(field.toLowerCase()) ? "[REDACTED]" : redact(fieldValue)])
  );
}

export function protectPaymentPayload(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(redact(value || {})), "utf8"), cipher.final()]);
  return {
    protected: true,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
}
