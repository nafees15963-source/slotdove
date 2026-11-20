import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { emailConfigured } from '@/lib/email';
import { json } from '@/lib/http';
import { processQueue, registerAppUrl } from '@/lib/notifications';
import { purgeDue } from '@/lib/trash';
export const maxDuration = 60;
function same(a: string, b: string) {
  return Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
/** Called by the Supabase scheduler (pg_cron) every 2 minutes when emails are due,
 * or by Vercel Cron with CRON_SECRET. */
async function handle(request: Request) {
  const header = request.headers.get('authorization') || '';
  let allowed = !!process.env.CRON_SECRET && same(header, `Bearer ${process.env.CRON_SECRET}`);
  if (!allowed) {
    try {
      const { data } = await supabaseAdmin().rpc('get_app_setting', { p_key: 'cron_secret' });
      allowed = typeof data === 'string' && data.length >= 32 && same(header, `Bearer ${data}`);
    } catch {
      allowed = false;
    }
  }
  if (!allowed) return json({ error: 'FORBIDDEN' }, 403);
  await registerAppUrl(request);
  // Accounts whose 14-day trash period is over are deleted for good (incl. files).
  await purgeDue().catch(() => 0);
  if (!emailConfigured())
    return json({ status: 'unavailable', reason: 'Set RESEND_API_KEY and EMAIL_FROM (verified domain) in Vercel.' }, 503);
  try {
    return json(await processQueue(20));
  } catch {
    return json({ error: 'QUEUE_UNAVAILABLE' }, 503);
  }
}
export const GET = handle;
export const POST = handle;
