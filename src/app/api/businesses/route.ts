import { z } from 'zod';
import { line } from '@/lib/sanitize';
import { businessSchema } from '@/lib/validation';
import { body, failure, json, requireUser, sameOrigin, softRateLimit } from '@/lib/http';
import { hourPresets, industryById } from '@/lib/industries';
import { logActivity } from '@/lib/activity';
const extra = z.object({
  use_template: z.boolean().default(true),
  hours: z.enum(['weekdays', 'saturday', 'late', 'none']).default('weekdays'),
  owner_name: line(2, 100).optional(),
});
function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return /^[a-z]/.test(base) && base.length >= 3 ? base : `studio-${base || 'neu'}`.slice(0, 40);
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { db, user } = await requireUser();
    await softRateLimit(request, 'business-create', 5);
    const raw = await body(request);
    const options = extra.parse(raw);
    const input = businessSchema.parse({ ...raw, slug: raw.slug || slugify(String(raw.name || '')) });
    let data: { id: string } | null = null;
    for (let attempt = 0; attempt < 6 && !data; attempt++) {
      const slug = attempt ? `${input.slug.slice(0, 44)}-${Math.floor(100 + Math.random() * 900)}` : input.slug;
      const result = await db.from('businesses').insert({ ...input, slug, owner_id: user.id }).select('id').single();
      if (result.error?.code === '23505' && !raw.slug) continue;
      if (result.error) throw result.error;
      data = result.data;
    }
    if (!data) throw new Error('ALREADY_EXISTS');
    const id = data.id;
    // Ready-to-use setup: one profile for the owner, template services, hours.
    const industry = industryById(input.industry);
    const de = input.locale === 'de';
    const { data: staff } = await db
      .from('staff_profiles')
      .insert({ business_id: id, name: options.owner_name || (de ? 'Ich' : 'Me'), user_id: user.id })
      .select('id')
      .single();
    if (options.use_template) {
      const colors = ['#0d7f79', '#f2994a', '#2f80ed', '#9b51e0', '#e0607e'];
      const { data: services } = await db
        .from('services')
        .insert(
          industry.services.map((s, i) => ({
            business_id: id,
            name: de ? s.de : s.en,
            duration_minutes: s.minutes,
            price_cents: input.currency === 'EUR' ? s.price : s.price,
            buffer_after: s.after || 0,
            color: colors[i % colors.length],
            sort_order: i,
          })),
        )
        .select('id');
      if (staff && services?.length)
        await db.from('service_staff').insert(services.map((s) => ({ business_id: id, service_id: s.id, staff_id: staff.id })));
    }
    const preset = hourPresets[options.hours];
    if (staff && preset.days.length)
      await db.from('availability_rules').insert(
        preset.days.map((weekday) => ({ business_id: id, staff_id: staff.id, weekday, starts: preset.starts, ends: preset.ends })),
      );
    void logActivity(request, { user_id: user.id, business_id: id, action: 'business.created', details: { industry: input.industry } });
    return json({ id }, 201);
  } catch (e) {
    return failure(e);
  }
}
