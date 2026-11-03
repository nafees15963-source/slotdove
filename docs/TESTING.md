# Testing

## Executed locally

- `npm run typecheck` — strict TypeScript.
- `npm run lint` — Next.js/TypeScript ESLint.
- `npm test` — availability, DST, timezone offsets, buffers, working periods, booking input, exports, disabled billing and email behavior.
- `npm run test:db` — applies the actual migrations to an isolated embedded PostgreSQL instance and tests RLS, concurrency, idempotency, roles, invitations, admin/demo workflows, customer erasure and Storage path policies.
- `npm run build` — optimized Next.js production build.
- `npm audit --omit=dev --audit-level=high` — production dependency advisory check.
- `npx playwright test --list` — browser suite discovery only, **not** browser execution.

The PostgreSQL test runner provides minimal `auth.users`, `auth.uid()`, Storage tables and Supabase roles. It verifies actual PostgreSQL behavior, including two simultaneous database connections racing to reserve a slot. It does not emulate Supabase Auth HTTP, PostgREST, Storage uploads, hosted extensions or Resend delivery.

## Browser suite

`tests/e2e/workflows.spec.ts` covers marketing language/navigation, protected admin access and the complete business setup → staff/service/hours → publication → guest booking → private-link cancellation flow. Both desktop and mobile projects are configured. Administrative demo creation has a separate optional privileged staging test.

No browser was installed or launched here: the managed Sites environment's supported `cua_repl.js` and preview infrastructure are unavailable. Do not mark these tests as passed based on `--list` output.

On an appropriate local/staging environment with Playwright browser support:

```sh
# Start or deploy a STAGING app first. No web server is implicitly launched.
export PLAYWRIGHT_BASE_URL=https://YOUR_STAGING_APP
export E2E_SUPABASE_URL=https://YOUR_STAGING_PROJECT.supabase.co
export E2E_SUPABASE_SECRET_KEY=YOUR_STAGING_SERVER_SECRET
export E2E_ALLOW_TEST_DATA=true
npm run test:e2e
```

Use a separate staging project, not production. Tests deliberately create and remove accounts and tenant data. They mark their business as a demo before booking so email notifications to `.invalid` addresses are suppressed. Optional admin tests require `E2E_PLATFORM_ADMIN_EMAIL` and `E2E_PLATFORM_ADMIN_PASSWORD` for an explicitly bootstrapped staging admin. Secrets must be provided through your local/CI secret store, not a committed file.

## Live release checks still required

1. Sign up, receive a real verification email, sign in, sign out, expire/refresh a session, recover a password.
2. Complete business setup, test refresh persistence and switch between two independent businesses.
3. Invite a staff member onto an existing staff profile; verify their own appointments and denied owner/admin actions.
4. Book from an anonymous mobile browser; race two customers for the same slot; reschedule to a conflicting slot and verify rollback.
5. Download the calendar invite into actual calendar clients and review dates around DST in the deployment timezone database.
6. Test a real PNG/JPEG/WebP upload and rejection of oversized/invalid files against Supabase Storage.
7. Configure Resend and a real verified recipient, trigger the worker, inspect provider acceptance/failure, and exercise retries. Do not send test notifications to fictional people.
8. Create/reset/extend/convert a demo; verify sample data removal, retained real configuration and tenant isolation in the hosted API.
9. Review keyboard focus, small screens, reduced motion, contrast and screen-reader labels in actual browsers.
10. Review database advisors, dependency advisories, deployment logs, backups and legal/operator configuration.
