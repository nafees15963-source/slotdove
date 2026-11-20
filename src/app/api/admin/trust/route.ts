import { z } from 'zod';
import { body, failure, HttpError, json, requireAdmin, sameOrigin, softRateLimit } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { noticeEmail, sendEmail } from '@/lib/email';
import { generatePassword } from '@/lib/trust';
import { text } from '@/lib/sanitize';
import { csv } from '@/lib/utils';
import { safeSupportUrl } from '@/lib/release';

/** Trust & safety, GDPR requests, blocklist, statistics, platform switches and user security actions. */
const audit = (actor: string, action: string, details: Record<string, unknown>, business_id?: string | null) =>
  supabaseAdmin()
    .from('admin_audit_logs')
    .insert({ actor_id: actor, action, details, business_id: business_id || null });
const day = (iso: string) => iso.slice(0, 10);
const like = (q: string) => `%${q.replace(/[%_,()\\]/g, ' ').trim()}%`;

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const db = supabaseAdmin();
    const url = new URL(request.url);
    const view = url.searchParams.get('view');
    if (view === 'reports') {
      const { data, error } = await db.from('abuse_reports').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return json({ reports: data });
    }
    if (view === 'dsr') {
      const { data, error } = await db.from('dsr_requests').select('*').order('received_at', { ascending: false }).limit(500);
      if (error) throw error;
      return json({ requests: data });
    }
    if (view === 'dsr-lookup') {
      const email = z.email().parse(url.searchParams.get('email')).toLowerCase();
      const [customers, waitlist, reports, users] = await Promise.all([
        db.from('customers').select('id,business_id,name,email,phone,notes,created_at,booking_blocked').eq('email', email).limit(200),
        db.from('waitlist').select('*').eq('email', email),
        db.from('abuse_reports').select('case_number,category,status,created_at').eq('reporter_email', email),
        db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);
      const account = users.data?.users.find((u) => u.email?.toLowerCase() === email) || null;
      const customerIds = (customers.data || []).map((c) => c.id);
      const bookings = customerIds.length
        ? await db.from('bookings').select('id,business_id,booking_number,service_name,starts_at,status,notes,created_at').in('customer_id', customerIds).limit(2000)
        : { data: [] };
      const result = {
        subject: email,
        generated_at: new Date().toISOString(),
        account: account && { id: account.id, email: account.email, created_at: account.created_at, last_sign_in_at: account.last_sign_in_at },
        customers: customers.data,
        bookings: bookings.data,
        waitlist: waitlist.data,
        reports_filed: reports.data,
      };
      if (url.searchParams.get('download'))
        return new Response(JSON.stringify(result, null, 2), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="dsgvo-auskunft.json"', 'Cache-Control': 'private, no-store' },
        });
      return json(result);
    }
    if (view === 'blocklist') {
      const { data, error } = await db.from('blocklist').select('*').order('created_at', { ascending: false }).limit(1000);
      if (error) throw error;
      return json({ entries: data });
    }
    if (view === 'settings') {
      const { data, error } = await db.from('platform_settings').select('*');
      if (error) throw error;
      return json({ settings: Object.fromEntries((data || []).map((r) => [r.key, r.value])) });
    }
    if (view === 'stats') {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [bookings, businesses, users, waitlist, entitlements, reports] = await Promise.all([
        db.from('bookings').select('created_at,status,price_cents').gte('created_at', since).eq('is_sample', false).limit(20000),
        db.from('businesses').select('created_at,industry,is_demo,status,published').limit(5000),
        db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        db.from('waitlist').select('created_at,status,industry').limit(5000),
        db.from('business_entitlements').select('plan_id').limit(5000),
        db.from('abuse_reports').select('created_at,status,category').gte('created_at', since).limit(5000),
      ]);
      const days: Record<string, { bookings: number; signups: number; waitlist: number; reports: number }> = {};
      for (let i = 29; i >= 0; i--) days[day(new Date(Date.now() - i * 86400000).toISOString())] = { bookings: 0, signups: 0, waitlist: 0, reports: 0 };
      for (const b of bookings.data || []) if (days[day(b.created_at)]) days[day(b.created_at)].bookings++;
      for (const u of users.data?.users || []) if (days[day(u.created_at)]) days[day(u.created_at)].signups++;
      for (const w of waitlist.data || []) if (days[day(w.created_at)]) days[day(w.created_at)].waitlist++;
      for (const r of reports.data || []) if (days[day(r.created_at)]) days[day(r.created_at)].reports++;
      const count = <T,>(rows: T[] | null, key: (r: T) => string) =>
        Object.entries((rows || []).reduce<Record<string, number>>((acc, r) => ((acc[key(r)] = (acc[key(r)] || 0) + 1), acc), {})).sort((a, b) => b[1] - a[1]);
      const real = (businesses.data || []).filter((b) => !b.is_demo);
      return json({
        days: Object.entries(days).map(([date, v]) => ({ date, ...v })),
        totals: {
          businesses: real.length,
          demo: (businesses.data || []).length - real.length,
          published: real.filter((b) => b.published).length,
          suspended: real.filter((b) => b.status === 'suspended').length,
          users: users.data?.users.length || 0,
          bookings30: (bookings.data || []).length,
          cancelled30: (bookings.data || []).filter((b) => b.status === 'cancelled').length,
          noShow30: (bookings.data || []).filter((b) => b.status === 'no_show').length,
          volume30: (bookings.data || []).filter((b) => b.status !== 'cancelled').reduce((s, b) => s + (b.price_cents || 0), 0),
          waitlist: (waitlist.data || []).length,
        },
        industries: count(real, (b) => b.industry || '—'),
        plans: count(entitlements.data, (e) => e.plan_id),
        waitlistIndustries: count(waitlist.data, (w) => w.industry || '—').slice(0, 10),
        reportCategories: count(reports.data, (r) => r.category),
      });
    }
    if (view === 'search') {
      const q = z.string().min(2).max(100).parse(url.searchParams.get('q')).trim();
      const p = like(q);
      const [businesses, customers, bookings, waitlist, reports, tickets, users] = await Promise.all([
        db.from('businesses').select('id,name,slug,email,status').or(`name.ilike.${p},slug.ilike.${p},email.ilike.${p}`).limit(20),
        db.from('customers').select('id,business_id,name,email,phone').or(`name.ilike.${p},email.ilike.${p},phone.ilike.${p}`).limit(20),
        db.from('bookings').select('id,business_id,booking_number,customer_name,service_name,starts_at,status').or(`booking_number.ilike.${p},customer_name.ilike.${p}`).limit(20),
        db.from('waitlist').select('id,company,contact_name,email,status').or(`company.ilike.${p},email.ilike.${p},contact_name.ilike.${p}`).limit(20),
        db.from('abuse_reports').select('id,case_number,category,status').or(`case_number.ilike.${p},reporter_email.ilike.${p},description.ilike.${p}`).limit(20),
        db.from('support_tickets').select('id,case_number,subject,status').or(`case_number.ilike.${p},subject.ilike.${p},contact_email.ilike.${p}`).limit(20),
        db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);
      const ql = q.toLowerCase();
      return json({
        businesses: businesses.data || [],
        customers: customers.data || [],
        bookings: bookings.data || [],
        waitlist: waitlist.data || [],
        reports: reports.data || [],
        tickets: tickets.data || [],
        users: (users.data?.users || []).filter((u) => u.email?.toLowerCase().includes(ql) || u.id === q).slice(0, 20).map((u) => ({ id: u.id, email: u.email, created_at: u.created_at })),
      });
    }
    if (view === 'audit-csv') {
      const { data, error } = await db.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(10000);
      if (error) throw error;
      return new Response(csv((data || []).map((a) => ({ Zeit: a.created_at, Akteur: a.actor_id, Aktion: a.action, Betrieb: a.business_id || '', Details: JSON.stringify(a.details) }))), {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="slotdove-audit.csv"', 'Cache-Control': 'private, no-store' },
      });
    }
    if (view === 'user-security') {
      const id = z.uuid().parse(url.searchParams.get('user'));
      const [{ data: u }, factors, acceptances] = await Promise.all([
        db.auth.admin.getUserById(id),
        db.auth.admin.mfa.listFactors({ userId: id }),
        db.from('legal_acceptances').select('document,version,accepted_at').eq('user_id', id).order('accepted_at', { ascending: false }),
      ]);
      return json({
        email_confirmed_at: u.user?.email_confirmed_at || null,
        must_change_password: !!u.user?.app_metadata?.must_change_password,
        factors: (factors.data?.factors || []).map((f) => ({ id: f.id, type: f.factor_type, status: f.status, name: f.friendly_name, created_at: f.created_at })),
        acceptances: acceptances.data || [],
      });
    }
    throw new HttpError(404, 'NOT_FOUND');
  } catch (e) {
    return failure(e);
  }
}

const reportStatus = z.enum(['open', 'in_review', 'actioned', 'rejected', 'closed']);
const dsrType = z.enum(['access', 'erasure', 'rectification', 'restriction', 'portability', 'objection', 'withdrawal', 'other']);
const dsrStatus = z.enum(['new', 'verifying', 'in_progress', 'done', 'rejected']);

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { user } = await requireAdmin();
    await softRateLimit(request, `admin-trust:${user.id}`, 300);
    const input = await body(request);
    const db = supabaseAdmin();
    const action = z.string().max(40).parse(input.action);

    if (action === 'report-update') {
      const v = z
        .object({
          id: z.uuid(),
          status: reportStatus,
          decision: text(4000).default(''),
          admin_notes: text(4000).default(''),
          notify: z.boolean().default(false),
          suspend_business: z.boolean().default(false),
        })
        .parse(input);
      if (['actioned', 'rejected'].includes(v.status) && v.decision.length < 10) throw new HttpError(400, 'DECISION_REQUIRED');
      const { data: r, error } = await db
        .from('abuse_reports')
        .update({ status: v.status, decision: v.decision, admin_notes: v.admin_notes, updated_at: new Date().toISOString(), resolved_at: ['actioned', 'rejected', 'closed'].includes(v.status) ? new Date().toISOString() : null })
        .eq('id', v.id)
        .select('*')
        .single();
      if (error) throw error;
      if (v.suspend_business && r.business_id) await db.from('businesses').update({ status: 'suspended' }).eq('id', r.business_id);
      let emailed = false;
      if (v.notify && r.reporter_email) {
        const sent = await sendEmail({
          ...noticeEmail({
            locale: 'de',
            title: `Entscheidung zu Ihrer Meldung ${r.case_number}`,
            lines: [
              'Guten Tag,',
              `wir haben Ihre Meldung ${r.case_number} geprüft.`,
              `Ergebnis: ${v.status === 'actioned' ? 'Wir haben Maßnahmen ergriffen.' : v.status === 'rejected' ? 'Wir haben keinen Verstoß festgestellt.' : 'Der Fall ist abgeschlossen.'}`,
              `Begründung: ${v.decision || '—'}`,
              'Gegen diese Entscheidung können Sie innerhalb von sechs Monaten durch Antwort auf diese E-Mail Einwände erheben. Der Rechtsweg bleibt unberührt.',
            ],
          }),
          to: r.reporter_email,
          idempotencyKey: `report-decision-${r.id}-${v.status}`,
        }).catch(() => ({ state: 'failed' }));
        emailed = sent.state === 'accepted';
      }
      await audit(user.id, 'report.decided', { case: r.case_number, status: v.status, suspended: v.suspend_business }, r.business_id);
      return json({ ok: true, emailed });
    }

    if (action === 'dsr-create') {
      const v = z
        .object({
          type: dsrType,
          requester_name: z.string().max(120).default(''),
          requester_email: z.email().max(254),
          subject_email: z.union([z.email().max(254), z.literal('')]).default(''),
          channel: z.string().max(40).default('email'),
          notes: text(8000).default(''),
        })
        .parse(input);
      const { data, error } = await db
        .from('dsr_requests')
        .insert({ ...v, requester_email: v.requester_email.toLowerCase(), subject_email: (v.subject_email || v.requester_email).toLowerCase(), created_by: user.id })
        .select('case_number')
        .single();
      if (error) throw error;
      await audit(user.id, 'gdpr.request_created', { case: data.case_number, type: v.type });
      return json(data);
    }
    if (action === 'dsr-update') {
      const v = z
        .object({ id: z.uuid(), status: dsrStatus, identity_verified: z.boolean(), notes: text(8000).default(''), result: text(8000).default('') })
        .parse(input);
      const { error } = await db
        .from('dsr_requests')
        .update({ ...v, updated_at: new Date().toISOString(), completed_at: ['done', 'rejected'].includes(v.status) ? new Date().toISOString() : null })
        .eq('id', v.id);
      if (error) throw error;
      await audit(user.id, 'gdpr.request_updated', { id: v.id, status: v.status });
      return json({ ok: true });
    }
    if (action === 'dsr-erase') {
      const v = z.object({ email: z.email(), confirm: z.literal(true) }).parse(input);
      const { data, error } = await db.rpc('admin_erase_email', { p_actor: user.id, p_email: v.email.toLowerCase() });
      if (error) throw error;
      return json(data);
    }

    if (action === 'block-add') {
      const v = z
        .object({
          kind: z.enum(['email', 'domain', 'ip']),
          value: z.string().min(3).max(254).transform((s) => s.trim().toLowerCase()),
          reason: z.string().max(500).default(''),
          days: z.number().int().min(0).max(3650).default(0),
        })
        .parse(input);
      if (v.kind === 'email') z.email().parse(v.value);
      if (v.kind === 'domain' && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(v.value)) throw new HttpError(400, 'INVALID_INPUT');
      if (v.kind === 'ip' && !/^[a-f0-9]{16}$/.test(v.value)) throw new HttpError(400, 'INVALID_INPUT');
      const { error } = await db.from('blocklist').upsert(
        { kind: v.kind, value: v.value, reason: v.reason, created_by: user.id, expires_at: v.days ? new Date(Date.now() + v.days * 86400000).toISOString() : null },
        { onConflict: 'kind,value' },
      );
      if (error) throw error;
      await audit(user.id, 'blocklist.added', { kind: v.kind, value: v.value });
      return json({ ok: true });
    }
    if (action === 'block-remove') {
      const id = z.uuid().parse(input.id);
      const { error } = await db.from('blocklist').delete().eq('id', id);
      if (error) throw error;
      await audit(user.id, 'blocklist.removed', { id });
      return json({ ok: true });
    }

    if (action === 'setting') {
      const v = z
        .object({
          key: z.enum(['maintenance', 'signups', 'public_booking']),
          enabled: z.boolean(),
          message: z.string().max(300).default(''),
        })
        .parse(input);
      const value = v.key === 'maintenance' ? { enabled: v.enabled, message: v.message } : { enabled: v.enabled };
      const { error } = await db.from('platform_settings').upsert({ key: v.key, value, updated_by: user.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      await audit(user.id, 'platform.setting', { key: v.key, ...value });
      return json({ ok: true });
    }

    if (action === 'release') {
      const v = z
        .object({ free_from: z.iso.date(), free_until: z.iso.date(), invite_only: z.boolean() })
        .refine((x) => x.free_until >= x.free_from, { message: 'END_BEFORE_START' })
        .parse(input);
      const { error } = await db.from('platform_settings').upsert({ key: 'release', value: v, updated_by: user.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      await audit(user.id, 'platform.release', v);
      return json({ ok: true });
    }
    if (action === 'support') {
      const v = z.object({ enabled: z.boolean(), url: z.string().max(300).default(''), text: z.string().max(300).default('') }).parse(input);
      const url = v.url ? safeSupportUrl(v.url.trim()) : '';
      if (v.url && !url) throw new HttpError(400, 'SUPPORT_URL_INVALID');
      if (v.enabled && !url) throw new HttpError(400, 'SUPPORT_URL_INVALID');
      const value = { enabled: v.enabled, url, text: v.text.replace(/[<>]/g, '').trim() };
      const { error } = await db.from('platform_settings').upsert({ key: 'support', value, updated_by: user.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      await audit(user.id, 'platform.support', value);
      return json({ ok: true });
    }

    if (action === 'broadcast') {
      // Service information to account holders (no advertising, § 7 UWG): limited, logged, double confirmed.
      const v = z
        .object({ subject: z.string().min(3).max(120), message: z.string().min(10).max(4000), confirm: z.literal(true), test: z.boolean().default(true) })
        .parse(input);
      await softRateLimit(request, `broadcast:${user.id}`, v.test ? 20 : 3);
      const recipients: string[] = [];
      if (v.test) recipients.push(user.email || '');
      else {
        const { data: owners } = await db.from('businesses').select('email').eq('is_demo', false).neq('status', 'archived').limit(2000);
        recipients.push(...new Set((owners || []).map((o) => o.email.toLowerCase())));
      }
      let sent = 0;
      for (const to of recipients.filter(Boolean)) {
        const r = await sendEmail({
          ...noticeEmail({ locale: 'de', title: v.subject, lines: v.message.split(/\n+/).slice(0, 30) }),
          to,
          idempotencyKey: `broadcast-${Buffer.from(v.subject + to).toString('base64url').slice(0, 60)}-${new Date().toISOString().slice(0, 13)}`,
        }).catch(() => ({ state: 'failed' }));
        if (r.state === 'accepted') sent++;
      }
      await audit(user.id, 'platform.broadcast', { subject: v.subject, recipients: recipients.length, sent, test: v.test });
      return json({ ok: true, recipients: recipients.length, sent });
    }

    // ---- User security actions ----
    const uid = () => z.uuid().parse(input.user_id);
    if (action === 'user-revoke-sessions') {
      const id = uid();
      const { data, error } = await db.rpc('admin_revoke_sessions', { p_actor: user.id, p_user: id });
      if (error) throw error;
      return json({ sessions: data });
    }
    if (action === 'user-confirm-email') {
      const id = uid();
      const { error } = await db.auth.admin.updateUserById(id, { email_confirm: true });
      if (error) throw error;
      await audit(user.id, 'user.email_confirmed', { user_id: id });
      return json({ ok: true });
    }
    if (action === 'user-change-email') {
      const id = uid();
      const email = z.email().max(254).parse(input.email).toLowerCase();
      const { error } = await db.auth.admin.updateUserById(id, { email, email_confirm: true });
      if (error) throw new HttpError(409, 'ACCOUNT_EXISTS');
      await audit(user.id, 'user.email_changed', { user_id: id });
      return json({ ok: true });
    }
    if (action === 'user-temp-password') {
      const id = uid();
      if (id === user.id) throw new HttpError(400, 'INVALID_INPUT');
      const password = generatePassword();
      const { data: u } = await db.auth.admin.getUserById(id);
      const { error } = await db.auth.admin.updateUserById(id, { password, app_metadata: { ...(u.user?.app_metadata || {}), must_change_password: true } });
      if (error) throw error;
      await db.rpc('admin_revoke_sessions', { p_actor: user.id, p_user: id });
      await audit(user.id, 'user.temp_password', { user_id: id });
      return json({ password });
    }
    if (action === 'user-recovery-link') {
      const id = uid();
      const { data: u } = await db.auth.admin.getUserById(id);
      if (!u.user?.email) throw new HttpError(404, 'NOT_FOUND');
      const { data, error } = await db.auth.admin.generateLink({
        type: 'recovery',
        email: u.user.email,
        options: { redirectTo: `${new URL(request.url).origin}/auth/callback?next=/account/password` },
      });
      if (error) throw error;
      await audit(user.id, 'user.recovery_link', { user_id: id });
      return json({ link: data.properties.action_link });
    }
    if (action === 'user-mfa-reset') {
      const id = uid();
      const { data: f } = await db.auth.admin.mfa.listFactors({ userId: id });
      for (const factor of f?.factors || []) await db.auth.admin.mfa.deleteFactor({ userId: id, id: factor.id });
      await audit(user.id, 'user.mfa_reset', { user_id: id, factors: f?.factors.length || 0 });
      return json({ removed: f?.factors.length || 0 });
    }
    if (action === 'user-delete') {
      const id = uid();
      if (input.confirm !== 'LÖSCHEN') throw new HttpError(400, 'CONFIRMATION_REQUIRED');
      if (id === user.id) throw new HttpError(400, 'INVALID_INPUT');
      const { data: owned } = await db.from('businesses').select('id').eq('owner_id', id).limit(1);
      if (owned?.length) throw new HttpError(409, 'OWNS_BUSINESS');
      const { error } = await db.auth.admin.deleteUser(id);
      if (error) throw error;
      await audit(user.id, 'user.deleted', { user_id: id });
      return json({ ok: true });
    }
    if (action === 'user-create') {
      const v = z.object({ email: z.email().max(254), name: z.string().min(2).max(100) }).parse(input);
      const password = generatePassword();
      const { data, error } = await db.auth.admin.createUser({
        email: v.email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { display_name: v.name },
        app_metadata: { must_change_password: true, created_by_admin: user.id },
      });
      if (error) throw new HttpError(409, 'ACCOUNT_EXISTS');
      await audit(user.id, 'user.created', { user_id: data.user.id });
      return json({ user_id: data.user.id, password });
    }
    throw new HttpError(400, 'INVALID_INPUT');
  } catch (e) {
    return failure(e);
  }
}
