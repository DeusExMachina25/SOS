import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { errorHandler } from "./src/middlewares/error.ts";
import profilesRouter from "./src/routes/profiles.ts";
import sessionsRouter from "./src/routes/sessions.ts";
import paymentsRouter from "./src/routes/payments.ts";
import livekitRouter from "./src/routes/livekit.ts";

const app = new Hono();

// Global Error Handler
app.onError(errorHandler);

// Enable CORS for the Next.js frontend running on port 3000
app.use("/*", cors({
  origin: "http://localhost:3000",
  allowHeaders: ["*"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
  maxAge: 600,
  credentials: true,
}));

// Apply HTTP security headers
app.use("*", secureHeaders());

// Root & Health routes
app.get("/", (c) => {
  return c.json({ message: "Hello from Deno backend API!" });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Route Mounts
app.route("/api/profiles", profilesRouter);
app.route("/api/sessions", sessionsRouter);
app.route("/api/payments", paymentsRouter);
app.route("/api/livekit", livekitRouter);

Deno.serve({ port: 8000 }, app.fetch);
