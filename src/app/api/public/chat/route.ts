import { z } from 'zod';
import { body, failure, hashToken, HttpError, json, rateLimit, sameOrigin } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { postMessage } from '@/lib/chat';
/** Customer side of the appointment chat, authorized by the private booking link. */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = z
      .object({
        token: z.string().regex(/^[a-zA-Z0-9_-]{43}$/),
        action: z.enum(['list', 'send', 'report']),
        text: z.string().trim().min(1).max(2000).optional(),
        message: z.uuid().optional(),
      })
      .parse(await body(request));
    await rateLimit(request, 'public-chat', input.action === 'list' ? 120 : 30);
    const db = supabaseAdmin();
    const { data: view, error: viewError } = await db.rpc('manage_booking', { p_hash: hashToken(input.token), p_action: 'view' });
    if (viewError || !view) throw new HttpError(404, 'LINK_EXPIRED');
    const bookingId = (view as { id: string }).id;
    const { data: booking } = await db.from('bookings').select('id,business_id,customer_name').eq('id', bookingId).single();
    if (!booking) throw new HttpError(404, 'LINK_EXPIRED');
    let { data: conversation } = await db.from('conversations').select('*').eq('booking_id', booking.id).maybeSingle();
    if (input.action === 'list') {
      if (!conversation) return json({ messages: [] });
      const { data } = await db
        .from('messages')
        .select('id,sender_kind,sender_name,body,created_at')
        .eq('conversation_id', conversation.id)
        .eq('hidden', false)
        .order('created_at')
        .limit(200);
      return json({ messages: data || [] });
    }
    if (input.action === 'report') {
      const id = z.uuid().parse(input.message);
      if (!conversation) throw new HttpError(404, 'NOT_FOUND');
      const { data: msg } = await db.from('messages').select('id').eq('id', id).eq('conversation_id', conversation.id).maybeSingle();
      if (!msg) throw new HttpError(404, 'NOT_FOUND');
      await db.from('message_reports').insert({ message_id: id, business_id: booking.business_id, reporter_kind: 'customer', reason: 'Vom Kunden gemeldet' });
      await db.from('messages').update({ flagged: true }).eq('id', id);
      return json({ ok: true });
    }
    if (!input.text) throw new HttpError(400, 'INVALID_INPUT');
    if (!conversation) {
      const { data, error } = await db
        .from('conversations')
        .insert({ business_id: booking.business_id, kind: 'customer', booking_id: booking.id, customer_name: booking.customer_name })
        .select()
        .single();
      if (error) throw error;
      conversation = data;
    }
    const message = await postMessage(db, conversation!, { kind: 'customer', id: null, name: booking.customer_name }, input.text);
    return json({ message: { id: message.id, sender_kind: message.sender_kind, sender_name: message.sender_name, body: message.body, created_at: message.created_at } });
  } catch (e) {
    return failure(e);
  }
}
