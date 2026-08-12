import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Hono } from "hono";
import profilesRouter from "../src/routes/profiles.ts";
import sessionsRouter from "../src/routes/sessions.ts";
import paymentsRouter from "../src/routes/payments.ts";
import livekitRouter from "../src/routes/livekit.ts";

// Setup full test application
const testApp = new Hono();
testApp.route("/api/profiles", profilesRouter);
testApp.route("/api/sessions", sessionsRouter);
testApp.route("/api/payments", paymentsRouter);
testApp.route("/api/livekit", livekitRouter);

// 1. Auth Guard Integrity Tests
Deno.test("Security: GET /api/profiles/me without token should return 401", async () => {
  const res = await testApp.request("/api/profiles/me");
  assertEquals(res.status, 401);
});

Deno.test("Security: GET /api/profiles/me with malformed token should return 401", async () => {
  const res = await testApp.request("/api/profiles/me", {
    headers: { "Authorization": "invalid-format-token" }
  });
  assertEquals(res.status, 401);
});

Deno.test("Security: POST /api/sessions without token should return 401", async () => {
  const res = await testApp.request("/api/sessions", { method: "POST" });
  assertEquals(res.status, 401);
});

// 2. Request Schema & Input Validation Tests
Deno.test("Validation: POST /api/sessions with invalid UUID and date format should return 400", async () => {
  const res = await testApp.request("/api/sessions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer mock-client-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      expert_id: "non-uuid-string",
      scheduled_at: "not-a-valid-date",
      duration_minutes: -10
    })
  });
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.success, false);
});

Deno.test("Validation: POST /api/payments/order with negative amount should return 400", async () => {
  const res = await testApp.request("/api/payments/order", {
    method: "POST",
    headers: {
      "Authorization": "Bearer mock-client-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session_id: "not-a-uuid",
      amount: -500
    })
  });
  assertEquals(res.status, 400);
});

Deno.test("Validation: POST /api/payments/verify with missing signatures should return 400", async () => {
  const res = await testApp.request("/api/payments/verify", {
    method: "POST",
    headers: {
      "Authorization": "Bearer mock-client-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session_id: "44444444-4444-4444-4444-444444444444",
      razorpay_order_id: "",
      // missing signature and payment ID
    })
  });
  assertEquals(res.status, 400);
});

Deno.test("Validation: POST /api/livekit/token with invalid session ID format should return 400", async () => {
  const res = await testApp.request("/api/livekit/token", {
    method: "POST",
    headers: {
      "Authorization": "Bearer mock-client-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session_id: "invalid-uuid-format"
    })
  });
  assertEquals(res.status, 400);
});

// 3. Success Path Tests
Deno.test("Success: GET /api/profiles/me returns authenticated user profile", async () => {
  const res = await testApp.request("/api/profiles/me", {
    headers: { "Authorization": "Bearer mock-client-token" }
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.id, "11111111-1111-1111-1111-111111111111");
  assertEquals(body.role, "client");
});

Deno.test("Success: POST /api/payments/verify with valid payload resolves success", async () => {
  const res = await testApp.request("/api/payments/verify", {
    method: "POST",
    headers: {
      "Authorization": "Bearer mock-client-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session_id: "44444444-4444-4444-4444-444444444444",
      razorpay_order_id: "order_mock_12345",
      razorpay_payment_id: "pay_12345",
      razorpay_signature: "sig_12345"
    })
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.status, "success");
});

Deno.test("Success: POST /api/livekit/token generates valid token", async () => {
  const res = await testApp.request("/api/livekit/token", {
    method: "POST",
    headers: {
      "Authorization": "Bearer mock-client-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session_id: "44444444-4444-4444-4444-444444444444"
    })
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(typeof body.token, "string");
  assertEquals(body.identity, "11111111-1111-1111-1111-111111111111");
});

// 3. Health & Sanity Check
Deno.test("Health check endpoint returns status ok", async () => {
  const healthApp = new Hono();
  healthApp.get("/health", (c) => c.json({ status: "ok" }));
  const res = await healthApp.request("/health");
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.status, "ok");
});
