import { supabase } from "@/utils/supabase/client";
import { SITE } from "@/lib/site";

export type InquirySource = "platter" | "us";

export type InquiryResult = { ok: true } | { ok: false; error: string };

/**
 * Saves a public contact-form submission to the `inquiries` table.
 *
 * `website` is a honeypot: it is hidden from people, so only bots fill it in.
 * When it is set we report success without storing anything.
 */
export async function submitInquiry(
  data: FormData,
  source: InquirySource
): Promise<InquiryResult> {
  if (String(data.get("website") ?? "").trim() !== "") return { ok: true };

  if (!supabase) {
    return {
      ok: false,
      error: `We can't reach the server right now. Email us at ${SITE.contactEmail} instead.`,
    };
  }

  const { error } = await supabase.from("inquiries").insert({
    full_name: String(data.get("full_name") ?? "").trim(),
    email: String(data.get("email") ?? "").trim(),
    subject: String(data.get("subject") ?? "").trim() || null,
    message: String(data.get("message") ?? "").trim(),
    source,
  });

  if (error) {
    console.error("Inquiry submission failed", error);
    return {
      ok: false,
      error: `That didn't send. Try again, or email us at ${SITE.contactEmail}.`,
    };
  }
  return { ok: true };
}
