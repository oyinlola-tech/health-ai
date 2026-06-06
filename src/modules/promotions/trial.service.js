import { env } from "../../config/env.js";
import { pool } from "../../config/database.js";
import { createId } from "../../utils/uuid.js";

export const trialService = {
  async startTrial(userId, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into user_trials (id, user_id, start_date, end_date, status)
       values ($1, $2, now(), date_add(now(), interval $3 day), 'active')
       on duplicate key update id = id
       returning *`,
      [id, userId, env.FREE_TRIAL_DAYS]
    );
    return rows[0] || this.currentTrial(userId, client);
  },

  async currentTrial(userId, client = pool) {
    const { rows } = await client.query("select * from user_trials where user_id = $1 order by created_at desc limit 1", [userId]);
    const trial = rows[0] || null;
    if (trial?.status === "active" && new Date(trial.end_date).getTime() <= Date.now()) {
      const { rows: updated } = await client.query("update user_trials set status = 'expired', updated_at = now() where id = $1 returning *", [trial.id]);
      return updated[0] || trial;
    }
    return trial;
  },

  isActive(trial) {
    return trial?.status === "active" && new Date(trial.end_date).getTime() > Date.now();
  },

  daysRemaining(trial) {
    if (!this.isActive(trial)) return 0;
    return Math.max(0, Math.ceil((new Date(trial.end_date).getTime() - Date.now()) / 86400000));
  }
};
