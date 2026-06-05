import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { createId } from "../../utils/uuid.js";

export async function seedAdminUser(connection) {
  const [existing] = await connection.execute("select id from users where lower(role) = 'admin' and deleted_at is null limit 1");
  if (existing.length) return { created: false, id: existing[0].id };

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  const id = createId();
  await connection.execute(
    `insert into users (id, email, password_hash, first_name, last_name, role, status, metadata, email_verified_at)
     values (?, lower(?), ?, 'System', 'Admin', 'admin', 'active', json_object('seededBy', 'database-bootstrap'), now())`,
    [id, env.ADMIN_EMAIL, passwordHash]
  );
  await connection.execute(
    `insert into audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, metadata)
     values (?, ?, 'system', 'admin.seeded', 'user', ?, json_object('email', ?))`,
    [createId(), id, id, env.ADMIN_EMAIL]
  );
  logger.info("Default admin user seeded.", { email: env.ADMIN_EMAIL });
  return { created: true, id };
}
