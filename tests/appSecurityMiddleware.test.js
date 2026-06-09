import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const sourceRoot = path.resolve("src");

function sourceFiles(dir = sourceRoot) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

describe("app security middleware", () => {
  it("adds rate limit headers before static and API handlers", async () => {
    const response = await request(createApp()).get("/").expect(200);

    expect(response.headers["ratelimit-limit"]).toBeDefined();
    expect(response.headers["ratelimit-remaining"]).toBeDefined();
  });

  it("serves legacy favicon requests without consuming the SPA route quota", async () => {
    const app = createApp();

    await request(app).get("/favicon.ico").expect(200);

    for (let index = 0; index < 12; index += 1) {
      await request(app).get("/dashboard").expect(200);
    }
  });

  it("does not apply global CSRF protection to JWT API routes", async () => {
    const response = await request(createApp()).post("/api/reports").send({});

    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({
      code: "UNAUTHORIZED"
    });
  });

  it("does not apply global CSRF protection to non-API routes", async () => {
    const response = await request(createApp()).post("/login").send({});

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: "ROUTE_NOT_FOUND"
    });
  });

  it("rejects refresh-token cookie requests from untrusted browser origins", async () => {
    const response = await request(createApp()).post("/api/auth/refresh").set("Origin", "https://evil.example").send({});

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringMatching(/origin/i)
    });
  });

  it("requires the refresh-token cookie only on the refresh endpoint", async () => {
    const response = await request(createApp()).post("/api/auth/refresh").send({});

    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Refresh token cookie is required."
    });
  });

  it("keeps cookie reads limited to the refresh-token boundary", () => {
    const cookieReaders = sourceFiles()
      .filter((file) => fs.readFileSync(file, "utf8").includes("req.cookies"))
      .map((file) => path.relative(sourceRoot, file).replaceAll("\\", "/"));

    expect(cookieReaders.sort()).toEqual(["controllers/authController.js", "middlewares/refreshTokenCookieGuard.js"]);
  });

  it("uses strict, path-scoped httpOnly refresh cookies", () => {
    const source = fs.readFileSync(path.join(sourceRoot, "controllers/authController.js"), "utf8");

    expect(source).toContain("httpOnly: true");
    expect(source).toContain('sameSite: "strict"');
    expect(source).toContain('path: "/api/auth/refresh"');
    expect(source).toContain('secure: env.NODE_ENV === "production"');
  });
});
