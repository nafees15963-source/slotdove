import { z } from 'zod';
import { body, failure, HttpError, json, rateLimit, requireBusiness, sameOrigin } from '@/lib/http';
import { aiConfigured } from '@/lib/groq';
import { think, type BrainData } from '@/lib/ai/brain';
import { logActivity } from '@/lib/activity';
export const maxDuration = 60;
/** Server-side assistant (Groq). Data is read with the signed-in user's own
 * permissions, so staff only see what they may see. Falls back to the local
 * assistant in the browser when unavailable. */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = z
      .object({
        business: z.uuid(),
        locale: z.enum(['de', 'en']).default('de'),
        messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) })).min(1).max(20),
      })
      .parse(await body(request));
    if (!aiConfigured()) return json({ fallback: true, reason: 'not_configured' });
    const { db, user, role } = await requireBusiness(input.business, false);
    try {
      await rateLimit(request, `ai:${input.business}`, 60);
    } catch (e) {
      if (e instanceof HttpError && e.status === 429) throw e;
      // Without the server key the shared limiter is unavailable; the model provider still limits.
    }
    const lo = new Date(Date.now() - 130 * 86400000).toISOString(),
      hi = new Date(Date.now() + 130 * 86400000).toISOString();
    const [business, services, staff, availability, blocks, assignments, bookings, customers, flags, overrides] = await Promise.all([
      db.from('businesses').select('*').eq('id', input.business).single(),
      db.from('services').select('*').eq('business_id', input.business).order('sort_order'),
      db.from('staff_profiles').select('*').eq('business_id', input.business),
      db.from('availability_rules').select('*').eq('business_id', input.business),
      db.from('blocked_times').select('*').eq('business_id', input.business).gte('ends_at', lo).limit(500),
      db.from('service_staff').select('service_id,staff_id').eq('business_id', input.business),
      db
        .from('bookings')
        .select('id,booking_number,business_id,staff_id,service_id,customer_id,starts_at,ends_at,status,service_name,customer_name,price_cents,notes,internal_notes,created_at,is_sample')
        .eq('business_id', input.business)
        .gte('starts_at', lo)
        .lt('starts_at', hi)
        .order('starts_at')
        .limit(3000),
      db.from('customers').select('id,name,created_at').eq('business_id', input.business).limit(3000),
      db.from('feature_flags').select('key,stage').eq('key', 'assistant'),
      db.from('business_features').select('flag_key,enabled').eq('business_id', input.business).eq('flag_key', 'assistant'),
    ]);
    if (business.error || !business.data) throw new HttpError(403, 'FORBIDDEN');
    const enabled = overrides.data?.[0]?.enabled ?? (flags.data?.[0]?.stage ?? 'all') === 'all';
    if (!enabled) return json({ fallback: true, reason: 'disabled' });
    const data: BrainData = {
      business: business.data,
      services: services.data || [],
      staff: staff.data || [],
      availability: availability.data || [],
      blocks: blocks.data || [],
      assignments: assignments.data || [],
      bookings: bookings.data || [],
      customers: customers.data || [],
      role,
    };
    const question = input.messages.at(-1)?.content || '';
    void logActivity(request, { user_id: user.id, business_id: input.business, action: 'ai.ask', details: { question: question.slice(0, 200) } });
    try {
      const result = await think(data, input.messages, input.locale);
      return json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // Visible to platform admins in the activity log for diagnosis.
      void logActivity(request, { user_id: user.id, business_id: input.business, action: 'ai.error', details: { error: message.slice(0, 300) } });
      const code = /AI_UNAVAILABLE:(\d+)/.exec(message)?.[1] || (/abort|timeout/i.test(message) ? 'timeout' : 'error');
      return json({ fallback: true, reason: 'unavailable', code });
    }
  } catch (e) {
    return failure(e);
  }
}
