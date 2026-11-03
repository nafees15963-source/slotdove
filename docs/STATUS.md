# Delivery status

This is implemented application source, not a claim that the full SaaS is live or production-certified.

## Implemented

- Next.js App Router, strict TypeScript, pinned dependencies, lockfile, local Inter font and reusable UI primitives.
- Bilingual marketing, industry pages, legal-page drafts, responsive dashboard, light/dark mode and reduced-motion support.
- Supabase registration/login/logout, confirmation callback, password recovery/change, account profile and protected workspaces.
- Company onboarding, tenant memberships, roles, invitations, existing-staff linking, invitation revocation and member access management.
- Service CRUD/archival, staff management, assignments, multiple daily working periods, time-off blocks and booking settings.
- Calendar month/week/day/list views, staff/service/status filters, internal bookings, cancellation, rescheduling, completion and no-show states.
- Public service/staff/date/slot/details/review booking flow with server-side validation, DB exclusion constraints, idempotency and private management links.
- Customer management, CSV/individual JSON export, protected notes and audited personal-data anonymization.
- Supabase Storage branding upload with tenant policies, size/type validation and public booking-page display.
- SQL-based metrics, date-range reporting, popular services and clearly bounded activity visualization.
- Durable appointment notification queue, leases, retries, provider idempotency, EN/DE templates and configurable 24-/2-hour reminders.
- Protected platform admin, manual access plans, audit log, tenant creation/suspension, isolated demos, reset/extension/conversion.
- Billing tables and a disabled provider interface. No Stripe requirement or active checkout.
- Calendar `.ics` export and an HTML booking-link button for other websites.
- Local unit/database checks, production build, CI workflow and staging browser test sources.

## Live configuration still missing or blocked

- **Supabase project access:** both connected accounts denied access to the supplied project. No remote schema inspection, migration, hosted SQL verification or advisor run succeeded.
- **Server API key:** a publishable key and database password were supplied, but neither is a Supabase server secret API key. Guest-booking/admin/invitation server workflows require `SUPABASE_SECRET_KEY`.
- **Email sender:** the Resend credential is stored only in ignored local environment configuration. A verified `EMAIL_FROM`, Auth SMTP configuration and active scheduler are still required. No live email was sent.
- **Hosting:** no deployment was made. The selected managed environment lacks the Sites source/publishing helpers and supported browser-preview entry point. Standard Next.js deployment configuration is included.
- **Operator information:** legal identity, postal address, privacy contact, retention decisions and contractual text must be supplied/reviewed before public launch.

## Verification

The final execution results are recorded in `docs/VERIFICATION.txt`. Browser tests were discovered but not executed. Hosted Supabase/Auth/Storage/Resend behavior remains unverified.

## Deliberately not presented as working

- Google/Outlook two-way OAuth calendar sync.
- Stripe checkout, paid subscriptions or verified billing webhooks.
- Group/class capacity scheduling, recurring appointment series, waitlists or drag-and-drop calendar moves.
- Delivery/bounce email webhooks and guaranteed inbox delivery.
- Automatic irreversible retention deletion and background exports for large datasets.
- Cross-origin iframe embedding; a safe link/button embed is supplied instead.
- A complete independent accessibility, penetration, legal or production-operations certification.

The supplied macOS logo path was unavailable; the application uses a vector interpretation of the visible S-logo reference. Replace `public/icon.svg`, `src/app/icon.svg` and the Brand component with the original asset when it is available in the project.
