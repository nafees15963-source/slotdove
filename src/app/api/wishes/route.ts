import { z } from 'zod';
import { body, failure, HttpError, json, requireUser, sameOrigin, softRateLimit } from '@/lib/http';
import { line, text } from '@/lib/sanitize';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hasSignedTerms } from '@/lib/trust';

/** Feature wishes: everyone sees the list and votes; creator identities stay private. */
export async function GET() {
  try {
    const { user } = await requireUser();
    const db = supabaseAdmin();
    const [{ data, error }, { data: mine }] = await Promise.all([
      db.from('feature_requests').select('id,title,description,status,admin_note,votes,created_at,created_by').neq('status', 'declined').order('votes', { ascending: false }).order('created_at', { ascending: false }).limit(200),
      db.from('feature_votes').select('request_id').eq('user_id', user.id),
    ]);
    if (error) throw error;
    const voted = new Set((mine || []).map((v) => v.request_id));
    return json({
      wishes: (data || []).map(({ created_by, ...w }) => ({ ...w, own: created_by === user.id, voted: voted.has(w.id) })),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { user } = await requireUser();
    if (!(await hasSignedTerms(user.id))) throw new HttpError(403, 'TERMS_REQUIRED');
    const input = await body(request);
    const db = supabaseAdmin();
    if (input.action === 'vote') {
      await softRateLimit(request, `wish-vote:${user.id}`, 60);
      const id = z.uuid().parse(input.id);
      const { data: existing } = await db.from('feature_votes').select('request_id').eq('request_id', id).eq('user_id', user.id).maybeSingle();
      if (existing) await db.from('feature_votes').delete().eq('request_id', id).eq('user_id', user.id);
      else {
        const { error } = await db.from('feature_votes').insert({ request_id: id, user_id: user.id });
        if (error) throw new HttpError(404, 'NOT_FOUND');
      }
      const { count } = await db.from('feature_votes').select('request_id', { count: 'exact', head: true }).eq('request_id', id);
      await db.from('feature_requests').update({ votes: count || 0 }).eq('id', id);
      return json({ voted: !existing, votes: count || 0 });
    }
    await softRateLimit(request, `wish-create:${user.id}`, 10);
    const v = z.object({ title: line(3, 120), description: text(2000).default(''), business_id: z.uuid().optional() }).parse(input);
    const { data, error } = await db.from('feature_requests').insert({ title: v.title, description: v.description, created_by: user.id, business_id: v.business_id || null, votes: 1 }).select('id').single();
    if (error) throw error;
    await db.from('feature_votes').insert({ request_id: data.id, user_id: user.id });
    return json({ id: data.id }, 201);
  } catch (e) {
    return failure(e);
  }
}
