import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { readImage } from '@/lib/upload';
import { failure, json, requireBusiness, sameOrigin } from '@/lib/http';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request);
    const id = z.uuid().parse((await params).id);
    const { db } = await requireBusiness(id);
    const { bytes, mime, ext } = await readImage(request);
    const path = `${id}/${randomUUID()}.${ext}`;
    const { error } = await db.storage
      .from('business-logos')
      .upload(path, bytes, { contentType: mime, upsert: false, cacheControl: '3600' });
    if (error) throw error;
    const { error: update } = await db.from('businesses').update({ logo_path: path }).eq('id', id);
    if (update) {
      await db.storage.from('business-logos').remove([path]);
      throw update;
    }
    return json({ path });
  } catch (e) {
    return failure(e);
  }
}
