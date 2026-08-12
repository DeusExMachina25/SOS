import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { supabaseAdmin } from "../../db/supabase.ts";
import { authMiddleware, requireRole, Env } from "../middlewares/auth.ts";

const router = new Hono<Env>();

router.use("*", authMiddleware);

// GET /api/sessions - List sessions
router.get("/", async (c) => {
  const user = c.get("user");
  
  let query = supabaseAdmin
    .from("sessions")
    .select(`
      id,
      status,
      scheduled_at,
      duration_minutes,
      created_at,
      client_id,
      expert_id
    `);

  if (user.role === "client") {
    query = query.eq("client_id", user.id);
  } else if (user.role === "expert") {
    query = query.eq("expert_id", user.id);
  } else if (user.role !== "admin") {
    return c.json({ error: "Access denied" }, 403);
  }

  const { data, error } = await query.order("scheduled_at", { ascending: false });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data);
});

const bookSessionSchema = z.object({
  expert_id: z.string().uuid("Invalid expert ID"),
  scheduled_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date-time string",
  }),
  duration_minutes: z.number().int().positive().default(60),
});

// POST /api/sessions - Book a new session
router.post("/", requireRole(["client"]), zValidator("json", bookSessionSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const { data: expertProfile, error: expertError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", body.expert_id)
    .single();

  if (expertError || !expertProfile || (expertProfile as any).role !== "expert") {
    return c.json({ error: "Target expert not found or invalid expert ID" }, 400);
  }

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert({
      client_id: user.id,
      expert_id: body.expert_id,
      scheduled_at: body.scheduled_at,
      duration_minutes: body.duration_minutes,
      status: "scheduled",
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ message: "Session booked successfully", session: data }, 201);
});

const updateSessionSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled"]),
});

// PATCH /api/sessions/:id - Update session status
router.patch("/:id", zValidator("json", updateSessionSchema), async (c) => {
  const user = c.get("user");
  const sessionId = c.req.param("id");
  const { status } = c.req.valid("json");

  const { data: session, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (fetchError || !session) {
    return c.json({ error: "Session not found" }, 404);
  }

  const isClientOwner = user.role === "client" && (session as any).client_id === user.id;
  const isExpertOwner = user.role === "expert" && (session as any).expert_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isClientOwner && !isExpertOwner && !isAdmin) {
    return c.json({ error: "Forbidden: Access denied" }, 403);
  }

  if (user.role === "client" && status === "completed") {
    return c.json({ error: "Clients cannot mark a session as completed" }, 400);
  }

  const { data: updatedSession, error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({ status })
    .eq("id", sessionId)
    .select()
    .single();

  if (updateError) {
    return c.json({ error: updateError.message }, 400);
  }

  return c.json({ message: `Session status updated to ${status}`, session: updatedSession });
});

export default router;
