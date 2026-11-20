import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { failure, HttpError, json, rateLimit } from '@/lib/http';
import { availableSlots } from '@/lib/scheduling/engine';
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    z.string()
      .regex(/^[a-z][a-z0-9-]{2,49}$/)
      .parse(slug);
    const db = supabaseAdmin();
    await rateLimit(request, `availability:${slug}`, 100);
    const { data: b, error } = await db
      .from('businesses')
      .select(
        'logo_path,id,name,slug,description,timezone,currency,locale,address,phone,email,brand_color,slot_interval,min_notice_minutes,max_advance_days,is_demo,demo_expires_at',
      )
      .eq('slug', slug)
      .eq('published', true)
      .eq('status', 'active')
      .single();
    if (error || !b || (b.is_demo && b.demo_expires_at && new Date(b.demo_expires_at) < new Date()))
      throw new HttpError(404, 'BOOKING_UNAVAILABLE');
    const url = new URL(request.url),
      serviceId = url.searchParams.get('service'),
      date = url.searchParams.get('date');
    if (!serviceId || !date) {
      const [
        { data: services, error: se },
        { data: staff, error: ste },
        { data: assignments, error: ae },
      ] = await Promise.all([
        db
          .from('services')
          .select('id,name,description,duration_minutes,price_cents,color,art,image_path')
          .eq('business_id', b.id)
          .eq('active', true)
          .order('sort_order'),
        db.from('staff_profiles').select('id,name').eq('business_id', b.id).eq('active', true),
        db.from('service_staff').select('service_id,staff_id').eq('business_id', b.id),
      ]);
      if (se || ste || ae) throw se || ste || ae;
      return json({ business: b, services, staff, assignments });
    }
    z.uuid().parse(serviceId);
    z.iso.date().parse(date);
    if (Date.parse(date) < Date.now() - 86400000 || Date.parse(date) > Date.now() + 366 * 86400000)
      return json({ slots: [] });
    const { data: s, error: se } = await db
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .eq('business_id', b.id)
      .eq('active', true)
      .single();
    if (se || !s) throw new HttpError(404, 'BOOKING_UNAVAILABLE');
    const { data: assignments, error: ae } = await db
      .from('service_staff')
      .select('staff_id,staff_profiles!inner(active)')
      .eq('service_id', s.id)
      .eq('business_id', b.id)
      .eq('staff_profiles.active', true);
    if (ae) throw ae;
    const requested = url.searchParams.get('staff');
    if (requested) z.uuid().parse(requested);
    // No assignment = every active team member can take the appointment (assignment is optional).
    let pool = (assignments || []).map((a) => a.staff_id);
    if (!pool.length) {
      const { data: all, error: te } = await db.from('staff_profiles').select('id').eq('business_id', b.id).eq('active', true);
      if (te) throw te;
      pool = (all || []).map((x) => x.id);
    }
    const staffIds = pool
      .filter((s) => !requested || s === requested)
      .sort();
    const slots: { start: string; staff_id: string }[] = [];
    const lo = new Date(Date.parse(date) - 86400000).toISOString(),
      hi = new Date(Date.parse(date) + 2 * 86400000).toISOString();
    for (const sid of staffIds) {
      const [
        { data: hours, error: he },
        { data: bookings, error: be },
        { data: blocks, error: ble },
      ] = await Promise.all([
        db
          .from('availability_rules')
          .select('starts,ends')
          .eq('staff_id', sid)
          .eq('weekday', new Date(date + 'T12:00:00Z').getUTCDay()),
        db
          .from('bookings')
          .select('occupied_start,occupied_end')
          .eq('staff_id', sid)
          .neq('status', 'cancelled')
          .lt('occupied_start', hi)
          .gt('occupied_end', lo),
        db
          .from('blocked_times')
          .select('starts_at,ends_at')
          .eq('staff_id', sid)
          .lt('starts_at', hi)
          .gt('ends_at', lo),
      ]);
      if (he || be || ble) throw he || be || ble;
      const times = availableSlots({
        date,
        timezone: b.timezone,
        hours: hours || [],
        busy: [
          ...(bookings || []).map((x) => ({ start: x.occupied_start, end: x.occupied_end })),
          ...(blocks || []).map((x) => ({ start: x.starts_at, end: x.ends_at })),
        ],
        duration: s.duration_minutes,
        bufferBefore: s.buffer_before,
        bufferAfter: s.buffer_after,
        interval: b.slot_interval,
        minNotice: b.min_notice_minutes,
        maxAdvance: b.max_advance_days,
      });
      for (const start of times)
        if (!slots.some((x) => x.start === start)) slots.push({ start, staff_id: sid });
    }
    return json({ slots: slots.sort((a, b) => a.start.localeCompare(b.start)) });
  } catch (e) {
    return failure(e);
  }
}
