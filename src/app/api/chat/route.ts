import { z } from 'zod';
import { text } from '@/lib/sanitize';
import { body, failure, HttpError, json, requireBusiness, sameOrigin, softRateLimit } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ensureConversation, postMessage } from '@/lib/chat';
import { logActivity } from '@/lib/activity';
async function access(businessId: string, conversationId: string | null) {
  const ctx = await requireBusiness(businessId, false);
  const db = supabaseAdmin();
  if (!conversationId) return { ...ctx, admin: db, conversation: null };
  const { data: conversation } = await db.from('conversations').select('*').eq('id', conversationId).eq('business_id', businessId).maybeSingle();
  if (!conversation) throw new HttpError(404, 'NOT_FOUND');
  if (conversation.kind !== 'team' && ctx.role === 'staff') throw new HttpError(403, 'FORBIDDEN');
  return { ...ctx, admin: db, conversation };
}
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const businessId = z.uuid().parse(url.searchParams.get('business'));
    const conversationId = url.searchParams.get('conversation');
    const { admin, role, conversation } = await access(businessId, conversationId ? z.uuid().parse(conversationId) : null);
    if (conversation) {
      const { data, error } = await admin
        .from('messages')
        .select('id,sender_kind,sender_id,sender_name,body,hidden,created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return json({
        messages: (data || []).reverse().map((m) => (m.hidden ? { ...m, body: '' } : m)),
      });
    }
    await ensureConversation(admin, businessId, 'team');
    let query = admin
      .from('conversations')
      .select('id,kind,booking_id,customer_name,last_message_at')
      .eq('business_id', businessId)
      .order('last_message_at', { ascending: false })
      .limit(100);
    query = role === 'staff' ? query.eq('kind', 'team') : query.neq('kind', 'support');
    const { data, error } = await query;
    if (error) throw error;
    return json({ conversations: data });
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
        action: z.enum(['send', 'report', 'start-customer']).default('send'),
        conversation: z.uuid().optional(),
        booking: z.uuid().optional(),
        message: z.uuid().optional(),
        text: text(4000).pipe(z.string().min(1)).optional(),
        reason: z.string().max(500).default(''),
      })
      .parse(await body(request));
    await softRateLimit(request, `chat-${input.action}`, input.action === 'send' ? 60 : 20);
    const { admin, user, conversation, role } = await access(input.business, input.conversation || null);
    if (input.action === 'start-customer') {
      if (role === 'staff') throw new HttpError(403, 'FORBIDDEN');
      const bookingId = z.uuid().parse(input.booking);
      const { data: booking } = await admin.from('bookings').select('id,customer_name').eq('id', bookingId).eq('business_id', input.business).maybeSingle();
      if (!booking) throw new HttpError(404, 'NOT_FOUND');
      const { data: existing } = await admin.from('conversations').select('id').eq('booking_id', bookingId).maybeSingle();
      if (existing) return json(existing);
      const { data, error } = await admin
        .from('conversations')
        .insert({ business_id: input.business, kind: 'customer', booking_id: bookingId, customer_name: booking.customer_name })
        .select('id')
        .single();
      if (error) throw error;
      return json(data);
    }
    if (input.action === 'report') {
      const messageId = z.uuid().parse(input.message);
      const { data: msg } = await admin.from('messages').select('id,business_id').eq('id', messageId).eq('business_id', input.business).maybeSingle();
      if (!msg) throw new HttpError(404, 'NOT_FOUND');
      const { error } = await admin.from('message_reports').insert({
        message_id: messageId,
        business_id: input.business,
        reporter_kind: 'member',
        reporter_id: user.id,
        reason: input.reason,
      });
      if (error) throw error;
      await admin.from('messages').update({ flagged: true }).eq('id', messageId);
      void logActivity(request, { user_id: user.id, business_id: input.business, action: 'chat.report', details: { message: messageId } });
      return json({ ok: true });
    }
    if (!conversation || !input.text) throw new HttpError(400, 'INVALID_INPUT');
    const { data: profile } = await admin.from('profiles').select('name').eq('id', user.id).maybeSingle();
    const msg = await postMessage(admin, conversation, { kind: 'member', id: user.id, name: profile?.name || user.email?.split('@')[0] || 'Team' }, input.text);
    void logActivity(request, { user_id: user.id, business_id: input.business, action: 'chat.send', details: { conversation: conversation.id, flagged: msg.flagged } });
    return json({ message: msg });
  } catch (e) {
    return failure(e);
  }
}
