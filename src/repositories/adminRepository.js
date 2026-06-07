import { pool } from "../config/database.js";
import { analyticsService } from "../modules/analytics/analytics.service.js";

export const adminRepository = {
  async getAnalytics(query = {}, client = pool) {
    return analyticsService.dashboard(query, client);
  }
};
