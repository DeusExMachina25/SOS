import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Hono } from "hono";
import profilesRouter from "../src/routes/profiles.ts";
import sessionsRouter from "../src/routes/sessions.ts";

const testApp = new Hono();
testApp.route("/api/profiles", profilesRouter);
testApp.route("/api/sessions", sessionsRouter);

Deno.test("GET /api/profiles/me without token should return 401", async () => {
  const res = await testApp.request("/api/profiles/me", {
    method: "GET",
  });
  assertEquals(res.status, 401);
});

Deno.test("GET /api/sessions without token should return 401", async () => {
  const res = await testApp.request("/api/sessions", {
    method: "GET",
  });
  assertEquals(res.status, 401);
});

Deno.test("GET /health should return 200", async () => {
  const healthApp = new Hono();
  healthApp.get("/health", (c) => c.json({ status: "ok" }));
  const res = await healthApp.request("/health");
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.status, "ok");
});
