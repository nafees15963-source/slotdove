import { z } from 'zod';
import { body, failure, hashToken, HttpError, json, requireUser, sameOrigin, softRateLimit } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await softRateLimit(request, 'invite-accept', 10);
    const { user } = await requireUser();
    if (!user.email_confirmed_at || !user.email) throw new HttpError(403, 'VERIFY_EMAIL_FIRST');
    const { token } = z
      .object({ token: z.string().regex(/^[a-zA-Z0-9_-]{43}$/) })
      .parse(await body(request));
    const { data, error } = await supabaseAdmin().rpc('accept_invitation_server', {
      p_token_hash: hashToken(token),
      p_user: user.id,
      p_email: user.email,
    });
    if (error) throw error;
    return json({ business_id: data });
  } catch (e) {
    return failure(e);
  }
}
