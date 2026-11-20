import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { supabaseServer } from './supabase/server';
import { supabaseAdmin } from './supabase/admin';
import { hasSignedTerms } from './trust';
import { createHmac, randomBytes, createHash } from 'node:crypto';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export function failure(error: unknown) {
  if (error instanceof ZodError)
    return json(
      {
        error: 'INVALID_INPUT',
        details: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
      400,
    );
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  const e = error as { code?: string; message?: string };
  const known = [
    'SLOT_UNAVAILABLE',
    'OUTSIDE_WORKING_HOURS',
    'OUTSIDE_BOOKING_WINDOW',
    'INVALID_SLOT',
    'INVALID_STAFF',
    'BOOKING_UNAVAILABLE',
    'COMPLETE_SETUP_FIRST',
    'INVALID_TRANSITION',
    'APPOINTMENT_NOT_STARTED',
    'EXISTING_BOOKING_CONFLICT',
    'CHANGE_DEADLINE_PASSED',
    'LINK_EXPIRED',
    'INVITATION_INVALID',
    'IDEMPOTENCY_MISMATCH',
  ];
  if (e.code === '23P01') return json({ error: 'SLOT_UNAVAILABLE' }, 409);
  if (e.code === '23505') return json({ error: 'ALREADY_EXISTS' }, 409);
  if (e.code === '23503') return json({ error: 'RECORD_IN_USE' }, 409);
  if (e.code === '42501' || e.message === 'FORBIDDEN') return json({ error: 'FORBIDDEN' }, 403);
  if (known.includes(e.message ?? '')) return json({ error: e.message }, 409);
  if (e.message === 'BOOKING_NOT_CONFIGURED' || e.message === 'SUPABASE_NOT_CONFIGURED')
    return json({ error: e.message }, 503);
  return json({ error: 'REQUEST_FAILED' }, 500);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) throw new HttpError(403, 'INVALID_ORIGIN');
}
export async function body(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > 32768)
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
  const text = await request.text();
  if (text.length > 32768) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'INVALID_JSON');
  }
}
export async function requireUser() {
  const db = await supabaseServer();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new HttpError(401, 'SIGN_IN_REQUIRED');
  if (!user.email_confirmed_at) throw new HttpError(403, 'VERIFY_EMAIL_FIRST');
  return { db, user };
}
export async function requireBusiness(id: string, manager = true) {
  const { db, user } = await requireUser();
  const { data: role, error } = await db.rpc('my_business_role', { bid: id });
  if (error || !role || (manager && !['owner', 'admin'].includes(role)))
    throw new HttpError(403, 'FORBIDDEN');
  const { data: isPlatformAdmin } = await db.rpc('my_platform_role');
  if (isPlatformAdmin) {
    // Admin accounts act on a business only inside an active support session.
    const { data: supported } = await db.rpc('my_support_business');
    if (supported !== id) throw new HttpError(403, 'ADMIN_USE_SUPPORT_MODE');
  } else if (!(await hasSignedTerms(user.id))) throw new HttpError(403, 'TERMS_REQUIRED');
  return { db, user, role: role as 'owner' | 'admin' | 'staff' };
}
/** Admins must confirm a second factor (TOTP) unless ADMIN_MFA=off is set as an emergency switch. */
export const adminMfaRequired = () => process.env.ADMIN_MFA !== 'off';
export async function adminAssurance(db: Awaited<ReturnType<typeof supabaseServer>>) {
  const { data } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  return { current: data?.currentLevel || 'aal1', enrolled: data?.nextLevel === 'aal2' };
}
export async function requireAdmin() {
  const { db, user } = await requireUser();
  const { data, error } = await db.rpc('my_platform_role');
  if (error || !data) throw new HttpError(403, 'FORBIDDEN');
  if (adminMfaRequired() && (await adminAssurance(db)).current !== 'aal2') throw new HttpError(403, 'MFA_REQUIRED');
  return { db, user };
}
export function newToken() {
  return randomBytes(32).toString('base64url');
}
export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
export async function rateLimit(request: Request, scope: string, limit = 20) {
  const secret = process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new HttpError(503, 'BOOKING_NOT_CONFIGURED');
  // Deploy behind a proxy that replaces x-real-ip; never trust client forwarded lists.
  // A separate scope-wide ceiling still applies if an upstream IP header is unavailable.
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const db = supabaseAdmin();
  for (const [key, max] of [
    [`${scope}:${ip}`, limit],
    [scope, 200],
  ] as const) {
    const { data, error } = await db.rpc('consume_rate_limit', {
      p_key: createHmac('sha256', secret).update(key).digest('hex'),
      p_limit: max,
      p_window: 900,
    });
    if (error) throw error;
    if (!data) throw new HttpError(429, 'RATE_LIMITED');
  }
}

/** Rate limit that never blocks the action when the limiter itself is unavailable
 * (e.g. missing server key in local development), but always enforces 429. */
export async function softRateLimit(request: Request, scope: string, limit: number) {
  try {
    await rateLimit(request, scope, limit);
  } catch (e) {
    if (e instanceof HttpError && e.status === 429) throw e;
  }
}
