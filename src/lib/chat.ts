import 'server-only';
import { supabaseAdmin } from './supabase/admin';
import { moderate } from './ai/moderation';
type Db = ReturnType<typeof supabaseAdmin>;
export async function ensureConversation(db: Db, businessId: string, kind: 'team' | 'support') {
  const { data } = await db.from('conversations').select('*').eq('business_id', businessId).eq('kind', kind).maybeSingle();
  if (data) return data;
  const { data: created, error } = await db.from('conversations').insert({ business_id: businessId, kind }).select().single();
  if (error) {
    const { data: again } = await db.from('conversations').select('*').eq('business_id', businessId).eq('kind', kind).single();
    if (again) return again;
    throw error;
  }
  return created;
}
export async function postMessage(
  db: Db,
  conversation: { id: string; business_id: string },
  sender: { kind: 'member' | 'admin' | 'customer'; id: string | null; name: string },
  text: string,
) {
  const verdict = moderate(text);
  const { data, error } = await db
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      business_id: conversation.business_id,
      sender_kind: sender.kind,
      sender_id: sender.id,
      sender_name: sender.name.slice(0, 100),
      body: text,
      flagged: verdict.flagged,
      flag_reason: verdict.reasons.join(','),
    })
    .select()
    .single();
  if (error) throw error;
  await db.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);
  if (verdict.flagged)
    await db.from('message_reports').insert({
      message_id: data.id,
      business_id: conversation.business_id,
      reporter_kind: 'system',
      reason: `KI: ${verdict.reasons.join(', ')} (${verdict.score})`,
    });
  return data;
}
