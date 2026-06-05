import { adminRepository } from "../repositories/adminRepository.js";
import { auditRepository } from "../repositories/auditRepository.js";
import { reportRepository } from "../repositories/reportRepository.js";
import { userRepository } from "../repositories/userRepository.js";
import { subscriptionService } from "./subscriptionService.js";

export const adminService = {
  users(query) {
    return userRepository.list(query);
  },

  analytics() {
    return adminRepository.getAnalytics();
  },

  auditLogs(query) {
    return auditRepository.list(query);
  },

  reportProcessingMetrics() {
    return reportRepository.processingMetrics();
  },

  monetization() {
    return subscriptionService.adminMetrics();
  }
};
