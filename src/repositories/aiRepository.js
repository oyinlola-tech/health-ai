import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const aiRepository = {
  async createInteraction({ userId, reportId = null, type, prompt, response, model, usedForLearning = false }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into ai_interactions (id, user_id, report_id, type, prompt, response, model, used_for_learning)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [id, userId, reportId, type, prompt, response, model, usedForLearning]
    );
    return rows[0];
  },

  async updateFeedback({ id, userId, rating, comment }, client = pool) {
    const { rows } = await client.query(
      `update ai_interactions
       set feedback_rating = $3, feedback_comment = $4
       where id = $1 and user_id = $2
       returning *`,
      [id, userId, rating, comment]
    );
    return rows[0] || null;
  },

  async storeMessage({ userId, role, content, aiInteractionId = null, metadata = {} }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into chat_messages (id, user_id, role, content, ai_interaction_id, metadata)
       values ($1, $2, $3, $4, $5, $6::jsonb)
       returning *`,
      [id, userId, role, content, aiInteractionId, JSON.stringify(metadata)]
    );
    return rows[0];
  },

  async listThreadMessages(userId, threadId, limit = 20, client = pool) {
    const { rows } = await client.query(
      `select * from chat_messages
       where user_id = $1
         and json_unquote(json_extract(metadata, '$.threadId')) = $2
       order by created_at desc
       limit $3`,
      [userId, threadId, limit]
    );
    return rows.reverse();
  },

  async listChatMessages(userId, limit = 50, client = pool) {
    const { rows } = await client.query(
      "select * from chat_messages where user_id = $1 order by created_at desc limit $2",
      [userId, limit]
    );
    return rows.reverse();
  }
};
