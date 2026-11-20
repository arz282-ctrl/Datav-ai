import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/index.js";
import { config } from "../src/config.js";

describe("API Security & Authentication", () => {
  it("rejects requests missing X-API-Key with 401", async () => {
    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Missing required X-API-Key header");
  });

  it("rejects requests with invalid X-API-Key with 401", async () => {
    const res = await request(app)
      .get("/api/documents")
      .set("X-API-Key", "invalid-fake-token-12345");
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Invalid API key");
  });
});
