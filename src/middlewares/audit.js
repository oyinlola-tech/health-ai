import { auditRepository } from "../repositories/auditRepository.js";
import { logger } from "../utils/logger.js";

export function auditAction(action) {
  return async (req, _res, next) => {
    try {
      await auditRepository.create({
        actorId: req.user?.id || null,
        action,
        entityType: req.params?.entityType || null,
        entityId: req.params?.id || null,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || null,
        metadata: { method: req.method, path: req.originalUrl }
      });
    } catch (error) {
      logger.warn("Audit log write failed.", { message: error.message });
    }
    next();
  };
}
