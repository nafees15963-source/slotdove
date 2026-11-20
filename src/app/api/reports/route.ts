import { z } from 'zod';
import { body, failure, HttpError, json, requireBusiness, sameOrigin, softRateLimit } from '@/lib/http';
import { text } from '@/lib/sanitize';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ipHash } from '@/lib/trust';
import { logActivity } from '@/lib/activity';
import { notifyAdmins } from '@/lib/reports';

const schema = z.object({
  business_id: z.uuid(),
  customer_id: z.uuid().optional(),
  category: z.enum(['no_show', 'abuse', 'harassment', 'fraud', 'spam', 'illegal', 'privacy', 'copyright', 'security', 'other']),
  description: text(4000).pipe(z.string().min(10)),
  good_faith: z.literal(true),
  block: z.boolean().default(false),
});

/** A member of a business reports a customer (or anything else) to the platform team. */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const v = schema.parse(await body(request));
    const { user } = await requireBusiness(v.business_id, false);
    await softRateLimit(request, `report:${user.id}`, 10);
    const admin = supabaseAdmin();
    if (v.customer_id) {
      const { data: c } = await admin.from('customers').select('id').eq('business_id', v.business_id).eq('id', v.customer_id).maybeSingle();
      if (!c) throw new HttpError(404, 'NOT_FOUND');
      if (v.block) await admin.from('customers').update({ booking_blocked: true }).eq('id', v.customer_id).eq('business_id', v.business_id);
    }
    const { data, error } = await admin
      .from('abuse_reports')
      .insert({
        kind: v.customer_id ? 'customer' : 'other',
        category: v.category,
        business_id: v.business_id,
        customer_id: v.customer_id || null,
        description: v.description,
        reporter_kind: 'member',
        reporter_id: user.id,
        reporter_email: user.email || '',
        good_faith: true,
        ip_hash: ipHash(request),
      })
      .select('case_number')
      .single();
    if (error) throw error;
    void logActivity(request, { user_id: user.id, business_id: v.business_id, action: 'report.created', details: { case: data.case_number } });
    void notifyAdmins(data.case_number, v.category);
    return json({ case_number: data.case_number }, 201);
  } catch (e) {
    return failure(e);
  }
}
