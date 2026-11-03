import { z } from 'zod';
import { bookingSchema } from '@/lib/validation';
import { body, failure, hashToken, json, rateLimit, sameOrigin } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
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
    return json(
      {
        ...data,
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
