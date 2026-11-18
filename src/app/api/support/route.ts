import { z } from 'zod';
import { body, failure, HttpError, json, rateLimit, requireBusiness, sameOrigin } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';
import { moderate } from '@/lib/ai/moderation';
/** Support desk for businesses: open cases with a case number, reply, close. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const businessId = z.uuid().parse(url.searchParams.get('business'));
    await requireBusiness(businessId, false);
    const db = supabaseAdmin();
    const ticketId = url.searchParams.get('ticket');
    if (ticketId) {
      const { data: ticket } = await db.from('support_tickets').select('*').eq('id', z.uuid().parse(ticketId)).eq('business_id', businessId).maybeSingle();
      if (!ticket) throw new HttpError(404, 'NOT_FOUND');
      const { data: messages, error } = await db
        .from('support_ticket_messages')
        .select('id,author_kind,author_name,body,created_at')
        .eq('ticket_id', ticket.id)
        .eq('internal', false)
        .order('created_at');
      if (error) throw error;
      return json({ ticket, messages });
    }
    const { data, error } = await db
      .from('support_tickets')
      .select('id,case_number,subject,category,priority,status,last_reply_by,created_at,updated_at')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return json({ tickets: data });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = z
      .object({
        business: z.uuid(),
        action: z.enum(['create', 'reply', 'close', 'reopen']),
        ticket: z.uuid().optional(),
        subject: z.string().trim().min(3).max(160).optional(),
        category: z.enum(['question', 'bug', 'billing', 'account', 'security', 'feature', 'other']).default('question'),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
        text: z.string().trim().min(1).max(8000).optional(),
      })
      .parse(await body(request));
    const { user } = await requireBusiness(input.business, false);
    await rateLimit(request, `support:${user.id}`, 40);
    const db = supabaseAdmin();
    const name = (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'Kunde';
    if (input.action === 'create') {
      if (!input.subject || !input.text) throw new HttpError(400, 'INVALID_INPUT');
      // Security reports are always urgent.
      const priority = input.category === 'security' ? 'urgent' : input.priority;
      const { data: ticket, error } = await db
        .from('support_tickets')
        .insert({ business_id: input.business, user_id: user.id, contact_email: user.email || '', subject: input.subject, category: input.category, priority })
        .select()
        .single();
      if (error) throw error;
      await db.from('support_ticket_messages').insert({ ticket_id: ticket.id, author_kind: 'user', author_id: user.id, author_name: name, body: input.text });
      const verdict = moderate(`${input.subject} ${input.text}`);
      if (verdict.flagged)
        await db.from('support_ticket_messages').insert({ ticket_id: ticket.id, author_kind: 'system', author_name: 'KI', body: `Automatischer Hinweis: ${verdict.reasons.join(', ')}`, internal: true });
      void logActivity(request, { user_id: user.id, business_id: input.business, action: 'support.ticket', details: { case_number: ticket.case_number } });
      return json({ ticket }, 201);
    }
    const ticketId = z.uuid().parse(input.ticket);
    const { data: ticket } = await db.from('support_tickets').select('*').eq('id', ticketId).eq('business_id', input.business).maybeSingle();
    if (!ticket) throw new HttpError(404, 'NOT_FOUND');
    const now = new Date().toISOString();
    if (input.action === 'reply') {
      if (!input.text) throw new HttpError(400, 'INVALID_INPUT');
      const { error } = await db.from('support_ticket_messages').insert({ ticket_id: ticket.id, author_kind: 'user', author_id: user.id, author_name: name, body: input.text });
      if (error) throw error;
      await db
        .from('support_tickets')
        .update({ last_reply_by: 'user', updated_at: now, status: ['resolved', 'closed', 'waiting'].includes(ticket.status) ? 'open' : ticket.status, closed_at: null })
        .eq('id', ticket.id);
    } else {
      await db
        .from('support_tickets')
        .update({ status: input.action === 'close' ? 'closed' : 'open', updated_at: now, closed_at: input.action === 'close' ? now : null })
        .eq('id', ticket.id);
      await db.from('support_ticket_messages').insert({ ticket_id: ticket.id, author_kind: 'system', author_name: 'System', body: input.action === 'close' ? `Fall von ${name} geschlossen.` : `Fall von ${name} wieder geöffnet.` });
    }
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
