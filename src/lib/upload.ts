import 'server-only';
import { HttpError } from './http';

/** Reads a multipart image upload with a hard streaming size cap and magic-byte type check.
 * Only PNG, JPEG and WebP are accepted (no SVG: it can carry scripts). */
export async function readImage(request: Request, maxBytes = 2097152) {
  if (!request.body) throw new HttpError(400, 'INVALID_INPUT');
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes + 100000) {
      await reader.cancel();
      throw new HttpError(413, 'FILE_TOO_LARGE');
    }
    chunks.push(value);
  }
  const copy = new Request(request.url, { method: 'POST', headers: request.headers, body: Buffer.concat(chunks) });
  const file = (await copy.formData()).get('file');
  if (!(file instanceof File) || file.size > maxBytes) throw new HttpError(400, 'INVALID_FILE');
  const bytes = Buffer.from(await file.arrayBuffer());
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : webp ? 'image/webp' : null;
  if (!mime || mime !== file.type) throw new HttpError(400, 'INVALID_FILE');
  return { bytes, mime, ext: png ? 'png' : jpeg ? 'jpg' : 'webp' };
}
