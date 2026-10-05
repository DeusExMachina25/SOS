import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/layout/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | SOS",
  description: "How cancellations, rescheduling and refunds work on SOS.",
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Cancellation & Refunds"
      intro="Life moves. Here is exactly what happens to your payment if a session does not go ahead."
    >
      <Section title="If you cancel">
        <ul>
          <li><strong>24 hours or more before the start:</strong> full refund.</li>
          <li><strong>Less than 24 hours before the start:</strong> no refund, because the expert has held that time for you. You may ask to reschedule once, subject to the expert&rsquo;s availability.</li>
        </ul>
      </Section>

      <Section title="If the expert cancels or does not attend">
        <p>
          If the expert cancels, or does not join within 15 minutes of the start time, you receive a
          full refund, or you can rebook at no cost.
        </p>
      </Section>

      <Section title="If something goes wrong">
        <p>
          If a technical failure on our side prevents the session from taking place, we will refund you
          in full or rebook you. If the session took place but you were not satisfied, write to us
          within 7 days with the session date and what went wrong; we review each case individually.
        </p>
      </Section>

      <Section title="How refunds are paid">
        <p>
          Approved refunds on online payments return to the original payment method within 5&ndash;7
          working days of approval, depending on your bank. For payments made directly to an expert by
          UPI, the expert refunds you directly and we will help if there is a dispute.
        </p>
      </Section>

      <Section title="How to ask">
        <p>
          Email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> with the session
          title, date and the name on the booking. We confirm every cancellation in writing and the
          time of your request is the time we receive your email.
        </p>
      </Section>
    </LegalPage>
  );
}
