import { z } from 'zod';
import { body, failure, HttpError, json, rateLimit, requireBusiness, sameOrigin } from '@/lib/http';
import { aiConfigured } from '@/lib/groq';
import { think } from '@/lib/ai/brain';
import { loadBrainData } from '@/lib/ai/load';
import { logActivity } from '@/lib/activity';
export const maxDuration = 60;
/** Server-side assistant (Groq). Data is read with the signed-in user's own
 * permissions, so staff only see what they may see. Falls back to the local
 * assistant in the browser when unavailable. */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = z
      .object({
        business: z.uuid(),
        locale: z.enum(['de', 'en']).default('de'),
        mode: z.enum(['chat', 'booking']).default('chat'),
        messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) })).min(1).max(20),
      })
      .parse(await body(request));
    if (!aiConfigured()) return json({ fallback: true, reason: 'not_configured' });
    const { db, user, role } = await requireBusiness(input.business, false);
    try {
      await rateLimit(request, `ai:${input.business}`, 60);
    } catch (e) {
      if (e instanceof HttpError && e.status === 429) throw e;
      // Without the server key the shared limiter is unavailable; the model provider still limits.
    }
    const data = await loadBrainData(db, input.business, role);
    if (!data) return json({ fallback: true, reason: 'disabled' });
    const question = input.messages.at(-1)?.content || '';
    void logActivity(request, { user_id: user.id, business_id: input.business, action: 'ai.ask', details: { question: question.slice(0, 200) } });
    try {
      const messages =
        input.mode === 'booking'
          ? [
              {
                role: 'user' as const,
                content: `Bereite diesen Termin mit prepare_appointment vor. Prüfe vorher mit find_free_slots, ob die Zeit frei ist. Bei unscharfen Angaben (z. B. "nächste Woche nachmittags", "irgendwann Freitag") wähle die beste freie Zeit. Erkenne bestehende Kunden mit customer_insights. Frage NICHT nach – lass Unbekanntes leer. Antworte danach in einem kurzen Satz, was du gewählt hast und warum. Eingabe: "${question.slice(0, 500)}"`,
              },
            ]
          : input.messages;
      const result = await think(data, messages, input.locale);
      return json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // Visible to platform admins in the activity log for diagnosis.
      void logActivity(request, { user_id: user.id, business_id: input.business, action: 'ai.error', details: { error: message.slice(0, 300) } });
      const code = /AI_UNAVAILABLE:(\d+)/.exec(message)?.[1] || (/abort|timeout/i.test(message) ? 'timeout' : 'error');
      return json({ fallback: true, reason: 'unavailable', code });
    }
  } catch (e) {
    return failure(e);
  }
}
