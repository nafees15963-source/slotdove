import { z } from 'zod';
import { body, failure, hashToken, json, rateLimit, sameOrigin } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
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
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
