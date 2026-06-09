import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { pool } from "../../src/config/database.js";

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "true";
const integrationDescribe = runIntegrationTests ? describe : describe.skip;

integrationDescribe("RBAC Security Fixes", () => {
  let app;
  let agent;
  const testUserEmail = "test-security@example.com";
  const testUserPassword = "Test@123456";
  let authToken;

  beforeAll(async () => {
    app = createApp();
    agent = request.agent(app);

    // Register test user
    try {
      await agent
        .post("/api/auth/register")
        .send({
          email: testUserEmail,
          password: testUserPassword,
          firstName: "Test",
          lastName: "User",
          role: "Patient"
        });
    } catch {
      console.log("User might already exist");
    }

    // Login to get auth token
    const loginRes = await agent
      .post("/api/auth/login")
      .send({
        email: testUserEmail,
        password: testUserPassword
      });

    authToken = loginRes.body?.accessToken || loginRes.body?.token;
    console.log("Auth token obtained:", !!authToken);
  });

  afterAll(async () => {
    try {
      await pool.query("DELETE FROM users WHERE email = $1", [testUserEmail]);
    } catch (error) {
      console.log("Cleanup error (non-critical):", error.message);
    } finally {
      await pool.end();
    }
  });

  describe("Issue 1: Recruitment File Upload Security", () => {
    it("POST /api/recruitment/applications should REJECT unauthenticated requests", async () => {
      const response = await agent
        .post("/api/recruitment/applications")
        .expect(401);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toMatch(/unauthorized|token|authentication/i);
      console.log("✓ Unauthenticated recruitment application rejected");
    });

    it("POST /api/recruitment/applications should ACCEPT authenticated requests", async () => {
      // Note: This will fail validation if CV file is not provided, but that's expected
      // We're testing authentication, not file handling
      const response = await agent
        .post("/api/recruitment/applications")
        .set("Authorization", `Bearer ${authToken}`)
        .field("jobId", "test-job-id")
        .field("coverLetter", "Test cover letter");

      // Should be 400 (bad request for missing file) not 401 (unauthorized)
      expect(response.status).not.toBe(401);
      console.log(`✓ Authenticated recruitment application processed (status: ${response.status})`);
    });

    it("GET /api/recruitment/jobs should remain PUBLIC (no auth required)", async () => {
      await request(app)
        .get("/api/recruitment/jobs")
        .expect(200);

      console.log("✓ Public recruitment jobs endpoint accessible without auth");
    });
  });

  describe("Issue 2: Legal Routes RBAC Consistency", () => {
    it("POST /api/legal/consents should REJECT unauthenticated requests", async () => {
      const response = await agent
        .post("/api/legal/consents")
        .expect(401);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toMatch(/unauthorized|token|authentication/i);
      console.log("✓ Unauthenticated legal consent rejected");
    });

    it("POST /api/legal/consents should ACCEPT authenticated requests", async () => {
      // Will fail validation but that's okay - we're testing authentication
      const response = await agent
        .post("/api/legal/consents")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      // Should NOT be 401 (unauthorized)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toMatch(/5\d\d/); // Not a server error either
      console.log(`✓ Authenticated legal consent processed (status: ${response.status})`);
    });

    it("GET /api/legal/policies should remain PUBLIC (no auth required)", async () => {
      await request(app)
        .get("/api/legal/policies")
        .expect(200);

      console.log("✓ Public legal policies endpoint accessible without auth");
    });
  });

  describe("RBAC Consistency Checks", () => {
    it("Should use consistent .use() pattern for authentication middleware", async () => {
      // This is a code-level test - verify the pattern is used
      // by checking that authenticated endpoints consistently reject unauthenticated requests
      
      const endpoints = [
        { method: "post", path: "/api/recruitment/applications" },
        { method: "post", path: "/api/legal/consents" }
      ];

      for (const endpoint of endpoints) {
        const response = await agent[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
        console.log(`✓ ${endpoint.method.toUpperCase()} ${endpoint.path} consistently requires auth`);
      }
    });

    it("Admin-only endpoints should require both authentication AND role", async () => {
      // Patient user trying to access admin-only recruitment endpoint
      const response = await agent
        .post("/api/recruitment/jobs")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Test Job",
          description: "Test Description"
        });

      // Should be 403 (forbidden due to role) not 401 (unauthorized)
      expect(response.status).toBe(403);
      console.log("✓ Patient user correctly forbidden from admin endpoint");
    });
  });

  describe("Error Response Validation", () => {
    it("Unauthenticated requests should return 401 with clear error message", async () => {
      const response = await agent
        .post("/api/recruitment/applications")
        .expect(401);

      expect(response.body).toHaveProperty("error");
      expect(typeof response.body.error).toBe("string");
      expect(response.body.error.length).toBeGreaterThan(0);
      console.log(`✓ Unauthenticated error: "${response.body.error}"`);
    });

    it("Forbidden requests should return 403 with clear error message", async () => {
      const response = await agent
        .post("/api/recruitment/jobs")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Test" });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
      console.log(`✓ Forbidden error: "${response.body.error}"`);
    });
  });
});
