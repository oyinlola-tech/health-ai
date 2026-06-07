import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("app security middleware", () => {
  it("adds rate limit headers before static and API handlers", async () => {
    const response = await request(createApp()).get("/").expect(200);

    expect(response.headers["ratelimit-limit"]).toBeDefined();
    expect(response.headers["ratelimit-remaining"]).toBeDefined();
  });

  it("rejects unsafe API requests without a CSRF token before route handlers run", async () => {
    const response = await request(createApp()).post("/api/auth/login").send({
      email: "patient@example.com",
      password: "Password123!"
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "FORBIDDEN",
      message: "Invalid CSRF token."
    });
  });
});
