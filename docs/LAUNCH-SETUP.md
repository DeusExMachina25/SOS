# Launch setup: the parts only you can do

Everything below happens in other services' dashboards. The code is ready for each one and stays switched off until its settings exist. Do the steps in order; each takes 10 to 30 minutes unless it says otherwise.

Every "set X" below means: Vercel → your project → **Settings → Environment Variables**, add it for **Production** (and Preview if you test there), then redeploy. The full list is in `.env.example`.

## 1. Production database (Supabase)
The site runs only on preview links today, with no production database.

1. Create a Supabase project for SOS. Pick the **Mumbai** region so pages load fast in India.
2. Follow **Deploying → 1. Supabase** in the README: run `supabase/deploy/all_migrations.sql` once in the SQL editor, create the storage bucket, and make yourself an admin.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (Supabase → **Project Settings → API**).
4. The free plan pauses a project after a week without activity, which takes the site down. Move to the Pro plan before you take real bookings.

## 2. Domain (email needs it)
1. Buy a domain (for example on Vercel, Cloudflare or GoDaddy).
2. Vercel → project → **Settings → Domains** → add it and follow the DNS steps.
3. Set `NEXT_PUBLIC_SITE_URL=https://your-domain.com`.
4. Supabase → **Authentication → URL Configuration**: Site URL = your domain; add `https://your-domain.com/auth/accept` and `https://your-domain.com/**` to Redirect URLs.

## 3. Email: sign-in links, expert invites, booking confirmations and reminders
One Resend account covers all of them.

1. Sign up at resend.com (free plan: 3,000 emails a month, 100 a day).
2. **Domains → Add domain** → add the DNS records it shows (SPF, DKIM) at your domain provider. Wait for "Verified" (minutes to a few hours).
3. **API Keys → Create** (sending access).
4. **Booking emails:** set `RESEND_API_KEY` to that key and `EMAIL_FROM="SOS <bookings@your-domain.com>"`. Also set `NEXT_PUBLIC_CONTACT_EMAIL` (reply-to and the address shown on the site).
5. **Reminder emails:** set `CRON_SECRET` to a long random string, for example 40 random characters from a password manager. Vercel uses it to start the reminder job every morning around 8 am India time. After the next production deploy, Vercel → project → **Settings → Cron Jobs** lists `/api/cron/reminders`.
6. **Sign-in emails:** Supabase → **Authentication → Emails → SMTP Settings** → enable custom SMTP:
   - Host `smtp.resend.com`, port `465`, username `resend`, password = the same API key
   - Sender email `login@your-domain.com`, sender name `SOS`
7. **Email wording:** Supabase → **Authentication → Emails → Templates**. For **Magic Link**, **Confirm signup** and **Invite user**, paste the matching file from `supabase/templates/` into the message body, and copy the subject line from the comment at the top of that file.
8. Test: sign in as a client with an email link, and send an expert invite to yourself. Check spam the first time.

## 4. Phone sign-in (text message codes)
Clients can also sign in with a phone number. That needs an SMS provider:

1. Supabase → **Authentication → Providers → Phone** → enable it, pick a provider (Twilio, Twilio Verify, MessageBird, Vonage or TextLocal) and paste its keys.
2. Texts to Indian numbers fall under TRAI's DLT rules. Either register your business, a sender ID and the code message template on a DLT portal (often a few days), or choose a provider that handles DLT for you.
3. Until this is set up, phone sign-in shows an error and email sign-in still works. The form accepts Indian (+91) numbers only, so clients abroad should use email.

## 5. Razorpay live keys
Live mode needs business KYC. Have ready: PAN (personal for a proprietorship, or the entity's), a bank account in the business name (or yours for a proprietorship), GST number if registered, and the website live with Terms, Privacy and Refund pages (already built).

1. Razorpay dashboard → **Activate account** → submit KYC. Approval usually takes 2 to 7 working days.
2. Business type and description: describe SOS as "online paid consultations with independent design experts". Ask Razorpay whether collecting on behalf of experts needs **Route**; until it's approved you pay experts by hand from the admin console.
3. When activated, switch to **Live mode → Settings → API Keys → Generate**. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
4. **Settings → Webhooks → Add**: URL `https://your-domain.com/api/payments/razorpay/webhook`, events `payment.captured`, `order.paid`, `payment.failed`, and a secret you make up. Set the same secret as `RAZORPAY_WEBHOOK_SECRET`.
5. Test with a ₹1 to ₹10 booking, then refund it in Razorpay and record the refund in the admin console.

## 6. LiveKit (video calls)
1. Sign up at cloud.livekit.io (free tier is enough for launch) and create a project.
2. **Settings → Keys → Create key**. Set `NEXT_PUBLIC_LIVEKIT_URL` (the `wss://…livekit.cloud` address), `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.
3. Test: join a paid session from two devices.

## 7. Sentry (error tracking)
1. Sign up at sentry.io (free: 5,000 errors a month) → create a **Next.js** project.
2. Set `NEXT_PUBLIC_SENTRY_DSN` to the DSN it shows.
3. Optional, for readable error locations: **Settings → Auth Tokens → Create** (scope `project:releases`), then set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT`.
4. In Sentry → **Alerts**, turn on an email alert for new issues so you hear about problems.

## 8. Business details on the site
Set `NEXT_PUBLIC_LEGAL_NAME` (registered business name) and `NEXT_PUBLIC_LEGAL_ADDRESS`. They appear in the Terms and Privacy pages.

## 9. GitHub checks
Nothing to set up. Every pull request runs lint, typecheck, unit tests, database rule tests and a production build. To stop broken code reaching `main`: GitHub → repo → **Settings → Branches → Add rule** for `main` → tick "Require status checks to pass" and pick **CI / check**.

## 10. Expert profiles
For each expert:
1. Admin console → **Experts → Invite** (name and email).
2. They open the link, set a password, and fill in their profile: title, bio, rate, timezone, UPI ID and credentials.
3. You review and approve. Only approved experts appear on the site.
4. Photo: portrait crop about 1200 × 1500, JPG or WebP, under 300 KB. Put it in `public/experts/` and add it to `EXPERT_PHOTOS` in `src/app/platter/page.tsx` (see the README).

## 11. Final smoke test
Follow "Smoke test after deploy" in the README on the live domain, then the money section of `docs/QA-CHECKLIST.md`. Also check:
- Pay for a session with UPI as a client, confirm it as the expert, and check both inboxes get one confirmation each.
- Book a session for tomorrow and check both sides get a reminder the next morning.
