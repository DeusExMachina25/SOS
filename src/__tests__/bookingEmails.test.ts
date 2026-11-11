import { describe, it, expect } from "vitest";
import {
  buildBookingPaidEmails,
  buildIcs,
  buildReminderEmails,
  formatWhen,
  formatShortWhen,
  type PaidBooking,
} from "@/lib/email/bookingEmails";

const booking: PaidBooking = {
  sessionId: "s-1",
  title: "Kitchen quote <check>",
  startsAt: "2026-11-10T10:30:00Z", // 4:00 pm in India
  endsAt: "2026-11-10T11:30:00Z",
  amountInr: 4999,
  method: "razorpay",
  timezone: "Asia/Kolkata",
  client: { name: "Asha", email: "asha@example.com" },
  expert: { name: "Shravani Reddy", email: "shravani@example.com" },
  siteUrl: "https://sos.example",
};

describe("booking emails", () => {
  it("shows times on the expert's clock", () => {
    expect(formatWhen(booking.startsAt, booking.endsAt, "Asia/Kolkata")).toMatch(/4:00 pm to 5:00 pm \(Asia\/Kolkata\)$/);
    expect(formatShortWhen(booking.startsAt, "Asia/Kolkata")).toMatch(/10 Nov.*4:00 pm/);
  });

  it("writes one email to the client and one to the expert", () => {
    const [client, expert] = buildBookingPaidEmails(booking);
    expect(client.to).toBe("asha@example.com");
    expect(client.subject).toMatch(/^Booked: Shravani Reddy, /);
    expect(client.text).toContain("₹4,999");
    expect(client.text).toContain("https://sos.example/dashboard/client/sessions");
    expect(client.text).toContain("held safely");
    expect(expert.to).toBe("shravani@example.com");
    expect(expert.subject).toMatch(/^New booking: Asha, /);
  });

  it("doesn't promise escrow for a direct UPI payment", () => {
    const [client, expert] = buildBookingPaidEmails({ ...booking, method: "upi_direct" });
    expect(client.text).toContain("confirmed your UPI payment");
    expect(client.text).not.toContain("held safely");
    expect(expert.text).toContain("You confirmed the client's UPI payment");
  });

  it("escapes user text in the HTML", () => {
    const [client] = buildBookingPaidEmails(booking);
    expect(client.html).toContain("Kitchen quote &lt;check&gt;");
    expect(client.html).not.toContain("<check>");
  });

  it("skips anyone without an email address", () => {
    const emails = buildBookingPaidEmails({ ...booking, client: { name: "Asha", email: null } });
    expect(emails.map((e) => e.to)).toEqual(["shravani@example.com"]);
  });

  it("attaches a UTC calendar invite", () => {
    const ics = buildIcs(booking, "Shravani Reddy");
    expect(ics).toContain("DTSTART:20261110T103000Z");
    expect(ics).toContain("DTEND:20261110T113000Z");
    expect(ics).toContain("SUMMARY:SOS session with Shravani Reddy");
    const [client] = buildBookingPaidEmails(booking);
    expect(Buffer.from(client.attachments![0].content, "base64").toString()).toContain("BEGIN:VEVENT");
  });

  it("escapes commas, semicolons and newlines in the invite", () => {
    const ics = buildIcs({ ...booking, title: "Roof; walls, and\nfloor" }, "A, B");
    expect(ics).toContain("SUMMARY:SOS session with A\\, B");
    expect(ics).toContain("DESCRIPTION:Roof\\; walls\\, and\\nfloor");
  });
});

describe("reminder emails", () => {
  it("reminds both sides with the time and a link", () => {
    const [client, expert] = buildReminderEmails(booking);
    expect(client.to).toBe("asha@example.com");
    expect(client.subject).toMatch(/^Reminder: Shravani Reddy, .*4:00 pm/);
    expect(client.text).toContain("4:00 pm to 5:00 pm (Asia/Kolkata)");
    expect(client.text).toContain("https://sos.example/dashboard/client/sessions");
    expect(expert.to).toBe("shravani@example.com");
    expect(expert.subject).toMatch(/^Reminder: Asha, /);
    expect(expert.text).toContain("https://sos.example/dashboard/expert/sessions");
  });

  it("never mentions money", () => {
    for (const email of buildReminderEmails(booking)) expect(email.text).not.toContain("₹");
  });

  it("skips anyone without an email address", () => {
    const emails = buildReminderEmails({ ...booking, expert: { name: "Shravani Reddy", email: null } });
    expect(emails.map((e) => e.to)).toEqual(["asha@example.com"]);
  });
});
