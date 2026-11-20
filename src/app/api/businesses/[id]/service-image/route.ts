import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { failure, HttpError, json, requireBusiness, sameOrigin, softRateLimit } from '@/lib/http';
import { readImage } from '@/lib/upload';
type Ctx = { params: Promise<{ id: string }> };
const bucket = 'business-logos';
async function service(db: Awaited<ReturnType<typeof requireBusiness>>['db'], id: string, request: Request) {
  const sid = z.uuid().parse(new URL(request.url).searchParams.get('service'));
  const { data, error } = await db.from('services').select('id,image_path').eq('business_id', id).eq('id', sid).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'NOT_FOUND');
  return data as { id: string; image_path: string | null };
}
export async function POST(request: Request, { params }: Ctx) {
  try {
    sameOrigin(request);
    const id = z.uuid().parse((await params).id);
    const { db } = await requireBusiness(id);
    await softRateLimit(request, `service-image:${id}`, 30);
    const s = await service(db, id, request);
    const { bytes, mime, ext } = await readImage(request);
    const path = `${id}/services/${randomUUID()}.${ext}`;
    const { error } = await db.storage.from(bucket).upload(path, bytes, { contentType: mime, upsert: false, cacheControl: '3600' });
    if (error) throw error;
    const { error: update } = await db.from('services').update({ image_path: path }).eq('id', s.id).eq('business_id', id);
    if (update) {
      await db.storage.from(bucket).remove([path]);
      throw update;
    }
    if (s.image_path) await db.storage.from(bucket).remove([s.image_path]);
    return json({ path });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request, { params }: Ctx) {
  try {
    sameOrigin(request);
    const id = z.uuid().parse((await params).id);
    const { db } = await requireBusiness(id);
    const s = await service(db, id, request);
    const { error } = await db.from('services').update({ image_path: null }).eq('id', s.id).eq('business_id', id);
    if (error) throw error;
    if (s.image_path) await db.storage.from(bucket).remove([s.image_path]);
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
