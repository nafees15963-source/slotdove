import { businessSchema } from '@/lib/validation';
import { body, failure, json, requireUser, sameOrigin } from '@/lib/http';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { db, user } = await requireUser();
    const input = businessSchema.parse(await body(request));
    const { data, error } = await db
      .from('businesses')
      .insert({ ...input, owner_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return json(data, 201);
  } catch (e) {
    return failure(e);
  }
}
