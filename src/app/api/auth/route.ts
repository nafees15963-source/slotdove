import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { body, failure, HttpError, json, sameOrigin } from '@/lib/http';
const schema = z.object({
  action: z.enum(['login', 'signup', 'reset', 'update', 'logout']),
  email: z.email().optional(),
  password: z.string().min(12).max(128).optional(),
  name: z.string().min(2).max(100).optional(),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = schema.parse(await body(request));
    const db = await supabaseServer();
    const site = new URL(request.url).origin;
    if (input.action === 'logout') {
      const { error } = await db.auth.signOut();
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action === 'login') {
      if (!input.email || !input.password) throw new HttpError(400, 'INVALID_INPUT');
      const { error } = await db.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error) throw new HttpError(400, 'INVALID_CREDENTIALS');
      return json({ ok: true });
    }
    if (input.action === 'signup') {
      if (!input.email || !input.password) throw new HttpError(400, 'INVALID_INPUT');
      const { error } = await db.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: `${site}/auth/callback`,
          data: { display_name: input.name || '' },
        },
      });
      if (error) throw new HttpError(400, 'SIGNUP_FAILED');
      return json({ ok: true });
    }
    if (input.action === 'reset') {
      if (!input.email) throw new HttpError(400, 'INVALID_INPUT');
      const { error } = await db.auth.resetPasswordForEmail(input.email, {
        redirectTo: `${site}/auth/callback?next=/account/password`,
      });
      if (error) throw new HttpError(400, 'RESET_FAILED');
      return json({ ok: true });
    }
    if (input.action === 'update') {
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new HttpError(401, 'SIGN_IN_REQUIRED');
      if (!input.password) throw new HttpError(400, 'INVALID_INPUT');
      const { error } = await db.auth.updateUser({ password: input.password });
      if (error) throw new HttpError(400, 'UPDATE_FAILED');
      return json({ ok: true });
    }
  } catch (e) {
    return failure(e);
  }
}
