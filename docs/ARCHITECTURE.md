# Architecture

## Request paths

- **Public marketing:** Next.js server-rendered pages, local Inter font, responsive CSS tokens, light/dark mode, English/German content and explicit legal drafts. Product-preview numbers are labeled illustrative, not customer claims.
- **Authenticated business operations:** browser → same-origin Next.js route → verified Supabase user → tenant-scoped RLS. No client-supplied role or tenant ID is trusted as authorization.
- **Public booking:** browser → validated/rate-limited Next.js route → server-only Supabase client → transactional RPC. The service key never enters a client bundle.
- **Platform administration:** verified user → `private.platform_admins` lookup → specific server RPCs → audit log. Public registration cannot assign platform privileges.
- **Notifications:** booking trigger → durable PostgreSQL job → scheduled authenticated worker → Resend. The process does not depend on an open browser.

## Schema

`businesses` owns services, staff, members, invitations, customers, availability, blocks, appointments, notifications and entitlements. Composite foreign keys prevent attaching a record from another tenant. Public API grants are explicit; application tables have RLS.

Privileged tables (`platform_admins`, hashed booking/invitation tokens, rate-limit counters and billing events) are in `private`, which is not an exposed PostgREST schema. Small privileged helper functions have fixed empty search paths and explicit user/tenant checks. Service-only RPCs revoke anonymous and authenticated execution.

A booking stores service name, customer display name, price, appointment instants and occupied instants. Historical service information survives archival and edits. Customer erasure deliberately anonymizes customer and booking personal fields while retaining the appointment ledger.

## Scheduling invariants

- Appointments are `timestamptz` instants. Each business retains an IANA timezone.
- Availability iterates actual UTC instants and projects them into business wall time; DST gaps cannot appear, and repeated wall-time choices are deduplicated.
- Duration, preparation, cleanup, notice period, booking horizon, interval, assignments, hours, breaks and blocks are checked again in a PostgreSQL trigger.
- `bookings_no_overlap` is a GiST exclusion constraint on staff and occupied ranges. Pending and confirmed appointments reserve capacity. Completed and no-show records retain their historical occupied range; cancellation releases it.
- A staff-row lock serializes schedule/block changes with reservation checks. The exclusion constraint remains the ultimate invariant for concurrent reservations.
- Booking request UUIDs enforce idempotency; a replay must also present its matching management-token hash and slot parameters.
- Rescheduling updates the same booking transactionally; failed moves leave the existing booking intact.
- Public “any staff” selection is deterministic by staff UUID and does not expose private appointment details.

## Access model

| Actor                  | Scope                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous visitor      | Published booking catalog and availability through server routes; no direct private table enumeration.                            |
| Verified owner         | Full management of their active, non-expired tenant; team role management and invitations.                                        |
| Business administrator | Operational management in that tenant; cannot grant memberships or become an owner.                                               |
| Staff                  | Own assigned appointments, service/staff/hour references; cannot enumerate the customer directory, edit settings or assign roles. |
| Platform administrator | Audited platform access operations through protected endpoints. Tenant customer data is not included in the admin overview.       |
| Service worker         | Narrow server workflows using a server-only secret.                                                                               |

## UI structure

`src/components/dashboard/` separates shell, overview, calendar, entity forms, team access and settings. Radix dialogs provide focus management; the UI uses reusable buttons, empty states, validation feedback and responsive navigation. Animation respects `prefers-reduced-motion`.

`src/lib/i18n/` holds shared interface, marketing and informational content. Brand imagery is branding-only; no stock customer photos, fabricated testimonials or invented legal operator details are included.

## Billing separation

Plans and entitlements exist independently of payment subscriptions. Every current plan can schedule without Stripe. `billingProvider` is an explicitly disabled interface; it cannot return a fake checkout or accept a payment redirect as a verified webhook. Pricing defaults live in code and SQL as proposed launch values, not active charges.
