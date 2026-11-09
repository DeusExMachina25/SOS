/**
 * Booking confirmation emails, as pure functions so they can be tested
 * without a database or an email provider.
 */
import { formatInr } from "@/lib/data/format";
import type { Email } from "./send";

export interface PaidBooking {
  sessionId: string;
  title: string | null;
  startsAt: string; // ISO
  endsAt: string; // ISO
  amountInr: number;
  /** IANA zone the times are shown in (the expert's clock). */
  timezone: string;
  client: { name: string; email: string | null };
  expert: { name: string; email: string | null };
  siteUrl: string;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** "Mon, 10 Nov 2026, 4:00 pm to 5:00 pm (Asia/Kolkata)" */
export function formatWhen(startsAt: string, endsAt: string, timeZone: string) {
  const day = new Intl.DateTimeFormat("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone,
  }).format(new Date(startsAt));
  const time = (iso: string) =>
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })
      .format(new Date(iso))
      .toLowerCase();
  return `${day}, ${time(startsAt)} to ${time(endsAt)} (${timeZone})`;
}

/** "Mon, 10 Nov, 4:00 pm" for subject lines. */
export function formatShortWhen(startsAt: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone,
  })
    .format(new Date(startsAt))
    .replace(/\b(AM|PM)\b/, (m) => m.toLowerCase());
}

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** A calendar invite (.ics) in UTC, so every calendar shows the viewer's own time. */
export function buildIcs(b: PaidBooking, withName: string) {
  const link = `${b.siteUrl}/dashboard`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SOS//Bookings//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.sessionId}@sos`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(b.startsAt)}`,
    `DTEND:${icsDate(b.endsAt)}`,
    `SUMMARY:${icsText(`SOS session with ${withName}`)}`,
    `DESCRIPTION:${icsText(`${b.title ?? "Session"}\nJoin from your dashboard: ${link}`)}`,
    `URL:${link}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function layout(heading: string, lines: [string, string][], note: string, cta: { label: string; href: string }) {
  const rows = lines
    .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#666">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`)
    .join("");
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h1>
<table style="border-collapse:collapse;font-size:15px;margin-bottom:16px">${rows}</table>
<p style="font-size:15px;line-height:1.5">${escapeHtml(note)}</p>
<p><a href="${escapeHtml(cta.href)}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">${escapeHtml(cta.label)}</a></p>
<p style="font-size:12px;color:#888;margin-top:24px">A calendar invite is attached.</p>
</div>`;
  const text = `${heading}\n\n${lines.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${note}\n\n${cta.label}: ${cta.href}\n\nA calendar invite is attached.\n`;
  return { html, text };
}

/** One email for the client and one for the expert, skipping anyone without an address. */
export function buildBookingPaidEmails(b: PaidBooking): Email[] {
  const when = formatWhen(b.startsAt, b.endsAt, b.timezone);
  const topic = b.title?.trim() || "Session";
  const emails: Email[] = [];

  if (b.client.email) {
    const { html, text } = layout(
      "Your session is booked",
      [["Expert", b.expert.name], ["Topic", topic], ["When", when], ["Paid", formatInr(b.amountInr)]],
      "Your payment is held safely until the session is done. You can join the call from your dashboard up to 15 minutes before it starts, and share drawings or quotes in the session's vault beforehand.",
      { label: "Open your dashboard", href: `${b.siteUrl}/dashboard/client/sessions` }
    );
    emails.push({
      to: b.client.email,
      subject: `Booked: ${b.expert.name}, ${formatShortWhen(b.startsAt, b.timezone)}`,
      html,
      text,
      attachments: [{ filename: "sos-session.ics", content: Buffer.from(buildIcs(b, b.expert.name)).toString("base64"), contentType: "text/calendar" }],
    });
  }

  if (b.expert.email) {
    const { html, text } = layout(
      "New paid booking",
      [["Client", b.client.name], ["Topic", topic], ["When", when], ["Fee", formatInr(b.amountInr)]],
      "The client has paid and the booking is confirmed. Check the session's vault for any files they share before the call.",
      { label: "Open your sessions", href: `${b.siteUrl}/dashboard/expert/sessions` }
    );
    emails.push({
      to: b.expert.email,
      subject: `New booking: ${b.client.name}, ${formatShortWhen(b.startsAt, b.timezone)}`,
      html,
      text,
      attachments: [{ filename: "sos-session.ics", content: Buffer.from(buildIcs(b, b.client.name)).toString("base64"), contentType: "text/calendar" }],
    });
  }

  return emails;
}
