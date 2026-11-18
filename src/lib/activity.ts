import 'server-only';
import { createHmac } from 'node:crypto';
import { supabaseAdmin } from './supabase/admin';
/** Best-effort audit trail for platform administrators. Never blocks a request. */
export async function logActivity(
  request: Request | null,
  entry: { user_id?: string | null; business_id?: string | null; action: string; details?: Record<string, unknown> },
) {
  if (!process.env.SUPABASE_SECRET_KEY) return;
  try {
    const secret = process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SECRET_KEY;
    const ip = request?.headers.get('x-real-ip') || request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    await supabaseAdmin()
      .from('activity_log')
      .insert({
        user_id: entry.user_id || null,
        business_id: entry.business_id || null,
        action: entry.action.slice(0, 80),
        details: entry.details || {},
        ip_hash: ip ? createHmac('sha256', secret).update(ip).digest('hex').slice(0, 16) : null,
        user_agent: request?.headers.get('user-agent')?.slice(0, 300) || null,
      });
  } catch {
    /* Logging must not break the user's action. */
  }
}
