import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { supabaseAdmin } from "../../db/supabase.ts";
import { authMiddleware, AuthenticatedUser } from "../middlewares/auth.ts";

const router = new Hono();

router.use("*", authMiddleware);

const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "";
const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

// POST /api/payments/order - Create Razorpay Order
const createOrderSchema = z.object({
  session_id: z.string().uuid("Invalid session ID"),
  amount: z.number().int().positive("Amount must be positive"), // In paise (e.g. 50000 for Rs. 500)
});

router.post("/order", zValidator("json", createOrderSchema), async (c) => {
  const body = c.req.valid("json");

  // Verify the session exists
  const { data: session, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("id", body.session_id)
    .single();

  if (fetchError || !session) {
    return c.json({ error: "Session not found" }, 404);
  }

  if (!keyId || !keySecret) {
    // Development fallback mock order if keys are missing
    console.warn("⚠️ Razorpay keys are not set. Returning mock order ID.");
    return c.json({
      id: `order_mock_${Date.now()}`,
      amount: body.amount,
      currency: "INR",
      receipt: `receipt_${body.session_id}`,
      key: "rzp_test_mockkey",
    });
  }

  try {
    const authHeaderValue = "Basic " + btoa(`${keyId}:${keySecret}`);
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeaderValue,
      },
      body: JSON.stringify({
        amount: body.amount,
        currency: "INR",
        receipt: `receipt_${body.session_id}`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return c.json({ error: `Razorpay API error: ${errText}` }, 502);
    }

    const order = await res.json();
    return c.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key: keyId,
    });
  } catch (err) {
    console.error("[Razorpay Order Error]:", err);
    return c.json({ error: "Failed to generate Razorpay order" }, 500);
  }
});

// POST /api/payments/verify - Verify Payment Signature
const verifyPaymentSchema = z.object({
  session_id: z.string().uuid("Invalid session ID"),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

router.post("/verify", zValidator("json", verifyPaymentSchema), async (c) => {
  const body = c.req.valid("json");

  // Bypass for mock order IDs in local dev
  if (body.razorpay_order_id.startsWith("order_mock_")) {
    // Update session status to "scheduled" (or "confirmed" if we add a paid status flag)
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("sessions")
      .update({ status: "scheduled" })
      .eq("id", body.session_id)
      .select()
      .single();

    if (updateError) {
      return c.json({ error: updateError.message }, 400);
    }

    return c.json({ status: "success", session: updatedSession });
  }

  if (!keySecret) {
    return c.json({ error: "Missing Razorpay configuration" }, 500);
  }

  try {
    // HMAC-SHA256 signature verification using Web Crypto API
    const text = body.razorpay_order_id + "|" + body.razorpay_payment_id;
    const encoder = new TextEncoder();
    const keyBuffer = encoder.encode(keySecret);
    const dataBuffer = encoder.encode(text);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hexSignature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const isVerified = hexSignature === body.razorpay_signature;

    if (!isVerified) {
      return c.json({ error: "Invalid payment signature" }, 400);
    }

    // Update session status to confirmed/scheduled upon verification
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("sessions")
      .update({ status: "scheduled" }) // Standard is scheduled (meaning paid/confirmed)
      .eq("id", body.session_id)
      .select()
      .single();

    if (updateError) {
      return c.json({ error: updateError.message }, 400);
    }

    return c.json({ status: "success", session: updatedSession });
  } catch (err) {
    console.error("[Razorpay Verification Error]:", err);
    return c.json({ error: "Failed to verify payment signature" }, 500);
  }
});

export default router;
