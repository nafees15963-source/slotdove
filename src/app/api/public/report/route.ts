import { z } from 'zod';
import { body, failure, HttpError, json, rateLimit, sameOrigin } from '@/lib/http';
import { email, line, text } from '@/lib/sanitize';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ipHash, isBlocked } from '@/lib/trust';
import { notifyAdmins } from '@/lib/reports';
import { noticeEmail, sendEmail } from '@/lib/email';

/** Public notice-and-action form (Art. 16 DSA): anyone can report illegal content or abuse. */
const schema = z.object({
  category: z.enum(['abuse', 'harassment', 'fraud', 'spam', 'illegal', 'privacy', 'copyright', 'security', 'other']),
  target_url: z.string().max(500).default(''),
  description: text(4000).pipe(z.string().min(20)),
  name: z.union([line(2, 120), z.literal('')]).default(''),
  email: z.union([email(), z.literal('')]).default(''),
  good_faith: z.literal(true),
  website: z.string().max(0).optional(), // honeypot
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const v = schema.parse(await body(request));
    if (v.target_url && !/^https?:\/\//i.test(v.target_url)) throw new HttpError(400, 'INVALID_INPUT');
    await rateLimit(request, 'public-report', 5);
    if (await isBlocked({ email: v.email || null, request })) throw new HttpError(403, 'BLOCKED');
    const { data, error } = await supabaseAdmin()
      .from('abuse_reports')
      .insert({
        kind: 'content',
        category: v.category,
        target_url: v.target_url,
        description: v.description,
        reporter_kind: 'public',
        reporter_name: v.name,
        reporter_email: v.email,
        good_faith: true,
        ip_hash: ipHash(request),
      })
      .select('case_number')
      .single();
    if (error) throw error;
    void notifyAdmins(data.case_number, v.category);
    // Art. 16(4) DSA: confirm receipt without undue delay when contact details were given.
    if (v.email)
      void sendEmail({
        ...noticeEmail({
          locale: 'de',
          title: `Eingangsbestätigung Ihrer Meldung ${data.case_number}`,
          lines: [
            'Guten Tag,',
            `wir haben Ihre Meldung unter der Fallnummer ${data.case_number} erhalten und prüfen sie sorgfältig, zeitnah und objektiv.`,
            'Über unsere Entscheidung und die Gründe informieren wir Sie an diese Adresse.',
          ],
        }),
        to: v.email,
        idempotencyKey: `report-${data.case_number}`,
      }).catch(() => {});
    return json({ case_number: data.case_number }, 201);
  } catch (e) {
    return failure(e);
  }
}
