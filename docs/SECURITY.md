# Security notes

## Implemented controls

- Server session validation calls Supabase `getUser`, never trusts a raw cookie session object as authorization.
- Protected API mutations require a verified email. Database onboarding and role helpers independently require verified Auth users.
- Tenant ownership is determined by `auth.uid()` plus trusted database membership. User-editable JWT metadata is never used for authorization.
- RLS, explicit grants and cross-tenant composite foreign keys protect exposed tables. UPDATE policies have both USING and WITH CHECK.
- Sensitive public operations use service-only validated RPCs. Anonymous visitors cannot enumerate bookings or customers or execute administration RPCs.
- Administrator privileges are bootstrapped only with a deliberate private-table SQL insert after identity verification.
- Invitation and booking-management tokens contain 256 bits of randomness and are stored as SHA-256 hashes. Links put the token in a fragment, not an HTTP URL query. Invitations require a matching verified email, expiry and unused/revoked checks.
- Same-origin checks protect cookie-authenticated mutations. JSON bodies are bounded; public booking input is validated with Zod. Errors returned to users omit raw SQL, provider payloads and secrets.
- Public booking and availability use persistent, atomically incremented limits on hashed IP/scope identifiers. Deploy behind a proxy that overwrites `x-real-ip`; a separate scope-wide ceiling also applies.
- React escapes UI text. Email templates escape untrusted HTML. CSV exports neutralize formula prefixes. Calendar exports escape reserved characters and fold UTF-8 lines.
- Public branding uploads check size, declared MIME and file signatures for PNG/JPEG/WebP. SVG uploads are rejected. Storage policies restrict mutations to the caller's tenant path. Branding is intentionally public.
- Demo email jobs are suppressed. Booking receipts distinguish queued, unavailable and provider acceptance. No test sent a live email.
- Customer anonymization requires tenant-management permission and explicit confirmation. It removes personal fields, revokes private management tokens and suppresses queued notification jobs. It preserves service/timing history and logs the action.
- Secrets are excluded by `.gitignore`; the delivered archive excludes `.env.local`, builds and installed dependencies.

## Necessary operational work

1. Apply and review migrations in a staging project, then run Supabase advisors. Local PostgreSQL tests are not a replacement for hosted service integration tests.
2. Configure Supabase Auth SMTP, verification, redirect allowlists, password policies, rate limits, MFA for administrators, and suitable token/session settings.
3. Configure a trusted reverse proxy, TLS and production secret management. Rotating a secret requires a redeploy where applicable.
4. Configure a verified Resend domain, monitor queue failure counts, and alert when retry limits are exhausted. Resend acceptance is not proof of inbox delivery; delivery/bounce webhooks remain future work.
5. Define backup/restore, retention, audit access and incident-response policies. Automatic retention deletion is not enabled. The operator must decide legal retention periods before scheduling irreversible automated deletion.
6. Add a CAPTCHA or equivalent proof-of-human control if real traffic requires it. The current durable rate limits and honeypot are the initial abuse controls, not a claim of universal bot protection.
7. Complete privacy, terms and legal notice with actual operator information. Code alone does not establish GDPR compliance.
8. Keep PostgreSQL/tzdata and dependencies updated. The Supabase October 2026 changelog notes timezone corrections for Vancouver, Edmonton and Casablanca; review the hosted version before using those zones.

## Known limits

No independent penetration test, real browser accessibility audit, load test, email-delivery test or hosted tenant-isolation test was executed here. Data exports are paged internally and reject requests above 5,000 records rather than silently truncating; calendar queries to 500 per displayed month; large-scale operational use needs export jobs and additional pagination. The UI identifies bounded views rather than inventing counts.

An email already accepted by a provider cannot be recalled by deleting a customer. Demo conversion removes sample rows; real user-created records are preserved. Archived services and staff keep existing appointment history.
