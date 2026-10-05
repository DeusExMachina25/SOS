import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/layout/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service | SOS",
  description: "The rules for using SOS as a client or an expert.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="Plain terms for a plain deal: you book an independent expert for a paid second opinion, and we run the booking, the payment and the room."
    >
      <Section title="1. About these terms">
        <p>
          These terms are an agreement between you and {SITE.legalName} (&ldquo;{SITE.name}&rdquo;).
          By creating an account or booking a session you accept them, together with our{" "}
          <Link href="/privacy">Privacy Policy</Link> and <Link href="/refunds">Cancellation &amp; Refund Policy</Link>.
          You must be 18 or older.
        </p>
      </Section>

      <Section title="2. What SOS is">
        <p>
          {SITE.name} is a marketplace. Experts are <strong>independent professionals</strong>, not our
          employees. We invite and review experts before they are listed, but we do not supervise their
          advice and we do not guarantee any particular outcome.
        </p>
        <p>
          A session is a consultation and a second opinion. It is <strong>not</strong> a substitute for
          statutory approvals, structural certification, permits or a formal engagement with a licensed
          professional where the law requires one. Decisions about your project remain yours.
        </p>
      </Section>

      <Section title="3. Accounts">
        <p>
          Keep your sign-in details secure and give us accurate information. You are responsible for
          activity on your account. Expert accounts are by invitation and may be suspended if the
          expert no longer meets our standards.
        </p>
      </Section>

      <Section title="4. Booking and payment">
        <ul>
          <li>The price shown for an expert is the price you pay for the session, in Indian rupees, and is set by the expert&rsquo;s listed rate at the time you book.</li>
          <li>You pay when you book. Payment is processed by Razorpay, or, where the expert offers it, directly to the expert by UPI.</li>
          <li>For online payments we hold your payment and release it to the expert around the session: part when the booking is confirmed and the remainder after the session is delivered.</li>
          <li>A session is confirmed only once payment is recorded. Joining the video room requires a paid, active booking.</li>
        </ul>
      </Section>

      <Section title="5. Cancellations and refunds">
        <p>
          Cancellations, rescheduling and refunds follow our{" "}
          <Link href="/refunds">Cancellation &amp; Refund Policy</Link>.
        </p>
      </Section>

      <Section title="6. Your content">
        <p>
          You keep ownership of the drawings, briefs and other material you upload. You give us and
          your booked expert permission to use it only to run and deliver your session. Do not upload
          anything you do not have the right to share, or anything unlawful.
        </p>
        <p>
          Experts keep ownership of the advice and materials they create. Unless you and the expert
          agree otherwise, you may use what they give you for your own project.
        </p>
      </Section>

      <Section title="7. Acceptable use">
        <p>
          Do not harass others, impersonate anyone, upload malware, scrape the service, attempt to
          bypass payment or security controls, or take a booking or payment off the platform to avoid
          fees. We may suspend accounts that break these rules.
        </p>
      </Section>

      <Section title="8. Our responsibility">
        <p>
          We provide the platform &ldquo;as is&rdquo; and work to keep it available, but we do not
          promise it will be uninterrupted or error-free. To the extent the law allows, we are not
          liable for indirect or consequential loss, or for the advice given by experts. Our total
          liability to you for any claim relating to a session is limited to the amount you paid for
          that session. Nothing in these terms limits liability that cannot be limited by law.
        </p>
      </Section>

      <Section title="9. Changes and ending">
        <p>
          We may update these terms; the date above shows the latest version, and continued use means
          you accept the change. You may stop using {SITE.name} at any time, and may ask us to delete
          your account.
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>
          These terms are governed by the laws of India. Courts in India have jurisdiction, subject to
          any rights you have under consumer-protection law. Questions? Write to{" "}
          <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
