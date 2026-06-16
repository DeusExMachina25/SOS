import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { supabase, supabaseAdmin } from "../../db/supabase.ts";
import { authMiddleware, Env } from "../middlewares/auth.ts";

const router = new Hono<Env>();

router.use("*", authMiddleware);

// GET /api/profiles/me
router.get("/me", async (c) => {
  const user = c.get("user");
  
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return c.json({ error: error?.message || "Profile not found" }, 404);
  }

  return c.json(data);
});

const updateProfileSchema = z.object({
  full_name: z.string().min(1, "Name cannot be empty").optional(),
  phone: z.string().optional(),
});

// PATCH /api/profiles/me
router.patch("/me", zValidator("json", updateProfileSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: body.full_name,
      phone: body.phone,
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ message: "Profile updated successfully", profile: data });
});

// GET /api/profiles/experts
router.get("/experts", async (c) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, created_at")
    .eq("role", "expert");

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data);
});

export default router;
