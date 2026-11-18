import { z } from 'zod';
import { body, failure, hashToken, json, rateLimit, sameOrigin } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';
import { sendSoon } from '@/lib/notifications';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { token, action, starts_at } = z
      .object({
        token: z.string().regex(/^[a-zA-Z0-9_-]{43}$/),
        action: z.enum(['view', 'cancel', 'reschedule']),
        starts_at: z.iso.datetime({ offset: true }).optional(),
      })
      .parse(await body(request));
    await rateLimit(request, 'manage', 30);
    const { data, error } = await supabaseAdmin().rpc('manage_booking', {
      p_hash: hashToken(token),
      p_action: action,
      p_start: starts_at || null,
    });
    if (error) throw error;
    const result = data as { id: string; business_id: string };
    const { data: number } = await supabaseAdmin().from('bookings').select('booking_number,customer_name').eq('id', result.id).single();
    if (action !== 'view') sendSoon(request);
    if (action !== 'view')
      void logActivity(request, {
        business_id: result.business_id,
        action: action === 'cancel' ? 'customer.cancelled' : 'customer.rescheduled',
        details: { booking_number: number?.booking_number, customer: number?.customer_name, starts_at },
      });
    return json({ ...result, booking_number: number?.booking_number });
  } catch (e) {
    return failure(e);
  }
}
