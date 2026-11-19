import { z } from 'zod';
/** Removes control characters, zero-width/bidi tricks and stray markup from user text.
 * React escapes output already; this keeps stored data clean for emails, CSV and admins. */
export function cleanText(value: string, multiline = false) {
  let s = value.normalize('NFC');
  // Bidi overrides and zero-width characters are used to disguise text.
  s = s.replace(/[​-‏‪-‮⁠-⁤﻿]/g, '');
  s = multiline ? s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') : s.replace(/[\u0000-\u001F\u007F]/g, ' ');
  // No HTML tags in plain-text fields.
  s = s.replace(/<\/?[a-z][^>]*>/gi, '');
  if (!multiline) s = s.replace(/\s+/g, ' ');
  else s = s.replace(/\r\n?/g, '\n').replace(/\n{4,}/g, '\n\n\n');
  return s.trim();
}
export const line = (min: number, max: number) => z.string().transform((v) => cleanText(v)).pipe(z.string().min(min).max(max));
export const text = (max: number) => z.string().transform((v) => cleanText(v, true)).pipe(z.string().max(max));
export const email = () =>
  z
    .string()
    .transform((v) => cleanText(v).toLowerCase())
    .pipe(z.email().max(254));
export const phone = () =>
  z
    .string()
    .transform((v) => cleanText(v))
    .pipe(z.string().max(30).regex(/^[0-9+()/ .-]*$/, 'INVALID_PHONE'));
