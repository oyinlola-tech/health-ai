import crypto from "node:crypto";
import { env } from "../config/env.js";

function key() {
  return crypto.createHash("sha256").update(env.MESSAGE_ENCRYPTION_SECRET).digest();
}

export function encryptMessage(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64")
  };
}

export function decryptMessage(payload) {
  if (!payload?.ciphertext || !payload?.iv || !payload?.tag) return "";
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64")), decipher.final()]).toString("utf8");
}
