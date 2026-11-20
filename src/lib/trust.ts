import 'server-only';
import { createHmac, randomInt } from 'node:crypto';
import { supabaseAdmin } from './supabase/admin';

/** Current version of AGB / Datenschutz / AVV. Bump when the texts change materially. */
export const LEGAL_VERSION = '2026-11-20';

/** Strong, readable one-time password (no ambiguous characters). */
export function generatePassword(length = 16) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!?#%+-='];
  const all = sets.join('');
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Pseudonymised client IP (HMAC, truncated) – never store raw IPs. */
export function ipHash(request: Request | null) {
  const secret = process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SECRET_KEY;
  const ip = request?.headers.get('x-real-ip') || request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!secret || !ip) return null;
  return createHmac('sha256', secret).update(ip).digest('hex').slice(0, 16);
}

/** True when an e-mail, its domain or the request IP is on the platform blocklist. Fails open on DB errors. */
export async function isBlocked({ email, request }: { email?: string | null; request?: Request | null }) {
  if (!process.env.SUPABASE_SECRET_KEY) return false;
  const values: { kind: string; value: string }[] = [];
  if (email) {
    const e = email.trim().toLowerCase();
    values.push({ kind: 'email', value: e });
    const domain = e.split('@')[1];
    if (domain) values.push({ kind: 'domain', value: domain });
  }
  const ip = ipHash(request || null);
  if (ip) values.push({ kind: 'ip', value: ip });
  if (!values.length) return false;
  try {
    const { data } = await supabaseAdmin()
      .from('blocklist')
      .select('kind,value,expires_at')
      .in('value', values.map((v) => v.value));
    const now = Date.now();
    return !!data?.some(
      (row) => values.some((v) => v.kind === row.kind && v.value === row.value) && (!row.expires_at || Date.parse(row.expires_at) > now),
    );
  } catch {
    return false;
  }
}

type Setting = { enabled?: boolean; message?: string };
/** Public platform switches set in the admin panel (maintenance, signups, public booking). */
export async function platformSetting(key: 'maintenance' | 'signups' | 'public_booking'): Promise<Setting> {
  const fallback = key === 'maintenance' ? { enabled: false, message: '' } : { enabled: true };
  if (!process.env.SUPABASE_SECRET_KEY) return fallback;
  try {
    const { data } = await supabaseAdmin().from('platform_settings').select('value').eq('key', key).maybeSingle();
    return (data?.value as Setting) || fallback;
  } catch {
    return fallback;
  }
}
