import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { emailConfigured } from "@/lib/email/send";
import { sendSessionReminders } from "@/lib/email/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sameSecret(given: string | null, expected: string) {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Daily reminder job (scheduled in vercel.json). Vercel calls it with
 * "Authorization: Bearer <CRON_SECRET>"; anyone else gets 401.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !sameSecret(request.headers.get("authorization"), `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!emailConfigured()) return NextResponse.json({ skipped: "Email is not set up" });

  try {
    return NextResponse.json(await sendSessionReminders());
  } catch (e) {
    console.error("Reminder job failed", e);
    return NextResponse.json({ error: "Reminder job failed" }, { status: 500 });
  }
}
