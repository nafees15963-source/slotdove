import { z } from 'zod';
import { businessSchema } from '@/lib/validation';
import {
  body,
  failure,
  hashToken,
  json,
  newToken,
  requireAdmin,
  sameOrigin,
  HttpError,
} from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
export async function GET() {
  try {
    await requireAdmin();
    const db = supabaseAdmin();
    const [businesses, stats, audit, accounts, notifications] = await Promise.all([
      db
        .from('businesses')
        .select(
          'id,name,slug,email,status,is_demo,demo_expires_at,created_at,published,business_entitlements(plan_id)',
        )
        .order('created_at', { ascending: false })
        .limit(100),
      db.from('bookings').select('id', { count: 'exact', head: true }),
      db
        .from('admin_audit_logs')
        .select('id,action,business_id,created_at')
        .order('created_at', { ascending: false })
        .limit(30),
      db.auth.admin.listUsers({ page: 1, perPage: 100 }),
      db
        .from('notification_jobs')
        .select('id,business_id,kind,status,last_error,created_at')
        .in('status', ['failed', 'unavailable'])
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    if (businesses.error || stats.error || audit.error || accounts.error || notifications.error)
      throw businesses.error || stats.error || audit.error || accounts.error || notifications.error;
    return json({
      businesses: businesses.data,
      bookingCount: stats.count,
      audit: audit.data,
      accounts: accounts.data.users.map((u) => ({
        id: u.id,
        email: u.email,
        confirmed: !!u.email_confirmed_at,
        last_sign_in_at: u.last_sign_in_at,
      })),
      notifications: notifications.data,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { user } = await requireAdmin(),
      db = supabaseAdmin(),
      input = await body(request);
    let result: unknown;
    if (input.action === 'delete') {
      const v = z.object({ id: z.uuid(), confirm_name: z.string().min(2).max(100) }).parse(input);
      const { error } = await db.rpc('delete_business_server', {
        p_business: v.id,
        p_actor: user.id,
        p_name: v.confirm_name,
      });
      if (error) throw error;
      result = { ok: true };
    } else if (input.action === 'create') {
      const b = businessSchema.parse(input);
      const demo = z.boolean().parse(input.is_demo),
        plan = z.enum(['free', 'pro', 'business']).parse(input.plan);
      const { data, error } = await db.rpc('admin_create_business', {
        p_actor: user.id,
        p_name: b.name,
        p_slug: b.slug,
        p_email: b.email,
        p_timezone: b.timezone,
        p_locale: b.locale,
        p_demo: demo,
        p_plan: plan,
      });
      if (error) throw error;
      result = { id: data };
    } else if (input.action === 'access') {
      const v = z
        .object({
          id: z.uuid(),
          status: z.enum(['active', 'suspended', 'archived']),
          plan: z.enum(['free', 'pro', 'business']),
        })
        .parse(input);
      const { error } = await db.rpc('admin_update_business', {
        p_id: v.id,
        p_status: v.status,
        p_plan: v.plan,
        p_actor: user.id,
      });
      if (error) throw error;
      result = { ok: true };
    } else if (['reset', 'convert', 'extend'].includes(input.action)) {
      const id = z.uuid().parse(input.id);
      if (['reset', 'convert'].includes(input.action) && input.confirm !== true)
        throw new HttpError(400, 'CONFIRMATION_REQUIRED');
      const { error } = await db.rpc('admin_demo_action', {
        p_actor: user.id,
        p_business: id,
        p_action: input.action,
      });
      if (error) throw error;
      result = { ok: true };
    } else if (input.action === 'invite-owner') {
      const v = z.object({ id: z.uuid(), email: z.email() }).parse(input),
        token = newToken();
      const { error } = await db.rpc('create_invitation_server', {
        p_business: v.id,
        p_email: v.email,
        p_role: 'owner',
        p_hash: hashToken(token),
        p_actor: user.id,
      });
      if (error) throw error;
      result = { url: `${new URL(request.url).origin}/invite#token=${token}` };
    } else throw new HttpError(400, 'INVALID_INPUT');
    return json(result);
  } catch (e) {
    return failure(e);
  }
}
