# Slotdove

A Next.js scheduling application with a bilingual interface, Supabase persistence, tenant-aware authorization, transactional bookings, and a Resend notification queue.

**Current state:** the application is deployed by the owner on Vercel, and the schema has been applied to the connected Supabase project. See the [November 13 update](docs/UPDATE-2026-11-13.md) for dashboard performance, permanent deletion, the separate admin entrance and validation limits. Earlier delivery documents describe the initial handoff. General email delivery still requires a verified sender and notification scheduler.

## Run locally

Requires Node.js 24 and npm. Dependencies are pinned in `package-lock.json`.

```sh
npm ci
cp .env.example .env.local
# Fill in the environment values described below.
npm run dev
```

Do not overwrite an existing `.env.local`: the current workspace already has the supplied **public** Supabase configuration and the Resend credential in this ignored local file. The database password was not written into the repository. No credentials belong in a commit, screenshot, support log or ZIP.

Open `http://localhost:3000`. The marketing site renders without a database. Private workflows require the migrations and Supabase Auth. Guest booking, invitations, platform management and notifications additionally require a server secret key.

## Environment

| Variable                               | Purpose                                                                                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Project HTTPS URL, without a trailing semicolon.                                                                                                                                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public client key. Safe to expose only with the included grants and RLS.                                                                                                                                 |
| `SUPABASE_SECRET_KEY`                  | Supabase secret key or legacy service-role key. Server only. Required for guest booking, invitation acceptance, platform actions and notification processing. A database password is **not** an API key. |
| `NEXT_PUBLIC_SITE_URL`                 | Canonical deployment URL.                                                                                                                                                                                |
| `RESEND_API_KEY`                       | Server-only Resend credential.                                                                                                                                                                           |
| `EMAIL_FROM`                           | Sender on a verified Resend domain, e.g. `Slotdove <bookings@your-verified-domain.example>`. No sender was provided; left unset.                                                                         |
| `CRON_SECRET`                          | Random secret protecting the scheduled email endpoint.                                                                                                                                                   |
| `RATE_LIMIT_SECRET`                    | Random key used to hash rate-limit identifiers; falls back to the server Supabase key.                                                                                                                   |
| `BILLING_ENABLED`                      | `false`. No checkout, subscription charge, or fake payment success exists.                                                                                                                               |

Use a secret manager on your hosting provider. The public build receives only variables prefixed with `NEXT_PUBLIC_`. Generate fresh random cron/rate-limit secrets for each environment.

## Supabase setup

1. Connect an account with access to the intended Supabase project. This repository does not create a new paid project.
2. Inspect existing tables before applying migrations. The migrations create a new Slotdove schema; they are not a migration path from an unknown existing product.
3. Use the pinned CLI; inspect its current help before running deployment commands:

```sh
npx supabase login --help
npx supabase login
npx supabase link --help
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --help
npx supabase db push
```

Alternatively, run the five files in `supabase/migrations/` in filename order through the Supabase SQL editor after reviewing them. Do not apply them twice. No live migration has been run by this implementation session.

4. In Auth, enable email/password sign-in and email confirmation. Set Site URL and redirect allowlist to your deployment and `/auth/callback`, including the password-recovery callback. Configure a production SMTP sender; Supabase Auth email uses its own SMTP settings, separate from the app's Resend queue.
5. Configure the API URL, publishable key and server secret in hosting.
6. The storage migration creates a **public branding-only** `business-logos` bucket limited to PNG/JPEG/WebP and 2 MB. Upload mutations are tenant-scoped. Never put private documents there.
7. Run security/performance advisors and the staged smoke tests. Check that hosted PostgreSQL/tzdata is current, especially for zones whose rules changed in 2026.

## Business workflow

1. Register and confirm email; sign in.
2. Create the company, timezone, language, currency and booking slug.
3. Add a staff profile and a service; assign the service to the staff profile.
4. Add working-hour periods. Split a day into multiple periods to model breaks; add blocked time for holidays or absences.
5. Publish from **Booking page**. Publication is rejected if services, assignments and hours are missing.
6. Share `/b/your-slug`, or copy the HTML booking-link button.
7. Manage appointments, customer records, staff, hours, booking rules and exports in the dashboard.

Pending and confirmed appointments reserve exclusive staff capacity, including buffers. Completing or marking a no-show is allowed only after the appointment starts. Services and staff are archived, preserving history. Internal appointment creation and public requests use the same database validation.

## Platform administrator

There is no public administrator registration and no “first user becomes admin” behavior.

After verifying the intended administrator's identity in Supabase Auth, run a reviewed SQL statement in the Supabase SQL editor:

```sql
insert into private.platform_admins(user_id)
values ('EXACT_VERIFIED_AUTH_USER_UUID');
```

Then sign in at `/admin`. The server validates the session and the private admin table. You can create business/demo tenants, assign a plan, suspend/archive access, extend/reset demos, create owner invitation links and view an audit log. Creating a business initially assigns the administrator as its owner; accepting the verified owner invitation transfers ownership.

Invitations are private, seven-day, single-use links bound to the recipient's **verified** email. Share them explicitly with the intended recipient. A staff invitation can attach an existing staff profile so its schedule is preserved. The Team page lists invitations and connected roles and allows owners to revoke pending invitations or remove/change member access. Team invitation emails are sent only when a verified sender is configured; the UI reports acceptance, failure or unavailability and always offers the private link as a fallback. Demo invitations and platform-created owner invitations use manual private-link sharing.

Demo workspaces use `.invalid` fictional addresses. Their notification jobs are suppressed. Reset affects only the selected tenant's sample data. Conversion requires confirmation, removes fictional customers/bookings, preserves real configuration, and unpublishes the booking page for review.

## Resend and reminders

1. Verify your sender domain in Resend and configure its DNS records.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` on the server.
3. Set `CRON_SECRET` and configure an external scheduler to call `GET /api/cron/notifications` with `Authorization: Bearer <CRON_SECRET>` every five minutes.
4. The default Vercel configuration does not enable a scheduler, so deployment does not require a paid cron cadence. On a Vercel plan supporting five-minute schedules, add `"crons": [{ "path": "/api/cron/notifications", "schedule": "*/5 * * * *" }]` to `vercel.json`; Vercel sends the configured `CRON_SECRET` as the bearer token. Otherwise use the authenticated external scheduler described above. Queued emails and reminders require an active scheduler. No paid plan has been purchased or activated.
5. The worker claims jobs with `FOR UPDATE SKIP LOCKED`, leases and retry limits. Resend idempotency keys reduce duplicate delivery. “Accepted” means provider acceptance; delivery/bounce webhooks are **not** implemented.

Confirmation, cancellation, rescheduling and configurable 24-/2-hour reminders are queued. Missing email configuration never returns a fake success. No real email was sent during testing. Management links are shown to the booker and stored only as hashes, so they are not reconstructed into emails.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
```

`test:db` starts and destroys an isolated embedded PostgreSQL database on port 55439. It does not use the live project. It supplies minimal Auth/Storage tables to test the real migrations and SQL policies. See [testing](docs/TESTING.md) for browser/staging checks and their limitations.

## Deployment

Deploy as a standard Node-compatible Next.js App Router application. Vercel configuration is provided; a self-hosted Node server can run `npm run build && npm start`.

To deploy from GitHub on Vercel:

1. Choose **Add New → Project**, import `nafees15963-source/slotdove`, and select the `main` branch.
2. Keep the repository root as the root directory, select **Next.js**, and use **Node.js 24.x**. Keep the default install and build commands.
3. Add the variables in the Environment table to Vercel's project settings. Use your production HTTPS URL for `NEXT_PUBLIC_SITE_URL`; never upload `.env.local`. Set `BILLING_ENABLED=false`.
4. Apply all five migrations in `supabase/migrations` in filename order and configure Supabase Auth as described above. Guest booking requires `SUPABASE_SECRET_KEY`; email requires a verified `EMAIL_FROM` and the scheduler setup above.
5. Deploy. If the production URL changes, update `NEXT_PUBLIC_SITE_URL` and Supabase Auth redirects, then redeploy. Future pushes to `main` trigger Vercel deployments once the repository is connected.

Set environment variables, apply migrations, configure Auth redirects, and verify the guest-booking flow in staging before making a public launch. Route public traffic through a trusted proxy that **replaces** `x-real-ip`; the application also applies a business/scope-wide rate ceiling. Configure TLS and your custom domain in the hosting dashboard, then update the Auth allowlist.

The Sites skill was consulted, but its starter, source-sync helpers and preview scripts are absent from this execution environment. No Sites registration, hosting deployment, custom-domain change, or public launch has occurred.

## Architecture and limits

See [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), [testing](docs/TESTING.md), and [delivery status](docs/STATUS.md).

Marketing statistics are clearly labeled illustrative. Business data and analytics use PostgreSQL; no mock workspace or browser-local business store exists. The small SVG brand mark is a vector interpretation of the supplied logo reference; the original macOS image path was not accessible in this Linux workspace.

Proposed marketing prices are read from `public.plans` with a short cache, with clearly labeled setup defaults when the project is unavailable. A platform operator can edit `monthly_price_cents` and `currency` in that protected configuration table; ordinary authenticated users cannot write it. This does not activate billing.
