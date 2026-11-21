import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { body, failure, hashToken, HttpError, json, sameOrigin, softRateLimit } from '@/lib/http';
import { logActivity } from '@/lib/activity';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ipHash, isBlocked, LEGAL_VERSION, platformSetting } from '@/lib/trust';
import { alertAdmin } from '@/lib/mailer';
const schema = z.object({
  action: z.enum(['login', 'signup', 'reset', 'update', 'logout']),
  email: z.email().optional(),
  password: z.string().min(12).max(128).optional(),
  name: z.string().min(2).max(100).optional(),
  legal: z.boolean().optional(),
  invite: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
  portal: z.enum(['business', 'admin']).default('business'),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = schema.parse(await body(request));
    // Brute-force and spam protection per IP (and a global ceiling inside rateLimit).
    if (input.action === 'login') await softRateLimit(request, 'auth-login', 10);
    if (input.action === 'signup') await softRateLimit(request, 'auth-signup', 5);
    if (input.action === 'reset') await softRateLimit(request, 'auth-reset', 5);
    if (input.action === 'update') await softRateLimit(request, 'auth-update', 10);
    const db = await supabaseServer();
    const site = new URL(request.url).origin;
    if (input.action === 'logout') {
      const {
        data: { user: current },
      } = await db.auth.getUser();
      await logActivity(request, { user_id: current?.id, action: 'auth.logout' });
      const { error } = await db.auth.signOut();
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action === 'login') {
      if (!input.email || !input.password) throw new HttpError(400, 'INVALID_INPUT');
      const { data, error } = await db.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error) {
        await logActivity(request, { action: 'auth.login_failed', details: { email: input.email.toLowerCase() } });
        throw new HttpError(400, 'INVALID_CREDENTIALS');
      }
      // Two separate logins: admin accounts only via /admin/login, business accounts only via /login.
      const { data: isPlatformAdmin } = await db.rpc('my_platform_role');
      if (!!isPlatformAdmin !== (input.portal === 'admin')) {
        await db.auth.signOut();
        await logActivity(request, { user_id: data.user?.id, action: 'auth.wrong_portal', details: { portal: input.portal } });
        throw new HttpError(403, input.portal === 'admin' ? 'WRONG_PORTAL_BUSINESS' : 'WRONG_PORTAL_ADMIN');
      }
      await logActivity(request, { user_id: data.user?.id, action: input.portal === 'admin' ? 'auth.admin_login' : 'auth.login' });
      return json({ ok: true });
    }
    if (input.action === 'signup') {
      if (!input.email || !input.password) throw new HttpError(400, 'INVALID_INPUT');
      if (input.legal !== true) throw new HttpError(400, 'LEGAL_REQUIRED');
      if (!(await platformSetting('signups')).enabled) throw new HttpError(503, 'SIGNUPS_PAUSED');
      if (await isBlocked({ email: input.email, request })) throw new HttpError(403, 'BLOCKED');
      // Pre-registration phase: only people approved by the Slotdove team may create an account.
      let leadId: string | null = null;
      if ((await platformSetting('release')).invite_only) {
        // People invited into a team by a business may always create their account.
        const { data: teamInvite } = await supabaseAdmin()
          .from('business_invitations')
          .select('id')
          .eq('email', input.email.toLowerCase())
          .is('accepted_at', null)
          .is('revoked_at', null)
          .gt('expires_at', new Date().toISOString())
          .limit(1)
          .maybeSingle();
        if (!teamInvite && !input.invite) throw new HttpError(403, 'INVITE_REQUIRED');
      }
      if (input.invite && (await platformSetting('release')).invite_only) {
        const { data: lead } = await supabaseAdmin()
          .from('waitlist')
          .select('id,email,invite_expires_at')
          .eq('invite_hash', hashToken(input.invite))
          .maybeSingle();
        if (!lead || !lead.invite_expires_at || Date.parse(lead.invite_expires_at) < Date.now()) throw new HttpError(403, 'INVITE_INVALID');
        if (lead.email.toLowerCase() !== input.email.toLowerCase()) throw new HttpError(403, 'INVITE_EMAIL_MISMATCH');
        leadId = lead.id;
      }
      const { data: signed, error } = await db.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: `${site}/auth/callback`,
          data: { display_name: input.name || '' },
        },
      });
      if (error) throw new HttpError(400, 'SIGNUP_FAILED');
      if (signed.user && process.env.SUPABASE_SECRET_KEY) {
        // Proof of consent (Art. 7(1) GDPR, contract formation) with document version.
        const ip = ipHash(request);
        await supabaseAdmin()
          .from('legal_acceptances')
          .insert((['terms', 'privacy', 'dpa'] as const).map((document) => ({ user_id: signed.user!.id, document, version: LEGAL_VERSION, ip_hash: ip })));
      }
      if (leadId)
        await supabaseAdmin()
          .from('waitlist')
          .update({ status: 'customer', invite_hash: null, updated_at: new Date().toISOString() })
          .eq('id', leadId);
      if (signed.user) alertAdmin(request, 'Neue Registrierung', [input.email.toLowerCase(), leadId ? 'über bestätigte Voranmeldung' : 'über Team-Einladung'], `signup-${signed.user.id}`);
      await logActivity(request, { action: 'auth.signup', details: { email: input.email.toLowerCase() } });
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
      if (user.app_metadata?.must_change_password) {
        // The temporary password set by the business owner is gone now.
        await supabaseAdmin().auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, must_change_password: false } });
      }
      await logActivity(request, { user_id: user.id, action: 'auth.password_changed' });
      return json({ ok: true });
    }
  } catch (e) {
    return failure(e);
  }
}
