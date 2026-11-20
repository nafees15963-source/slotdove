import { z } from 'zod';
import { bookingSchema } from '@/lib/validation';
import { body, failure, hashToken, HttpError, json, rateLimit, sameOrigin } from '@/lib/http';
import { isBlocked, platformSetting } from '@/lib/trust';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';
import { notifyOwner, sendSoon } from '@/lib/notifications';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const raw = await body(request),
      input = bookingSchema.parse(raw),
      token = z
        .string()
        .regex(/^[a-zA-Z0-9_-]{43}$/)
        .parse(raw.management_token);
    await rateLimit(request, `booking:${input.business_id}`, 8);
    if (!(await platformSetting('public_booking')).enabled) throw new HttpError(503, 'BOOKING_PAUSED');
    if (await isBlocked({ email: input.email, request })) throw new HttpError(403, 'BLOCKED');
    const { data: blocked } = await supabaseAdmin()
      .from('customers')
      .select('id')
      .eq('business_id', input.business_id)
      .eq('email', input.email.toLowerCase())
      .eq('booking_blocked', true)
      .maybeSingle();
    // Same answer as a taken slot would not be honest; a neutral message protects the business.
    if (blocked) throw new HttpError(403, 'BOOKING_NOT_ALLOWED');
    const { data, error } = await supabaseAdmin().rpc('reserve_booking', {
      p_business: input.business_id,
      p_service: input.service_id,
      p_staff: input.staff_id,
      p_start: input.starts_at,
      p_name: input.name,
      p_email: input.email,
      p_phone: input.phone,
      p_notes: input.notes,
      p_idempotency: input.idempotency_key,
      p_token_hash: hashToken(token),
    });
    if (error) throw error;
    const { data: number } = await supabaseAdmin().from('bookings').select('booking_number').eq('id', (data as { id: string }).id).single();
    void logActivity(request, {
      business_id: input.business_id,
      action: 'customer.booked',
      details: { booking_number: number?.booking_number, customer: input.name, starts_at: input.starts_at },
    });
    sendSoon(request);
    notifyOwner(request, input.business_id, number?.booking_number, input.name, input.starts_at);
    return json(
      {
        ...data,
        booking_number: number?.booking_number,
        management_url: `${new URL(request.url).origin}/manage#token=${token}`,
        email_status:
          process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? 'queued' : 'unavailable',
      },
      201,
    );
  } catch (e) {
    return failure(e);
  }
}
