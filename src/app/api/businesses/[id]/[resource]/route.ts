import { exportRows } from '@/lib/export-data';
import { sendEmail, invitationEmail } from '@/lib/email';
import { z } from 'zod';
import {
  customerSchema,
  hoursSchema,
  serviceSchema,
  settingsSchema,
  statusSchema,
} from '@/lib/validation';
import {
  body,
  failure,
  HttpError,
  json,
  requireBusiness,
  sameOrigin,
  newToken,
  hashToken,
} from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { csv } from '@/lib/utils';
import { calendarFile } from '@/lib/scheduling/engine';
import { logActivity } from '@/lib/activity';
import { fromZonedTime } from 'date-fns-tz';
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const internalBookingSchema = z.object({
  service_id: z.uuid(),
  staff_id: z.uuid().nullable(),
  customer_id: z.uuid().optional(),
  starts_at: z.iso.datetime({ offset: true }),
  name: z.string().trim().min(2).max(100),
  email: z
    .union([z.email().max(254), z.literal('')])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
  phone: z.string().max(30).default(''),
  notes: z.string().max(1000).default(''),
  idempotency_key: z.uuid(),
});
type Context = { params: Promise<{ id: string; resource: string }> };
const tables: Record<string, string> = {
  services: 'services',
  customers: 'customers',
  staff: 'staff_profiles',
  availability: 'availability_rules',
  blocks: 'blocked_times',
  bookings: 'bookings',
  invitations: 'business_invitations',
  members: 'business_members',
};
export async function POST(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const { id, resource } = await context.params;
    z.uuid().parse(id);
    const { db, user, role } = await requireBusiness(id, resource !== 'booking-status');
    const input = await body(request);
    void logActivity(request, {
      user_id: user.id,
      business_id: id,
      action: `${resource}.${input.id ? 'update' : 'create'}`,
      details: { item: typeof input.id === 'string' ? input.id : undefined },
    });
    if (resource === 'week-plan-replace') {
      const v = z
        .object({
          staff_ids: z.array(z.uuid()).min(1).max(100),
          rules: z
            .array(z.object({ weekday: z.number().int().min(0).max(6), starts: time, ends: time }).refine((r) => r.ends > r.starts))
            .max(70),
        })
        .parse(input);
      for (const staffId of v.staff_ids) {
        const { error } = await db.rpc('replace_week_plan', { p_business: id, p_staff: staffId, p_rules: v.rules });
        if (error) throw error;
      }
      return json({ ok: true });
    }
    if (resource === 'holidays') {
      const v = z
        .object({
          staff_ids: z.array(z.uuid()).min(1).max(100),
          days: z.array(z.object({ date: z.iso.date(), reason: z.string().max(200) })).min(1).max(60),
        })
        .parse(input);
      const { data: business, error: be } = await db.from('businesses').select('timezone').eq('id', id).single();
      if (be) throw be;
      let created = 0,
        skipped = 0;
      for (const staffId of v.staff_ids)
        for (const d of v.days) {
          const next = new Date(d.date + 'T12:00:00Z');
          next.setUTCDate(next.getUTCDate() + 1);
          const { error } = await db.from('blocked_times').insert({
            business_id: id,
            staff_id: staffId,
            starts_at: fromZonedTime(`${d.date}T00:00:00`, business.timezone).toISOString(),
            ends_at: fromZonedTime(`${next.toISOString().slice(0, 10)}T00:00:00`, business.timezone).toISOString(),
            reason: d.reason,
          });
          if (error) skipped++;
          else created++;
        }
      return json({ created, skipped });
    }
    if (resource === 'blocks' && input.staff_id === 'all') {
      const v = z
        .object({ starts_at: z.iso.datetime({ offset: true }), ends_at: z.iso.datetime({ offset: true }), reason: z.string().max(200).default('') })
        .refine((x) => x.ends_at > x.starts_at)
        .parse(input);
      const { data: staff, error: se } = await db.from('staff_profiles').select('id').eq('business_id', id).eq('active', true);
      if (se) throw se;
      if (!staff?.length) throw new HttpError(400, 'INVALID_INPUT');
      const { error } = await db.from('blocked_times').insert(staff.map((s) => ({ ...v, staff_id: s.id, business_id: id })));
      if (error) throw error;
      return json({ ok: true });
    }
    if (resource === 'anonymize-customer') {
      const customerId = z.uuid().parse(input.id);
      if (input.confirm !== true) throw new HttpError(400, 'CONFIRMATION_REQUIRED');
      const { error } = await db.rpc('anonymize_customer', { bid: id, cid: customerId });
      if (error) throw error;
      return json({ ok: true });
    }
    if (resource === 'members') {
      if (role !== 'owner') throw new HttpError(403, 'FORBIDDEN');
      const v = z
        .object({
          user_id: z.uuid(),
          role: z.enum(['admin', 'staff']),
          remove: z.boolean().default(false),
        })
        .parse(input);
      const { error } = await supabaseAdmin().rpc('manage_member_server', {
        p_business: id,
        p_user: v.user_id,
        p_actor: user.id,
        p_role: v.role,
        p_remove: v.remove,
      });
      if (error) throw error;
      return json({ ok: true });
    }

    if (resource === 'settings') {
      const fields = settingsSchema.parse(input);
      const { data, error } = await db
        .from('businesses')
        .update(fields)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return json(data);
    }
    if (resource === 'week-plan') {
      const days = z.array(z.number().int().min(0).max(6)).min(1).max(7).parse(input.days);
      const rows = [...new Set(days)].map((weekday) => ({ ...hoursSchema.parse({ ...input, weekday }), business_id: id }));
      const { error } = await db.from('availability_rules').insert(rows);
      if (error) throw error;
      return json({ ok: true });
    }
    if (
      resource === 'services' ||
      resource === 'customers' ||
      resource === 'staff' ||
      resource === 'availability' ||
      resource === 'blocks'
    ) {
      const fields =
        resource === 'services'
          ? serviceSchema.parse(input)
          : resource === 'customers'
            ? customerSchema.parse(input)
            : resource === 'staff'
              ? z
                  .object({ name: z.string().min(2).max(100), active: z.boolean().default(true) })
                  .parse(input)
              : resource === 'availability'
                ? hoursSchema.parse(input)
                : z
                    .object({
                      staff_id: z.uuid(),
                      starts_at: z.iso.datetime({ offset: true }),
                      ends_at: z.iso.datetime({ offset: true }),
                      reason: z.string().max(200).default(''),
                    })
                    .refine((v) => v.ends_at > v.starts_at)
                    .parse(input);
      const query = input.id
        ? db
            .from(tables[resource])
            .update(fields)
            .eq('id', z.uuid().parse(input.id))
            .eq('business_id', id)
        : db.from(tables[resource]).insert({ ...fields, business_id: id });
      const { data, error } = await query.select().single();
      if (error) throw error;
      return json(data);
    }
    if (resource === 'assignments') {
      const { service_id, staff_id, assigned } = z
        .object({ service_id: z.uuid(), staff_id: z.uuid(), assigned: z.boolean() })
        .parse(input);
      const query = assigned
        ? db.from('service_staff').upsert({ business_id: id, service_id, staff_id })
        : db
            .from('service_staff')
            .delete()
            .eq('business_id', id)
            .eq('service_id', service_id)
            .eq('staff_id', staff_id);
      const { error } = await query;
      if (error) throw error;
      return json({ ok: true });
    }
    if (resource === 'bookings') {
      const fields = internalBookingSchema.parse(input);
      const { data: existing, error: findError } = await db
        .from('bookings')
        .select('id')
        .eq('business_id', id)
        .eq('idempotency_key', fields.idempotency_key)
        .maybeSingle();
      if (findError) throw findError;
      if (existing) return json(existing);
      let customerId = fields.customer_id;
      if (customerId) {
        const { data, error } = await db.from('customers').select('id').eq('business_id', id).eq('id', customerId).maybeSingle();
        if (error) throw error;
        if (!data) throw new HttpError(400, 'INVALID_INPUT');
      } else {
        const { data: match } = fields.email
          ? await db.from('customers').select('id').eq('business_id', id).eq('email', fields.email).maybeSingle()
          : await db.from('customers').select('id').eq('business_id', id).eq('name', fields.name).is('email', null).limit(1).maybeSingle();
        if (match) customerId = match.id;
        else {
          const { data, error } = await db
            .from('customers')
            .insert({ business_id: id, name: fields.name, email: fields.email, phone: fields.phone })
            .select('id')
            .single();
          if (error) throw error;
          customerId = data.id;
        }
      }
      const { data, error } = await db
        .from('bookings')
        .insert({
          business_id: id,
          service_id: fields.service_id,
          staff_id: fields.staff_id,
          customer_id: customerId,
          starts_at: fields.starts_at,
          notes: fields.notes,
          idempotency_key: fields.idempotency_key,
        })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }
    if (resource === 'booking-status') {
      const fields = z
        .object({
          id: z.uuid(),
          status: statusSchema.optional(),
          starts_at: z.iso.datetime({ offset: true }).optional(),
          internal_notes: z.string().max(2000).optional(),
          staff_id: z.uuid().nullable().optional(),
        })
        .parse(input);
      const { id: bookingId, ...patch } = fields;
      if (role === 'staff' && fields.starts_at) throw new HttpError(403, 'FORBIDDEN');
      const { data, error } = await db
        .from('bookings')
        .update(patch)
        .eq('id', bookingId)
        .eq('business_id', id)
        .select()
        .single();
      if (error) throw error;
      return json(data);
    }
    if (resource === 'invitations') {
      const fields = z
        .object({
          email: z.email(),
          role: z.enum(['admin', 'staff']),
          staff_id: z.uuid().optional(),
        })
        .parse(input);
      if (role !== 'owner') throw new HttpError(403, 'FORBIDDEN');
      const admin = supabaseAdmin(),
        token = newToken();
      const { data, error } = await admin.rpc('create_invitation_server', {
        p_business: id,
        p_email: fields.email,
        p_role: fields.role,
        p_hash: hashToken(token),
        p_actor: user.id,
        p_staff: fields.staff_id || null,
      });
      if (error) throw error;
      const url = `${new URL(request.url).origin}/invite#token=${token}`;
      const { data: business } = await db
        .from('businesses')
        .select('name,locale,is_demo')
        .eq('id', id)
        .single();
      let email_status = 'unavailable';
      if (business && !business.is_demo) {
        try {
          const sent = await sendEmail({
            ...invitationEmail({ business: business.name, url, locale: business.locale }),
            to: fields.email,
            idempotencyKey: `invite-${data}`,
          });
          email_status = sent.state;
        } catch {
          email_status = 'failed';
        }
      } else if (business?.is_demo) email_status = 'suppressed';
      return json({ id: data, url, email_status });
    }
    throw new HttpError(404, 'NOT_FOUND');
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const { id, resource } = await context.params;
    const { db, user } = await requireBusiness(id);
    const item = z.uuid().parse(new URL(request.url).searchParams.get('item'));
    void logActivity(request, { user_id: user.id, business_id: id, action: `${resource}.delete`, details: { item } });
    if (
      ![
        'customers',
        'availability',
        'blocks',
        'services',
        'staff',
        'invitations',
        'bookings',
      ].includes(resource)
    )
      throw new HttpError(400, 'INVALID_INPUT');
    if (resource === 'invitations') {
      const { role } = await requireBusiness(id);
      if (role !== 'owner') throw new HttpError(403, 'FORBIDDEN');
      const { error } = await supabaseAdmin()
        .from('business_invitations')
        .delete()
        .eq('id', item)
        .eq('business_id', id);
      if (error) throw error;
      return json({ ok: true });
    }
    const query = db.from(tables[resource]).delete();
    const { data: deleted, error } = await query.eq('business_id', id).eq('id', item).select('id');
    if (error) throw error;
    if (!deleted?.length)
      throw new HttpError(409, resource === 'bookings' ? 'CANCEL_BEFORE_DELETE' : 'NOT_FOUND');
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function GET(request: Request, context: Context) {
  try {
    const { id, resource } = await context.params;
    const { db } = await requireBusiness(id, !['calendar-export', 'bookings'].includes(resource));
    const url = new URL(request.url);
    if (resource === 'analytics') {
      const from = z.iso.datetime({ offset: true }).parse(url.searchParams.get('from')),
        to = z.iso.datetime({ offset: true }).parse(url.searchParams.get('to'));
      if (Date.parse(to) - Date.parse(from) > 93 * 86400000 || to <= from)
        throw new HttpError(400, 'INVALID_INPUT');
      const { data, error } = await db.rpc('dashboard_stats', { bid: id, p_from: from, p_to: to });
      if (error) throw error;
      return json(data);
    }
    if (resource === 'customer-export') {
      const cid = z.uuid().parse(url.searchParams.get('item'));
      const { data: customer, error: ce } = await db
        .from('customers')
        .select('*')
        .eq('business_id', id)
        .eq('id', cid)
        .single();
      if (ce) throw ce;
      const bookings = await exportRows(
        db,
        'bookings',
        'id,service_name,starts_at,ends_at,status,price_cents,notes,internal_notes',
        id,
        cid,
      );
      return new Response(JSON.stringify({ customer, bookings }, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="customer-export.json"',
          'Cache-Control': 'private, no-store',
        },
      });
    }
    if (resource === 'export') {
      const data = await exportRows(db, 'customers', 'id,name,email,phone,notes,created_at', id);
      return new Response(csv(data || []), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="slotdove-customers.csv"',
          'Cache-Control': 'private, no-store',
        },
      });
    }
    if (resource === 'calendar-export') {
      const bookingId = z.uuid().parse(url.searchParams.get('item'));
      const [{ data: booking, error }, { data: business }] = await Promise.all([
        db
          .from('bookings')
          .select('id,service_name,starts_at,ends_at')
          .eq('business_id', id)
          .eq('id', bookingId)
          .single(),
        db.from('businesses').select('name,address').eq('id', id).single(),
      ]);
      if (error || !business) throw new HttpError(404, 'NOT_FOUND');
      return new Response(calendarFile(booking, business), {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="appointment.ics"',
          'Cache-Control': 'private, no-store',
        },
      });
    }
    if (resource === 'bookings' && url.searchParams.has('from')) {
      const from = z.iso.datetime({ offset: true }).parse(url.searchParams.get('from')),
        to = z.iso.datetime({ offset: true }).parse(url.searchParams.get('to'));
      if (Date.parse(to) - Date.parse(from) > 93 * 86400000 || to <= from)
        throw new HttpError(400, 'INVALID_INPUT');
      const { data, error } = await db
        .from('bookings')
        .select('*')
        .eq('business_id', id)
        .gte('starts_at', from)
        .lt('starts_at', to)
        .order('starts_at')
        .limit(500);
      if (error) throw error;
      return json({ data });
    }
    const table = tables[resource];
    if (!table) throw new HttpError(404, 'NOT_FOUND');
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(url.searchParams.get('page') || 0);
    let query = db.from(table).select('*', { count: 'exact' }).eq('business_id', id);
    if (resource === 'customers' && url.searchParams.get('search')) {
      const term = z.string().trim().max(100).parse(url.searchParams.get('search'));
      const pattern = term.replace(/[\\"%_]/g, (c) => '\\' + c);
      query = query.or(`name.ilike."%${pattern}%",email.ilike."%${pattern}%"`);
    }
    if (resource === 'customers' && url.searchParams.get('item'))
      query = query.eq('id', z.uuid().parse(url.searchParams.get('item')));
    const { data, error, count } = await query
      .order(resource === 'members' ? 'created_at' : 'id')
      .range(page * 100, page * 100 + 99);
    if (error) throw error;
    return json({ data, count });
  } catch (e) {
    return failure(e);
  }
}
