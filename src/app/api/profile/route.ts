import { z } from 'zod';
import { body, failure, json, requireUser, sameOrigin } from '@/lib/http';
export async function GET() {
  try {
    const { db, user } = await requireUser();
    const { data, error } = await db
      .from('profiles')
      .select('name,locale')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    return json({ name: data?.name || '', locale: data?.locale || 'en', email: user.email });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { db, user } = await requireUser();
    const fields = z
      .object({ name: z.string().trim().min(2).max(100), locale: z.enum(['en', 'de']) })
      .parse(await body(request));
    const { error } = await db.from('profiles').upsert({ id: user.id, ...fields });
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
