# Launch setup: the parts only you can do

Everything below happens in other services' dashboards. The code is ready for each one and stays switched off until its settings exist. Do the steps in order; each takes 10 to 30 minutes unless it says otherwise.

Every "set X" below means: Vercel → your project → **Settings → Environment Variables**, add it for **Production** (and Preview if you test there), then redeploy. The full list is in `.env.example`.

## 1. Domain (do this first; email needs it)
1. Buy a domain (for example on Vercel, Cloudflare or GoDaddy).
2. Vercel → project → **Settings → Domains** → add it and follow the DNS steps.
3. Set `NEXT_PUBLIC_SITE_URL=https://your-domain.com`.
4. Supabase → **Authentication → URL Configuration**: Site URL = your domain; add `https://your-domain.com/auth/accept` and `https://your-domain.com/**` to Redirect URLs.

## 2. Email: sign-in links, expert invites and booking confirmations
One Resend account covers all three.

1. Sign up at resend.com (free: 3,000 emails a month, 100 a day).
2. **Domains → Add domain** → add the DNS records it shows (SPF, DKIM) at your domain provider. Wait for "Verified" (minutes to a few hours).
3. **API Keys → Create** (sending access).
4. **Booking emails:** set `RESEND_API_KEY` to that key and `EMAIL_FROM="SOS <bookings@your-domain.com>"`. Also set `NEXT_PUBLIC_CONTACT_EMAIL` (reply-to and the address shown on the site).
5. **Sign-in emails:** Supabase → **Authentication → Emails → SMTP Settings** → enable custom SMTP:
   - Host `smtp.resend.com`, port `465`, username `resend`, password = the same API key
   - Sender email `login@your-domain.com`, sender name `SOS`
6. Optional: in Supabase → **Authentication → Emails → Templates**, reword the Magic Link and Invite emails so they say SOS.
7. Test: sign in as a client with an email link, and send an expert invite to yourself. Check spam the first time.

## 3. Razorpay live keys
Live mode needs business KYC. Have ready: PAN (personal for a proprietorship, or the entity's), a bank account in the business name (or yours for a proprietorship), GST number if registered, and the website live with Terms, Privacy and Refund pages (already built).

1. Razorpay dashboard → **Activate account** → submit KYC. Approval usually takes 2 to 7 working days.
2. Business type and description: describe SOS as "online paid consultations with independent design experts". Ask Razorpay whether collecting on behalf of experts needs **Route**; until it's approved you pay experts by hand from the admin console.
3. When activated, switch to **Live mode → Settings → API Keys → Generate**. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
4. **Settings → Webhooks → Add**: URL `https://your-domain.com/api/payments/razorpay/webhook`, events `payment.captured`, `order.paid`, `payment.failed`, and a secret you make up. Set the same secret as `RAZORPAY_WEBHOOK_SECRET`.
5. Test with a ₹1 to ₹10 booking, then refund it in Razorpay and record the refund in the admin console.

## 4. LiveKit (video calls)
1. Sign up at cloud.livekit.io (free tier is enough for launch) and create a project.
2. **Settings → Keys → Create key**. Set `NEXT_PUBLIC_LIVEKIT_URL` (the `wss://…livekit.cloud` address), `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.
3. Test: join a paid session from two devices.

## 5. Sentry (error tracking)
1. Sign up at sentry.io (free: 5,000 errors a month) → create a **Next.js** project.
2. Set `NEXT_PUBLIC_SENTRY_DSN` to the DSN it shows.
3. Optional, for readable error locations: **Settings → Auth Tokens → Create** (scope `project:releases`), then set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT`.
4. In Sentry → **Alerts**, turn on an email alert for new issues so you hear about problems.

## 6. Business details on the site
Set `NEXT_PUBLIC_LEGAL_NAME` (registered business name) and `NEXT_PUBLIC_LEGAL_ADDRESS`. They appear in the Terms and Privacy pages.

## 7. GitHub checks
Nothing to set up. Every pull request now runs lint, typecheck, unit tests, database rule tests and a production build. To stop broken code reaching `main`: GitHub → repo → **Settings → Branches → Add rule** for `main` → tick "Require status checks to pass" and pick **CI / check**.

## 8. Expert profiles
For each expert:
1. Admin console → **Experts → Invite** (name and email).
2. They open the link, set a password, and fill in their profile: title, bio, rate, timezone, UPI ID and credentials.
3. You review and approve. Only approved experts appear on the site.
4. Photo: portrait crop about 1200 × 1500, JPG or WebP, under 300 KB. Put it in `public/experts/` and add it to `EXPERT_PHOTOS` in `src/app/platter/page.tsx` (see the README).

## 9. Final smoke test
Follow "Smoke test after deploy" in the README on the live domain, then the money section of `docs/QA-CHECKLIST.md`.
