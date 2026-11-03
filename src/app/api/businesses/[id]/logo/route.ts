import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { failure, HttpError, json, requireBusiness, sameOrigin } from '@/lib/http';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request);
    const id = z.uuid().parse((await params).id);
    const { db } = await requireBusiness(id);
    if (!request.body) throw new HttpError(400, 'INVALID_INPUT');
    const reader = request.body.getReader(),
      chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2200000) {
        await reader.cancel();
        throw new HttpError(413, 'FILE_TOO_LARGE');
      }
      chunks.push(value);
    }
    const copy = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: Buffer.concat(chunks),
    });
    const data = await copy.formData(),
      file = data.get('file');
    if (!(file instanceof File) || file.size > 2097152) throw new HttpError(400, 'INVALID_FILE');
    const bytes = Buffer.from(await file.arrayBuffer());
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
      webp =
        bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : webp ? 'image/webp' : null;
    if (!mime || mime !== file.type) throw new HttpError(400, 'INVALID_FILE');
    const ext = png ? 'png' : jpeg ? 'jpg' : 'webp',
      path = `${id}/${randomUUID()}.${ext}`;
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
