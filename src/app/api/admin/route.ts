import { z } from 'zod';
import { businessSchema } from '@/lib/validation';
import {
  body,
  failure,
  hashToken,
  json,
  newToken,
  requireAdmin,
  sameOrigin,
  HttpError,
} from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { scoreUsers } from '@/lib/ai/anomaly';
import { ensureConversation, postMessage } from '@/lib/chat';
import { logActivity } from '@/lib/activity';
import { notifyTicketReply, processQueue, registerAppUrl, sendSoon } from '@/lib/notifications';
import { emailConfigured, emailProvider, normalizeFrom, noticeEmail, sendEmail } from '@/lib/email';
import { line, text } from '@/lib/sanitize';
import { csv } from '@/lib/utils';
import { checkEnv } from '@/lib/env';
import { aiConfigured, groqChat } from '@/lib/groq';
const plan = z.enum(['free', 'pro', 'business']);
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const db = supabaseAdmin();
    const url = new URL(request.url);
    const userId = url.searchParams.get('user'),
      businessId = url.searchParams.get('business'),
      conversationId = url.searchParams.get('conversation'),
      ticketId = url.searchParams.get('ticket');
    if (url.searchParams.has('waitlist')) {
      const { data, error } = await db.from('waitlist').select('*').order('created_at', { ascending: false }).limit(2000);
      if (error) throw error;
      if (url.searchParams.get('waitlist') === 'csv')
        return new Response(
          csv(
            (data || []).map((w) => ({
              Firma: w.company,
              Ansprechpartner: w.contact_name,
              EMail: w.email,
              Telefon: w.phone,
              Branche: w.industry,
              Ort: w.city,
              Teamgroesse: w.team_size,
              Tarif: w.plan_interest,
              Interesse: w.interest,
              Status: w.status,
              Nachricht: w.message,
              Notizen: w.admin_notes,
              Demo_bis: w.demo_until || '',
              Eingetragen: w.created_at,
              Einwilligung: w.consent_text,
            })),
          ),
          { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="slotdove-warteliste.csv"', 'Cache-Control': 'private, no-store' } },
        );
      return json({ entries: data || [] });
    }
    if (url.searchParams.get('system') === '1') return json({ env: checkEnv() });
    if (url.searchParams.get('email') === 'status') {
      await registerAppUrl(request);
      const { data: stats } = await db.rpc('email_queue_stats');
      return json({
        resend_key: !!emailProvider(),
        email_from: normalizeFrom(process.env.EMAIL_FROM) || null,
        email_from_raw: process.env.EMAIL_FROM ? process.env.EMAIL_FROM.trim().slice(0, 120) : null,
        configured: emailConfigured(),
        site_url: process.env.NEXT_PUBLIC_SITE_URL || null,
        stats,
      });
    }
    if (ticketId) {
      const id = z.uuid().parse(ticketId);
      const [{ data: ticket, error }, { data: messages }] = await Promise.all([
        db.from('support_tickets').select('*,businesses(id,name,slug,email)').eq('id', id).single(),
        db.from('support_ticket_messages').select('*').eq('ticket_id', id).order('created_at'),
      ]);
      if (error) throw error;
      return json({ ticket, messages: messages || [], ai: aiConfigured() });
    }
    if (userId) {
      const id = z.uuid().parse(userId);
      const [{ data: account, error }, activity, owned, memberships, messages] = await Promise.all([
        db.auth.admin.getUserById(id),
        db.from('activity_log').select('id,action,business_id,details,ip_hash,user_agent,created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(300),
        db.from('businesses').select('id,name,slug,status').eq('owner_id', id),
        db.from('business_members').select('role,businesses(id,name,slug,status)').eq('user_id', id),
        db.from('messages').select('id,body,flagged,hidden,created_at,conversation_id,business_id').eq('sender_id', id).order('created_at', { ascending: false }).limit(100),
      ]);
      if (error || !account.user) throw new HttpError(404, 'NOT_FOUND');
      const u = account.user;
      return json({
        user: {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          confirmed: !!u.email_confirmed_at,
          banned_until: (u as { banned_until?: string }).banned_until || null,
          name: (u.user_metadata?.display_name as string) || '',
        },
        activity: activity.data || [],
        owned: owned.data || [],
        memberships: memberships.data || [],
        messages: messages.data || [],
      });
    }
    if (businessId) {
      const id = z.uuid().parse(businessId);
      const [business, members, notes, features, activity, conversations, counts, staff, services, bookings, customers, tickets] = await Promise.all([
        db.from('businesses').select('*,business_entitlements(plan_id)').eq('id', id).single(),
        db.from('business_members').select('user_id,role,created_at').eq('business_id', id),
        db.from('admin_business_notes').select('notes,updated_at').eq('business_id', id).maybeSingle(),
        db.from('business_features').select('flag_key,enabled').eq('business_id', id),
        db.from('activity_log').select('id,user_id,action,details,created_at').eq('business_id', id).order('created_at', { ascending: false }).limit(150),
        db.from('conversations').select('id,kind,customer_name,last_message_at').eq('business_id', id).order('last_message_at', { ascending: false }).limit(50),
        db.from('bookings').select('id', { count: 'exact', head: true }).eq('business_id', id),
        db.from('staff_profiles').select('id,name,active').eq('business_id', id),
        db.from('services').select('id,name,active,price_cents,duration_minutes').eq('business_id', id),
        db
          .from('bookings')
          .select('id,booking_number,starts_at,status,customer_name,service_name,staff_id,price_cents,notes,internal_notes,created_at')
          .eq('business_id', id)
          .order('starts_at', { ascending: false })
          .limit(300),
        db.from('customers').select('id,name,email,phone,notes,created_at').eq('business_id', id).order('created_at', { ascending: false }).limit(300),
        db.from('support_tickets').select('id,case_number,subject,status,priority,updated_at').eq('business_id', id).order('updated_at', { ascending: false }).limit(50),
      ]);
      if (business.error) throw business.error;
      return json({
        business: business.data,
        members: members.data || [],
        notes: notes.data?.notes || '',
        features: features.data || [],
        activity: activity.data || [],
        conversations: conversations.data || [],
        bookingCount: counts.count || 0,
        staff: staff.data || [],
        services: services.data || [],
        bookings: bookings.data || [],
        customers: customers.data || [],
        tickets: tickets.data || [],
      });
    }
    if (conversationId) {
      const id = z.uuid().parse(conversationId);
      const { data, error } = await db
        .from('messages')
        .select('id,sender_kind,sender_id,sender_name,body,flagged,flag_reason,hidden,created_at')
        .eq('conversation_id', id)
        .order('created_at')
        .limit(500);
      if (error) throw error;
      return json({ messages: data });
    }
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const [businesses, stats, audit, accounts, notifications, reports, flags, overrides, announcements, activity, flaggedMessages, support, messageCount, tickets, waitlistNew] = await Promise.all([
      db
        .from('businesses')
        .select('id,name,slug,email,owner_id,industry,status,is_demo,demo_expires_at,created_at,published,business_entitlements(plan_id)')
        .order('created_at', { ascending: false })
        .limit(500),
      db.from('bookings').select('id', { count: 'exact', head: true }),
      db.from('admin_audit_logs').select('id,action,business_id,created_at,details').order('created_at', { ascending: false }).limit(50),
      db.auth.admin.listUsers({ page: 1, perPage: 500 }),
      db
        .from('notification_jobs')
        .select('id,business_id,kind,status,last_error,created_at')
        .in('status', ['failed', 'unavailable'])
        .order('created_at', { ascending: false })
        .limit(50),
      db
        .from('message_reports')
        .select('id,status,reason,reporter_kind,created_at,business_id,messages(id,body,sender_kind,sender_id,sender_name,conversation_id,hidden,created_at)')
        .order('created_at', { ascending: false })
        .limit(100),
      db.from('feature_flags').select('*').order('created_at'),
      db.from('business_features').select('business_id,flag_key,enabled'),
      db.from('announcements').select('*').order('created_at', { ascending: false }).limit(30),
      db.from('activity_log').select('id,user_id,business_id,action,details,ip_hash,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(2000),
      db.from('messages').select('sender_id').eq('flagged', true).gte('created_at', since).limit(1000),
      db.from('conversations').select('id,business_id,last_message_at').eq('kind', 'support').order('last_message_at', { ascending: false }).limit(100),
      db.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', since),
      db
        .from('support_tickets')
        .select('id,case_number,business_id,user_id,contact_email,subject,category,priority,status,assigned_to,last_reply_by,created_at,updated_at')
        .order('updated_at', { ascending: false })
        .limit(500),
      db.from('waitlist').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ]);
    if (businesses.error || stats.error || audit.error || accounts.error || notifications.error)
      throw businesses.error || stats.error || audit.error || accounts.error || notifications.error;
    const users = accounts.data.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      confirmed: !!u.email_confirmed_at,
      last_sign_in_at: u.last_sign_in_at,
      banned_until: (u as { banned_until?: string }).banned_until || null,
    }));
    const byEmail = new Map(users.map((u) => [u.email?.toLowerCase(), u.id]));
    const rows = (activity.data || []).map((r) => ({
      ...r,
      user_id: r.user_id || (r.action === 'auth.login_failed' ? byEmail.get(String((r.details as { email?: string })?.email || '')) || null : null),
    }));
    const flaggedBy = new Map<string, number>();
    for (const m of flaggedMessages.data || []) if (m.sender_id) flaggedBy.set(m.sender_id, (flaggedBy.get(m.sender_id) || 0) + 1);
    const lastActivity = new Map<string, string>();
    for (const r of rows) if (r.user_id && !lastActivity.has(r.user_id)) lastActivity.set(r.user_id, r.created_at);
    return json({
      businesses: businesses.data,
      bookingCount: stats.count,
      messageCount: messageCount.count || 0,
      audit: audit.data,
      accounts: users.map((u) => ({ ...u, last_activity_at: lastActivity.get(u.id) || null })),
      notifications: notifications.data,
      reports: reports.data || [],
      flags: flags.data || [],
      overrides: overrides.data || [],
      announcements: announcements.data || [],
      activity: rows.slice(0, 200),
      risks: scoreUsers(rows, users, flaggedBy),
      waitlistNew: waitlistNew.count || 0,
      support: support.data || [],
      tickets: tickets.data || [],
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { user } = await requireAdmin(),
      db = supabaseAdmin(),
      input = await body(request);
    let result: unknown = { ok: true };
    const audit = (action: string, business_id: string | null, details: Record<string, unknown> = {}) =>
      db.from('admin_audit_logs').insert({ actor_id: user.id, business_id, action, details });
    void logActivity(request, { user_id: user.id, action: `admin.${String(input.action).slice(0, 40)}` });
    switch (input.action) {
      case 'delete': {
        const v = z.object({ id: z.uuid(), confirm_name: z.string().min(2).max(100) }).parse(input);
        const { error } = await db.rpc('delete_business_server', { p_business: v.id, p_actor: user.id, p_name: v.confirm_name });
        if (error) throw error;
        break;
      }
      case 'create': {
        const b = businessSchema.parse(input);
        const demo = z.boolean().parse(input.is_demo);
        const { data, error } = await db.rpc('admin_create_business', {
          p_actor: user.id, p_name: b.name, p_slug: b.slug, p_email: b.email, p_timezone: b.timezone, p_locale: b.locale, p_demo: demo, p_plan: plan.parse(input.plan),
        });
        if (error) throw error;
        result = { id: data };
        break;
      }
      case 'access': {
        const v = z.object({ id: z.uuid(), status: z.enum(['active', 'suspended', 'archived']), plan }).parse(input);
        const { error } = await db.rpc('admin_update_business', { p_id: v.id, p_status: v.status, p_plan: v.plan, p_actor: user.id });
        if (error) throw error;
        break;
      }
      case 'reset':
      case 'convert':
      case 'extend': {
        const id = z.uuid().parse(input.id);
        if (input.action !== 'extend' && input.confirm !== true) throw new HttpError(400, 'CONFIRMATION_REQUIRED');
        const { error } = await db.rpc('admin_demo_action', { p_actor: user.id, p_business: id, p_action: input.action });
        if (error) throw error;
        break;
      }
      case 'invite-owner': {
        const v = z.object({ id: z.uuid(), email: z.email() }).parse(input),
          token = newToken();
        const { error } = await db.rpc('create_invitation_server', { p_business: v.id, p_email: v.email, p_role: 'owner', p_hash: hashToken(token), p_actor: user.id });
        if (error) throw error;
        result = { url: `${new URL(request.url).origin}/invite#token=${token}` };
        break;
      }
      case 'support': {
        const v = z.object({ id: z.uuid(), start: z.boolean() }).parse(input);
        const { error } = await db.rpc('admin_support_session', { p_actor: user.id, p_business: v.id, p_start: v.start });
        if (error) throw error;
        break;
      }
      case 'edit-business': {
        const v = z
          .object({
            id: z.uuid(),
            fields: z
              .object({
                name: line(2, 100),
                slug: z.string().regex(/^[a-z][a-z0-9-]{2,49}$/),
                email: z.email(),
                phone: z.string().max(30),
                industry: z.string().max(60),
                locale: z.enum(['de', 'en']),
                published: z.boolean(),
                min_notice_minutes: z.number().int().min(0).max(10080),
                max_advance_days: z.number().int().min(1).max(365),
                slot_interval: z.number().int().min(5).max(120),
                address: text(300),
                description: text(1000),
                timezone: z.string().max(60).refine((tz) => {
                  try {
                    new Intl.DateTimeFormat('en', { timeZone: tz });
                    return true;
                  } catch {
                    return false;
                  }
                }),
                currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'INR']),
                brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
                auto_confirm: z.boolean(),
                notifications_enabled: z.boolean(),
                cancellation_hours: z.number().int().min(0).max(720),
              })
              .partial(),
          })
          .parse(input);
        const { error } = await db.rpc('admin_edit_business', { p_actor: user.id, p_business: v.id, p_fields: v.fields });
        if (error) throw error;
        break;
      }
      case 'notes': {
        const v = z.object({ id: z.uuid(), notes: z.string().max(5000) }).parse(input);
        const { error } = await db.from('admin_business_notes').upsert({ business_id: v.id, notes: v.notes, updated_by: user.id, updated_at: new Date().toISOString() });
        if (error) throw error;
        break;
      }
      case 'flag': {
        const v = z
          .object({
            key: z.string().regex(/^[a-z][a-z0-9_]{1,40}$/),
            name: z.string().min(2).max(80),
            description: z.string().max(500).default(''),
            stage: z.enum(['off', 'beta', 'all']),
          })
          .parse(input);
        const { error } = await db.from('feature_flags').upsert(v);
        if (error) throw error;
        await audit('feature.updated', null, v);
        break;
      }
      case 'flag-delete': {
        const key = z.string().regex(/^[a-z][a-z0-9_]{1,40}$/).parse(input.key);
        const { error } = await db.from('feature_flags').delete().eq('key', key);
        if (error) throw error;
        await audit('feature.deleted', null, { key });
        break;
      }
      case 'override': {
        const v = z.object({ id: z.uuid(), key: z.string().max(41), enabled: z.boolean().nullable() }).parse(input);
        const { error } =
          v.enabled === null
            ? await db.from('business_features').delete().eq('business_id', v.id).eq('flag_key', v.key)
            : await db.from('business_features').upsert({ business_id: v.id, flag_key: v.key, enabled: v.enabled, updated_at: new Date().toISOString() });
        if (error) throw error;
        await audit('feature.override', v.id, { key: v.key, enabled: v.enabled });
        break;
      }
      case 'announce': {
        const v = z
          .object({
            business_id: z.uuid().nullable(),
            title: z.string().trim().min(2).max(120),
            body: z.string().max(2000).default(''),
            level: z.enum(['info', 'success', 'warning']),
            days: z.number().int().min(1).max(365).nullable(),
          })
          .parse(input);
        const { error } = await db.from('announcements').insert({
          business_id: v.business_id,
          title: v.title,
          body: v.body,
          level: v.level,
          created_by: user.id,
          expires_at: v.days ? new Date(Date.now() + v.days * 86400000).toISOString() : null,
        });
        if (error) throw error;
        await audit('announcement.created', v.business_id, { title: v.title });
        break;
      }
      case 'announce-delete': {
        const { error } = await db.from('announcements').delete().eq('id', z.uuid().parse(input.id));
        if (error) throw error;
        break;
      }
      case 'report': {
        const v = z.object({ id: z.uuid(), status: z.enum(['open', 'resolved', 'dismissed']) }).parse(input);
        const { error } = await db.from('message_reports').update({ status: v.status, resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', v.id);
        if (error) throw error;
        break;
      }
      case 'hide-message': {
        const v = z.object({ id: z.uuid(), hidden: z.boolean() }).parse(input);
        const { data, error } = await db.from('messages').update({ hidden: v.hidden }).eq('id', v.id).select('business_id').single();
        if (error) throw error;
        await audit(v.hidden ? 'message.hidden' : 'message.restored', data.business_id, { message: v.id });
        break;
      }
      case 'support-reply': {
        const v = z.object({ business_id: z.uuid(), text: text(4000).pipe(z.string().min(1)) }).parse(input);
        const conversation = await ensureConversation(db, v.business_id, 'support');
        result = { message: await postMessage(db, conversation, { kind: 'admin', id: user.id, name: 'Slotdove Support' }, v.text) };
        break;
      }
      case 'booking-status': {
        const v = z.object({ id: z.uuid(), status: z.enum(['confirmed', 'cancelled', 'completed', 'no_show']) }).parse(input);
        const { data, error } = await db.from('bookings').update({ status: v.status }).eq('id', v.id).select('business_id,booking_number').single();
        if (error) throw error;
        await audit('booking.status', data.business_id, { booking_number: data.booking_number, status: v.status });
        sendSoon(request);
        break;
      }
      case 'ticket-reply': {
        const v = z.object({ id: z.uuid(), text: z.string().trim().min(1).max(8000), internal: z.boolean().default(false), status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']).optional() }).parse(input);
        const { error } = await db.from('support_ticket_messages').insert({ ticket_id: v.id, author_kind: 'admin', author_id: user.id, author_name: 'Slotdove Support', body: v.text, internal: v.internal });
        if (error) throw error;
        if (!v.internal) notifyTicketReply(request, v.id);
        const now = new Date().toISOString();
        const status = v.status || (v.internal ? undefined : 'waiting');
        await db
          .from('support_tickets')
          .update({ updated_at: now, ...(v.internal ? {} : { last_reply_by: 'admin' }), ...(status ? { status, closed_at: ['resolved', 'closed'].includes(status) ? now : null } : {}), assigned_to: user.id })
          .eq('id', v.id);
        break;
      }
      case 'ticket-update': {
        const v = z
          .object({
            id: z.uuid(),
            status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']).optional(),
            priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
            category: z.enum(['question', 'bug', 'billing', 'account', 'security', 'feature', 'other']).optional(),
          })
          .parse(input);
        const now = new Date().toISOString();
        const { id, ...patch } = v;
        const { error } = await db
          .from('support_tickets')
          .update({ ...patch, updated_at: now, ...(patch.status ? { closed_at: ['resolved', 'closed'].includes(patch.status) ? now : null } : {}) })
          .eq('id', id);
        if (error) throw error;
        if (patch.status)
          await db.from('support_ticket_messages').insert({ ticket_id: id, author_kind: 'system', author_name: 'System', body: `Status: ${patch.status}`, internal: true });
        break;
      }
      case 'ticket-create': {
        const v = z.object({ business_id: z.uuid(), subject: z.string().trim().min(3).max(160), text: z.string().trim().min(1).max(8000), priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal') }).parse(input);
        const { data: ticket, error } = await db.from('support_tickets').insert({ business_id: v.business_id, subject: v.subject, priority: v.priority, status: 'waiting', last_reply_by: 'admin', assigned_to: user.id }).select().single();
        if (error) throw error;
        await db.from('support_ticket_messages').insert({ ticket_id: ticket.id, author_kind: 'admin', author_id: user.id, author_name: 'Slotdove Support', body: v.text });
        result = { ticket };
        break;
      }
      case 'ticket-suggest': {
        const id = z.uuid().parse(input.id);
        const [{ data: ticket }, { data: messages }] = await Promise.all([
          db.from('support_tickets').select('case_number,subject,category,businesses(name)').eq('id', id).single(),
          db.from('support_ticket_messages').select('author_kind,body,internal').eq('ticket_id', id).order('created_at').limit(30),
        ]);
        if (!ticket) throw new HttpError(404, 'NOT_FOUND');
        const reply = await groqChat({
          temperature: 0.4,
          reasoning: 'low',
          messages: [
            {
              role: 'system',
              content:
                'Du bist Support-Mitarbeiter von Slotdove, einer Terminbuchungs-App für kleine Unternehmen (Kalender, Online-Buchungsseite, Wochenplan, Feiertage, Chat, Erinnerungen, Tarife Starter 5 €, Pro 15 €, Business 25 €). Schreibe eine freundliche, konkrete, kurze Antwort auf Deutsch in der Du-Form, mit Schritt-für-Schritt-Anleitung falls passend. Versprich nichts, was du nicht weißt. Keine Signatur-Platzhalter.',
            },
            {
              role: 'user',
              content: `Fall ${ticket.case_number} – ${ticket.subject} (Kategorie ${ticket.category})\n\n${(messages || [])
                .filter((m) => !m.internal)
                .map((m) => `${m.author_kind === 'admin' ? 'Support' : 'Kunde'}: ${m.body}`)
                .join('\n\n')}\n\nSchreibe die nächste Antwort des Supports.`,
            },
          ],
        });
        result = { suggestion: reply.content || '' };
        break;
      }
      case 'waitlist-update': {
        const v = z
          .object({
            id: z.uuid(),
            status: z.enum(['new', 'contacted', 'approved', 'demo', 'customer', 'declined']).optional(),
            plan_interest: z.enum(['free', 'pro', 'business', 'unsure']).optional(),
            admin_notes: text(4000).optional(),
          })
          .parse(input);
        const { id, ...patch } = v;
        const { error } = await db
          .from('waitlist')
          .update({ ...patch, updated_at: new Date().toISOString(), ...(patch.status === 'contacted' ? { contacted_at: new Date().toISOString() } : {}) })
          .eq('id', id);
        if (error) throw error;
        break;
      }
      case 'waitlist-delete': {
        const { error } = await db.from('waitlist').delete().eq('id', z.uuid().parse(input.id));
        if (error) throw error;
        await audit('waitlist.deleted', null, { id: input.id });
        break;
      }
      case 'waitlist-email': {
        const v = z.object({ id: z.uuid(), subject: line(2, 140), message: text(5000).pipe(z.string().min(5)) }).parse(input);
        const { data: lead } = await db.from('waitlist').select('email,locale,status').eq('id', v.id).single();
        if (!lead) throw new HttpError(404, 'NOT_FOUND');
        if (!emailConfigured()) throw new HttpError(400, 'EMAIL_NOT_CONFIGURED');
        await sendEmail({ ...noticeEmail({ locale: lead.locale, title: v.subject, lines: v.message.split(/\n+/) }), to: lead.email, idempotencyKey: `wl-${v.id}-${Date.now()}` });
        await db.from('waitlist').update({ status: lead.status === 'new' ? 'contacted' : lead.status, contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', v.id);
        await audit('waitlist.emailed', null, { id: v.id });
        break;
      }
      case 'waitlist-approve': {
        // Approves a pre-registration: personal sign-up link (token stored only as hash), valid 14 days.
        const v = z.object({ id: z.uuid(), days: z.number().int().min(1).max(60).default(14) }).parse(input);
        const { data: lead } = await db.from('waitlist').select('id,email,locale,contact_name,company').eq('id', v.id).single();
        if (!lead) throw new HttpError(404, 'NOT_FOUND');
        const token = newToken();
        const expires = new Date(Date.now() + v.days * 86400000).toISOString();
        const { error } = await db
          .from('waitlist')
          .update({ status: 'approved', invite_hash: hashToken(token), invite_expires_at: expires, approved_at: new Date().toISOString(), contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', v.id);
        if (error) throw error;
        const origin = process.env.NEXT_PUBLIC_SITE_URL?.startsWith('http') ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '') : new URL(request.url).origin;
        const url = `${origin}/signup#invite=${token}`;
        let emailed = false;
        let emailError: string | null = emailConfigured() ? null : 'NOT_CONFIGURED';
        if (emailConfigured()) {
          const de = lead.locale !== 'en';
          const until = new Intl.DateTimeFormat(de ? 'de' : 'en', { dateStyle: 'long' }).format(new Date(expires));
          const r = await sendEmail({
            ...noticeEmail({
              locale: lead.locale,
              title: de ? 'Ihr Zugang zu Slotdove ist freigeschaltet' : 'Your Slotdove access is approved',
              lines: de
                ? [`Hallo ${lead.contact_name},`, `wir freuen uns: Ihre Voranmeldung für ${lead.company} ist bestätigt. Über den Button unten erstellen Sie Ihr Konto – bitte mit genau dieser E-Mail-Adresse.`, 'Slotdove ist in der Startphase komplett kostenlos – kein Abo, keine Zahlungsdaten, keine automatische Verlängerung.', `Der Link ist persönlich und gilt bis ${until}. Bitte nicht weitergeben.`]
                : [`Hello ${lead.contact_name},`, `your pre-registration for ${lead.company} is approved. Create your account with the button below – please use this exact email address.`, 'Slotdove is completely free during the launch phase – no subscription, no payment details.', `The link is personal and valid until ${until}.`],
              cta: { label: de ? 'Konto erstellen' : 'Create account', url },
            }),
            to: lead.email,
            idempotencyKey: `wl-approve-${v.id}-${expires.slice(0, 13)}`,
          }).catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : '';
            emailError = /verify a domain|own email address/i.test(msg) ? 'DOMAIN_NOT_VERIFIED' : /sender/i.test(msg) ? 'SENDER_NOT_VERIFIED' : msg.slice(0, 120) || 'SEND_FAILED';
            return { state: 'failed' as const };
          });
          emailed = r.state === 'accepted';
        }
        await audit('waitlist.approved', null, { id: v.id, emailed, emailError });
        result = { ok: true, url, emailed, emailError };
        break;
      }
      case 'waitlist-demo': {
        // Starts a 14-day demo: invite by email, or activate the plan if the lead already registered.
        const v = z.object({ id: z.uuid(), plan, days: z.number().int().min(1).max(90).default(14) }).parse(input);
        const { data: lead } = await db.from('waitlist').select('*').eq('id', v.id).single();
        if (!lead) throw new HttpError(404, 'NOT_FOUND');
        const until = new Date(Date.now() + v.days * 86400000).toISOString();
        const origin = process.env.NEXT_PUBLIC_SITE_URL?.startsWith('http') ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '') : new URL(request.url).origin;
        let activated = false;
        const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const account = list?.users.find((u) => u.email?.toLowerCase() === lead.email);
        if (account) {
          const { data: owned } = await db.from('businesses').select('id,status').eq('owner_id', account.id).limit(1).maybeSingle();
          if (owned) {
            const { error } = await db.rpc('admin_update_business', { p_id: owned.id, p_status: 'active', p_plan: v.plan, p_actor: user.id });
            if (error) throw error;
            activated = true;
          }
        }
        if (emailConfigured()) {
          const de = lead.locale === 'de';
          const planName = { free: 'Starter', pro: 'Pro', business: 'Business' }[v.plan];
          await sendEmail({
            ...noticeEmail({
              locale: lead.locale,
              title: de ? `Ihr kostenloser Slotdove-Test (${planName}, ${v.days} Tage)` : `Your free Slotdove trial (${planName}, ${v.days} days)`,
              lines: de
                ? [`Hallo ${lead.contact_name},`, activated ? `Ihr Konto für ${lead.company} ist jetzt für ${v.days} Tage im Tarif ${planName} freigeschaltet – kostenlos und unverbindlich.` : `Ihr Testzugang für ${lead.company} ist bereit: ${v.days} Tage Slotdove im Tarif ${planName}, kostenlos und unverbindlich. Registrieren Sie sich bitte mit dieser E-Mail-Adresse – wir schalten Ihren Tarif dann sofort frei.`, 'Die Testphase endet automatisch. Bei Fragen antworten Sie einfach auf diese E-Mail.']
                : [`Hello ${lead.contact_name},`, activated ? `Your account for ${lead.company} is now on the ${planName} plan for ${v.days} days – free of charge.` : `Your trial for ${lead.company} is ready: ${v.days} days of Slotdove ${planName}, free. Please sign up with this email address and we will unlock your plan right away.`, 'The trial ends automatically. Questions? Just reply.'],
              cta: { label: activated ? (de ? 'Zu Slotdove' : 'Open Slotdove') : de ? 'Jetzt registrieren' : 'Sign up now', url: `${origin}${activated ? '/dashboard' : '/signup'}` },
            }),
            to: lead.email,
            idempotencyKey: `wl-demo-${v.id}-${until.slice(0, 10)}`,
          });
        }
        await db.from('waitlist').update({ status: 'demo', plan_interest: v.plan, demo_until: until, contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', v.id);
        await audit('waitlist.demo', null, { id: v.id, plan: v.plan, days: v.days, activated });
        result = { ok: true, activated, emailed: emailConfigured() };
        break;
      }
      case 'email-test': {
        const to = z.email().parse(input.to || user.email);
        if (!emailConfigured()) throw new HttpError(400, 'EMAIL_NOT_CONFIGURED');
        try {
          const r = await sendEmail({
            ...noticeEmail({ locale: 'de', title: 'Slotdove Test-E-Mail ✅', lines: ['Wenn du diese E-Mail liest, funktioniert der Versand über Resend.', `Absender: ${normalizeFrom(process.env.EMAIL_FROM)}`] }),
            to,
            idempotencyKey: `test-${Date.now()}`,
          });
          result = { ok: true, id: r.state === 'accepted' ? r.id : null };
        } catch (e) {
          result = { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : 'failed' };
        }
        break;
      }
      case 'email-retry': {
        await db.from('notification_jobs').update({ status: 'queued', attempts: 0, scheduled_at: new Date().toISOString(), last_error: null }).in('status', ['failed', 'unavailable']);
        result = await processQueue(20);
        break;
      }
      case 'ban': {
        const v = z.object({ user_id: z.uuid(), hours: z.number().int().min(0).max(876000) }).parse(input);
        if (v.user_id === user.id) throw new HttpError(400, 'INVALID_INPUT');
        const { error } = await db.auth.admin.updateUserById(v.user_id, { ban_duration: v.hours ? `${v.hours}h` : 'none' });
        if (error) throw error;
        await audit(v.hours ? 'user.banned' : 'user.unbanned', null, { user_id: v.user_id, hours: v.hours });
        break;
      }
      default:
        throw new HttpError(400, 'INVALID_INPUT');
    }
    return json(result);
  } catch (e) {
    return failure(e);
  }
}
