import { z } from 'zod';
import { createHmac } from 'node:crypto';
import { after } from 'next/server';
import { body, failure, HttpError, json, rateLimit, sameOrigin } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { email, line, phone, text } from '@/lib/sanitize';
import { emailConfigured, noticeEmail, sendEmail } from '@/lib/email';
import { logActivity } from '@/lib/activity';
import { industryIds } from '@/lib/industries';
const schema = z.object({
  company: line(2, 120),
  contact_name: line(2, 100),
  email: email(),
  phone: phone().default(''),
  industry: z.enum(industryIds as [string, ...string[]]).default('other'),
  city: line(0, 80).default(''),
  team_size: z.enum(['', '1', '2-5', '6-15', '16+']).default(''),
  plan_interest: z.enum(['free', 'pro', 'business', 'unsure']).default('unsure'),
  interest: z.enum(['demo', 'subscription', 'info']).default('demo'),
  message: text(1000).default(''),
  consent: z.literal(true),
  locale: z.enum(['de', 'en']).default('de'),
  source: line(0, 120).default(''),
  // Bot protection: a hidden field must stay empty and humans need a few seconds.
  website: z.string().max(0).optional(),
  started_at: z.number().int().positive(),
});
const consentText = {
  de: 'Ich bin einverstanden, dass Slotdove mich per E-Mail oder Telefon zur Testphase, zum Start und zu Angeboten kontaktiert. Widerruf jederzeit möglich.',
  en: 'I agree that Slotdove may contact me by email or phone about the test phase, the launch and offers. I can withdraw at any time.',
};
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const raw = await body(request);
    if (typeof raw?.website === 'string' && raw.website.length) return json({ ok: true }); // silently drop bots
    const input = schema.parse(raw);
    if (Date.now() - input.started_at < 2500) throw new HttpError(400, 'TOO_FAST');
    await rateLimit(request, 'waitlist', 5);
    const secret = process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SECRET_KEY || '';
    const ip = request.headers.get('x-real-ip') || '';
    const db = supabaseAdmin();
    const row = {
      company: input.company,
      contact_name: input.contact_name,
      email: input.email,
      phone: input.phone,
      industry: input.industry,
      city: input.city,
      team_size: input.team_size,
      plan_interest: input.plan_interest,
      interest: input.interest,
      message: input.message,
      consent: true,
      consent_text: consentText[input.locale],
      locale: input.locale,
      source: input.source,
      ip_hash: ip && secret ? createHmac('sha256', secret).update(ip).digest('hex').slice(0, 16) : null,
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await db.from('waitlist').select('id,status').eq('email', input.email).maybeSingle();
    const { error } = existing
      ? await db.from('waitlist').update(row).eq('id', existing.id)
      : await db.from('waitlist').insert(row);
    if (error) throw error;
    void logActivity(request, { action: 'waitlist.signup', details: { company: input.company, interest: input.interest } });
    if (emailConfigured() && !existing)
      after(async () => {
        const de = input.locale === 'de';
        try {
          await sendEmail({
            ...noticeEmail({
              locale: input.locale,
              title: de ? 'Danke – Sie stehen auf der Slotdove-Warteliste' : 'Thanks – you are on the Slotdove waitlist',
              lines: de
                ? [`Hallo ${input.contact_name},`, `vielen Dank für Ihr Interesse an Slotdove für ${input.company}. Wir melden uns persönlich bei Ihnen, sobald Ihr Testzugang bereitsteht.`, 'Sie möchten doch nicht kontaktiert werden? Antworten Sie einfach kurz auf diese E-Mail.']
                : [`Hello ${input.contact_name},`, `thank you for your interest in Slotdove for ${input.company}. We will contact you personally as soon as your test access is ready.`, 'Changed your mind? Simply reply to this email.'],
            }),
            to: input.email,
            idempotencyKey: `waitlist-${input.email}`,
          });
        } catch {
          /* confirmation is optional */
        }
      });
    return json({ ok: true }, 201);
  } catch (e) {
    if (e instanceof HttpError && e.message === 'TOO_FAST') return json({ error: 'INVALID_INPUT' }, 400);
    return failure(e);
  }
}
