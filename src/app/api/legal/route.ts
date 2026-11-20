import { z } from 'zod';
import { body, failure, json, requireUser, sameOrigin, softRateLimit } from '@/lib/http';
import { line } from '@/lib/sanitize';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ipHash, LEGAL_VERSION } from '@/lib/trust';
import { logActivity } from '@/lib/activity';

/** Electronic signature of terms, privacy notice and data processing agreement (typed full name). */
const schema = z.object({
  name: line(3, 120).refine((n) => /\s/.test(n) && /\p{L}/u.test(n), { message: 'FULL_NAME_REQUIRED' }),
  terms: z.literal(true),
  liability: z.literal(true),
  privacy: z.literal(true),
  dpa: z.literal(true),
  free: z.literal(true),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { user } = await requireUser();
    await softRateLimit(request, `legal:${user.id}`, 10);
    const v = schema.parse(await body(request));
    const row = {
      user_id: user.id,
      version: LEGAL_VERSION,
      method: 'signature',
      signer_name: v.name,
      ip_hash: ipHash(request),
      user_agent: (request.headers.get('user-agent') || '').slice(0, 300),
    };
    const { error } = await supabaseAdmin()
      .from('legal_acceptances')
      .insert((['terms', 'privacy', 'dpa'] as const).map((document) => ({ ...row, document })));
    if (error) throw error;
    void logActivity(request, { user_id: user.id, action: 'legal.signed', details: { version: LEGAL_VERSION } });
    return json({ ok: true, version: LEGAL_VERSION }, 201);
  } catch (e) {
    return failure(e);
  }
}
