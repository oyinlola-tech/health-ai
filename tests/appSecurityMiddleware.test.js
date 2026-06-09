import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

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

  it("rejects unsafe non-API requests without a CSRF token before handlers run", async () => {
    const response = await request(createApp()).post("/login").send({});

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "FORBIDDEN",
      message: "Invalid CSRF token."
    });
  });

  it("allows unsafe requests to continue when the CSRF header matches the signed cookie", async () => {
    const agent = request.agent(createApp());
    const csrfResponse = await agent.get("/api/auth/csrf").expect(200);

    const response = await agent.post("/login").set("X-CSRF-Token", csrfResponse.body.data.csrfToken).send({});

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: "ROUTE_NOT_FOUND"
    });
  });
});
