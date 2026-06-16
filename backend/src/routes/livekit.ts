import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { sign } from "hono/jwt";
import { supabaseAdmin } from "../../db/supabase.ts";
import { authMiddleware, AuthenticatedUser } from "../middlewares/auth.ts";

const router = new Hono();

router.use("*", authMiddleware);

const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY") || "";
const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET") || "";

const generateTokenSchema = z.object({
  session_id: z.string().uuid("Invalid session ID"),
});

router.post("/token", zValidator("json", generateTokenSchema), async (c) => {
  const user = c.get("user") as AuthenticatedUser;
  const { session_id } = c.req.valid("json");

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("id", session_id)
    .single();

  if (sessionError || !session) {
    return c.json({ error: "Session not found" }, 404);
  }

  const isClient = user.id === session.client_id;
  const isExpert = user.id === session.expert_id;
  const isAdmin = user.role === "admin";

  if (!isClient && !isExpert && !isAdmin) {
    return c.json({ error: "Forbidden: You are not assigned to this session" }, 403);
  }

  if (!livekitApiKey || !livekitApiSecret) {
    console.warn("⚠️ LiveKit API credentials missing. Returning mock room token.");
    return c.json({
      token: `mock_token_${Date.now()}`,
      room: `SOS-Session-${session_id.replace(/-/g, "")}`,
      identity: user.id,
    });
  }

  try {
    const roomName = `SOS-Session-${session_id.replace(/-/g, "")}`;
    const displayName = user.email || user.phone || "User";
    
    const payload = {
      iss: livekitApiKey,
      sub: user.id,
      nbf: Math.floor(Date.now() / 1000) - 5,
      exp: Math.floor(Date.now() / 1000) + 7200,
      video: {
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
      },
      name: displayName,
      metadata: JSON.stringify({ role: user.role })
    };

    const token = await sign(payload, livekitApiSecret, "HS256");

    return c.json({
      token,
      room: roomName,
      identity: user.id,
    });
  } catch (err) {
    console.error("[LiveKit Token Error]:", err);
    return c.json({ error: "Failed to generate LiveKit room token" }, 500);
  }
});

export default router;
