import 'server-only';
/** Minimal client for Groq's OpenAI-compatible chat API. The key stays on the server. */
export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };
export type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };
export type ToolSpec = { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } };
export const AI_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
export const AI_FALLBACK_MODEL = 'openai/gpt-oss-20b';
export function aiConfigured() {
  return !!process.env.GROQ_API_KEY;
}
export async function groqChat(input: { messages: ChatMessage[]; tools?: ToolSpec[]; temperature?: number; maxTokens?: number }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('AI_NOT_CONFIGURED');
  let lastError = '';
  for (const [attempt, model] of [AI_MODEL, AI_MODEL, AI_FALLBACK_MODEL].entries()) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: input.messages,
        tools: input.tools?.length ? input.tools : undefined,
        tool_choice: input.tools?.length ? 'auto' : undefined,
        temperature: input.temperature ?? 0.3,
        max_completion_tokens: input.maxTokens ?? 1000,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (response.ok) {
      const data = (await response.json()) as { choices: { message: { content: string | null; tool_calls?: ToolCall[] } }[] };
      return data.choices[0].message;
    }
    lastError = `${response.status}`;
    // Free tier: short per-minute limits. Wait briefly once if the API says so.
    const wait = Number(response.headers.get('retry-after') || 0);
    if (response.status === 429 && attempt === 0 && wait > 0 && wait <= 8) {
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (attempt === 0 && response.status !== 429) continue;
    // Rate limits or an unavailable model: try the smaller model once.
    if (![429, 404, 503, 500].includes(response.status)) break;
  }
  throw new Error(`AI_UNAVAILABLE:${lastError}`);
}
