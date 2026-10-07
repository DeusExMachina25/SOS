import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/layout/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy | SOS",
  description: "What SOS collects, why, who sees it, and the choices you have.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="You bring us drawings, briefs and honest questions. This page explains what we keep, who can see it, and how to take it back."
    >
      <Section title="Who we are">
        <p>
          {SITE.legalName} (&ldquo;{SITE.name}&rdquo;, &ldquo;we&rdquo;) runs a marketplace where
          clients book paid consultation sessions with independent experts.
          {SITE.address ? ` Our registered office is ${SITE.address}.` : ""} For anything in this
          policy, write to <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
        </p>
      </Section>

      <Section title="What we collect">
        <ul>
          <li><strong>Account details:</strong> your name, email address and, if you sign in with a phone number, that number.</li>
          <li><strong>Bookings:</strong> the expert you book, the session title and time, the price, and its payment status.</li>
          <li><strong>Files and messages:</strong> documents you upload to a session&rsquo;s vault and messages you send in chat.</li>
          <li><strong>Payments:</strong> handled by Razorpay. We receive the payment status and reference IDs. We never see or store your card, UPI PIN or bank login.</li>
          <li><strong>Contact forms:</strong> the name, email and message you send us.</li>
          <li><strong>Technical data:</strong> a sign-in cookie that keeps you logged in, plus basic server logs (IP address, browser, time) used to keep the service secure.</li>
        </ul>
        <p>
          Video sessions run through LiveKit. <strong>We do not record your sessions.</strong> We use no
          advertising trackers or third-party analytics.
        </p>
      </Section>

      <Section title="How we use it">
        <ul>
          <li>To create your account, run bookings, take payment and hold it in escrow.</li>
          <li>To let you and your expert exchange files and messages and meet by video.</li>
          <li>To reply to your enquiries, send booking and payment notices, and keep the service safe.</li>
          <li>To meet legal, tax and accounting obligations.</li>
        </ul>
        <p>We do not sell your personal data.</p>
      </Section>

      <Section title="Who can see it">
        <p>
          <strong>The expert you book</strong> can see the files, messages and details of the sessions
          you share with them, and no other expert can. Our administrators can access data when needed
          to support you, investigate abuse or comply with the law.
        </p>
        <p>We rely on service providers that process data on our behalf:</p>
        <ul>
          <li><strong>Supabase</strong> &mdash; database, sign-in and file storage.</li>
          <li><strong>LiveKit</strong> &mdash; real-time video and audio.</li>
          <li><strong>Razorpay</strong> &mdash; payment processing.</li>
          <li><strong>Vercel</strong> &mdash; website hosting.</li>
          <li><strong>Google Fonts</strong> &mdash; loads typefaces, which means your browser contacts Google when you visit.</li>
        </ul>
        <p>
          Some of these providers process data outside India. We choose providers that protect data
          to a recognised standard, and we share only what each needs.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Account, booking and message data is kept while your account is active. Payment and invoice
          records are kept for as long as tax and accounting law requires. Contact-form messages are
          kept for up to 24 months. When you ask us to delete your account we remove your personal
          data, except records we must legally retain.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Data is encrypted in transit. Files sit in a private store and are opened only through
          short-lived links that check you are a participant in that session. Access to every table is
          limited by database rules, not just by the website. No system is perfectly secure, so please
          use a strong, unique password or a one-time code and tell us at once if you suspect misuse.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Under India&rsquo;s Digital Personal Data Protection Act, 2023 you may ask us to show you the
          data we hold about you, correct it, erase it, or withdraw consent, and you may nominate someone
          to exercise these rights for you. Email{" "}
          <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> and we will respond within 30
          days. If we have not resolved a complaint, you may approach the Data Protection Board of India.
        </p>
      </Section>

      <Section title="Children">
        <p>{SITE.name} is for people aged 18 and over. We do not knowingly collect data from children.</p>
      </Section>

      <Section title="Changes">
        <p>
          If we change this policy in a way that matters, we will update the date at the top and, for
          significant changes, tell you by email or in the app.
        </p>
      </Section>
    </LegalPage>
  );
}
