/**
 * Emails an audit report through Resend's HTTP API (no extra dependency).
 *
 * Configure in .env.local (all three required, nothing is sent otherwise):
 *   RESEND_API_KEY      API key from resend.com
 *   REPORT_EMAIL_FROM   a sender on a domain verified in Resend, e.g. "SOS Audit <audit@yourdomain.com>"
 *   REPORT_EMAIL_TO     comma-separated recipients
 *
 * Returns { sent, reason }. It never throws, so a mail failure cannot fail or
 * hide the audit that produced the report.
 */
export async function sendReportEmail({ env, subject, html, text, attachments = [] }) {
  const key = env.RESEND_API_KEY;
  const from = env.REPORT_EMAIL_FROM;
  const to = (env.REPORT_EMAIL_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const missing = [!key && "RESEND_API_KEY", !from && "REPORT_EMAIL_FROM", !to.length && "REPORT_EMAIL_TO"].filter(Boolean);
  if (missing.length) return { sent: false, reason: `Email not configured (missing ${missing.join(", ")})` };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString("base64"),
        })),
      }),
    });
    if (!res.ok) return { sent: false, reason: `Resend rejected the email (${res.status}): ${(await res.text()).slice(0, 300)}` };
    const body = await res.json().catch(() => ({}));
    return { sent: true, reason: `Sent to ${to.join(", ")}${body.id ? ` (id ${body.id})` : ""}` };
  } catch (err) {
    return { sent: false, reason: `Could not reach Resend: ${err instanceof Error ? err.message : err}` };
  }
}
