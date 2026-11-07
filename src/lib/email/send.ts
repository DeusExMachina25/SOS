import "server-only";

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded file content. */
  content: string;
  contentType?: string;
}

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
}

/** Email is switched off until both settings exist, so dev and forks send nothing. */
export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Sends one email through Resend's HTTP API. Returns false (and logs) instead
 * of throwing, because an email failure must never undo a payment or booking.
 */
export async function sendEmail(email: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email.to],
        reply_to: process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined,
        subject: email.subject,
        text: email.text,
        html: email.html,
        attachments: email.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          content_type: a.contentType,
        })),
      }),
    });
    if (!res.ok) {
      console.error("Email send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("Email send failed", e);
    return false;
  }
}
