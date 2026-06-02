import { pool } from "../config/database.js";

export const adminRepository = {
  async getAnalytics(client = pool) {
    const [users, reports, appointments, ai] = await Promise.all([
      client.query("select role, count(*)::int as count from users where deleted_at is null group by role"),
      client.query("select status, count(*)::int as count from reports where deleted_at is null group by status"),
      client.query("select status, count(*)::int as count from appointments where deleted_at is null group by status"),
      client.query("select type, count(*)::int as count from ai_interactions group by type")
    ]);
    return {
      users: users.rows,
      reports: reports.rows,
      appointments: appointments.rows,
      aiInteractions: ai.rows
    };
  }
};
