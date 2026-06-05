import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

function createMigrationConnection() {
  const applied = new Set();
  const calls = [];
  return {
    calls,
    async execute(sql, params = []) {
      calls.push({ sql, params });
      if (sql.startsWith("select id from schema_migrations")) {
        return [applied.has(params[0]) ? [{ id: params[0] }] : []];
      }
      if (sql.startsWith("insert into schema_migrations")) {
        applied.add(params[0]);
      }
      return [[]];
    },
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn()
  };
}

describe("MySQL database bootstrap", () => {
  it("runs JavaScript migrations once and skips already applied migrations", async () => {
    const { runJavaScriptMigrations } = await import("../src/database/bootstrap.js");
    const connection = createMigrationConnection();
    const up = vi.fn(async (client) => client.execute("create table if not exists demo (id varchar(36) primary key)"));

    await runJavaScriptMigrations(connection, [["demo", up]]);
    await runJavaScriptMigrations(connection, [["demo", up]]);

    expect(up).toHaveBeenCalledTimes(1);
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  it("retries MySQL server connections before failing or succeeding", async () => {
    const { connectWithRetry } = await import("../src/database/bootstrap.js");
    const factory = vi
      .fn()
      .mockRejectedValueOnce(new Error("server warming up"))
      .mockRejectedValueOnce(new Error("server still warming up"))
      .mockResolvedValue({ connected: true });

    const connection = await connectWithRetry(factory, { retries: 3, delayMs: 0 });

    expect(connection).toEqual({ connected: true });
    expect(factory).toHaveBeenCalledTimes(3);
  });
});

describe("admin seed", () => {
  it("creates one bcrypt-hashed admin user only when no admin exists", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    vi.stubEnv("ADMIN_PASSWORD", "VeryStrongPassword123!");
    const { seedAdminUser } = await import("../src/database/seeds/admin.js");
    const rowsByQuery = new Map();
    const insertedUsers = [];
    const connection = {
      async execute(sql, params = []) {
        if (sql.startsWith("select id from users")) return [rowsByQuery.get("admin") || []];
        if (sql.startsWith("insert into users")) {
          insertedUsers.push(params);
          rowsByQuery.set("admin", [{ id: params[0] }]);
        }
        return [[]];
      }
    };

    const first = await seedAdminUser(connection);
    const second = await seedAdminUser(connection);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(insertedUsers).toHaveLength(1);
    expect(insertedUsers[0][1]).toBe("admin@example.com");
    expect(insertedUsers[0][2]).not.toBe("VeryStrongPassword123!");
    expect(insertedUsers[0][2]).toMatch(/^\$2[aby]\$/);
  });
});
