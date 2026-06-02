import crypto from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";

export function generateSecurePassword(length = 16) {
  return Array.from({ length }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join("");
}
