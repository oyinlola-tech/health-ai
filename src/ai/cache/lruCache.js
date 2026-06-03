import crypto from "node:crypto";
import { env } from "../../config/env.js";

class LruCache {
  constructor({ maxItems, ttlMs }) {
    this.maxItems = maxItems;
    this.ttlMs = ttlMs;
    this.items = new Map();
  }

  get(key) {
    const item = this.items.get(key);
    if (!item) return null;
    if (item.expiresAt <= Date.now()) {
      this.items.delete(key);
      return null;
    }
    this.items.delete(key);
    this.items.set(key, item);
    return item.value;
  }

  set(key, value) {
    if (this.items.has(key)) this.items.delete(key);
    this.items.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.items.size > this.maxItems) {
      const oldestKey = this.items.keys().next().value;
      this.items.delete(oldestKey);
    }
  }
}

export const aiResponseCache = new LruCache({
  maxItems: env.AI_CACHE_MAX_ITEMS,
  ttlMs: env.AI_CACHE_TTL_SECONDS * 1000
});

export function createCacheKey(parts) {
  return crypto.createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}
