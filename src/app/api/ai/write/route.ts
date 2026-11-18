import { z } from 'zod';
import { body, failure, HttpError, json, rateLimit, requireBusiness, sameOrigin } from '@/lib/http';
import { aiConfigured, groqChat } from '@/lib/groq';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { industryById } from '@/lib/industries';
export const maxDuration = 30;
/** Short writing helpers: service descriptions and chat reply drafts. */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = z
      .object({
        business: z.uuid(),
        locale: z.enum(['de', 'en']).default('de'),
        mode: z.enum(['service_description', 'chat_reply']),
        name: z.string().max(100).optional(),
        minutes: z.number().int().min(1).max(1440).optional(),
        price: z.string().max(30).optional(),
        conversation: z.uuid().optional(),
      })
      .parse(await body(request));
    if (!aiConfigured()) throw new HttpError(503, 'AI_NOT_CONFIGURED');
    const { db, role } = await requireBusiness(input.business, input.mode === 'service_description');
    try {
      await rateLimit(request, `ai-write:${input.business}`, 60);
    } catch (e) {
      if (e instanceof HttpError && e.status === 429) throw e;
    }
    const { data: business } = await db.from('businesses').select('name,industry').eq('id', input.business).single();
    if (!business) throw new HttpError(403, 'FORBIDDEN');
    const lang = input.locale === 'de' ? 'Deutsch, Du-Form' : 'English';
    let prompt = '';
    if (input.mode === 'service_description') {
      if (!input.name) throw new HttpError(400, 'INVALID_INPUT');
      prompt = `Schreibe eine kurze, einladende Beschreibung (max. 2 Sätze, 220 Zeichen, ${lang}) für die Leistung „${input.name}“ eines Unternehmens der Branche „${industryById(business.industry).de}“ namens „${business.name}“${input.minutes ? `, Dauer ${input.minutes} Minuten` : ''}${input.price ? `, Preis ${input.price}` : ''}. Sag konkret, was Kunden erwartet. Keine Emojis, keine Anführungszeichen, keine erfundenen Versprechen.`;
    } else {
      const conversationId = z.uuid().parse(input.conversation);
      const admin = supabaseAdmin();
      const { data: conversation } = await admin.from('conversations').select('id,kind,customer_name').eq('id', conversationId).eq('business_id', input.business).maybeSingle();
      if (!conversation || (conversation.kind !== 'team' && role === 'staff') || conversation.kind === 'support') throw new HttpError(404, 'NOT_FOUND');
      const { data: messages } = await admin
        .from('messages')
        .select('sender_kind,sender_name,body,hidden')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(15);
      const thread = (messages || [])
        .reverse()
        .filter((m) => !m.hidden)
        .map((m) => `${m.sender_kind === 'customer' ? 'Kunde' : m.sender_name || 'Team'}: ${m.body}`)
        .join('\n');
      prompt = `Du schreibst für „${business.name}“ die nächste Nachricht in einem ${conversation.kind === 'customer' ? `Chat mit dem Kunden ${conversation.customer_name}` : 'Team-Chat'}. Freundlich, kurz (max. 3 Sätze), ${lang}. Versprich keine Termine oder Preise, die nicht im Verlauf stehen. Nur den Nachrichtentext ausgeben.\n\nVerlauf:\n${thread || '(noch leer – schreibe eine freundliche Begrüßung)'}`;
    }
    const reply = await groqChat({ messages: [{ role: 'user', content: prompt }], temperature: 0.6, maxTokens: 800, reasoning: 'low' });
    const text = (reply.content || '').trim().replace(/^["„“]|["“”]$/g, '');
    return json({ text });
  } catch (e) {
    return failure(e);
  }
}
