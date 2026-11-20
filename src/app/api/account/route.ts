import { z } from 'zod';
import { body, failure, HttpError, json, requireUser, sameOrigin, softRateLimit } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';
import { trashAccount } from '@/lib/trash';

/** Art. 15 / 20 GDPR: everything we hold about the signed-in person, as JSON. */
export async function GET(request: Request) {
  try {
    const { user } = await requireUser();
    await softRateLimit(request, `account-export:${user.id}`, 10);
    const admin = supabaseAdmin();
    const [profile, memberships, owned, staff, acceptances, activity, tickets] = await Promise.all([
      admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      admin.from('business_members').select('business_id,role,created_at').eq('user_id', user.id),
      admin.from('businesses').select('id,name,slug,email,phone,address,created_at').eq('owner_id', user.id),
      admin.from('staff_profiles').select('id,business_id,name,active,created_at').eq('user_id', user.id),
      admin.from('legal_acceptances').select('document,version,accepted_at').eq('user_id', user.id),
      admin.from('activity_log').select('action,created_at,user_agent').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1000),
      admin.from('support_tickets').select('*').eq('user_id', user.id),
    ]);
    const data = {
      exported_at: new Date().toISOString(),
      note: 'Datenauskunft nach Art. 15 und Art. 20 DSGVO. Kundendaten deiner Betriebe exportierst du im Dashboard unter Kunden → Export.',
      account: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        metadata: user.user_metadata,
      },
      profile: profile.data,
      owned_businesses: owned.data,
      memberships: memberships.data,
      staff_profiles: staff.data,
      legal_acceptances: acceptances.data,
      security_activity: activity.data,
      support_tickets: tickets.error ? [] : tickets.data,
    };
    void logActivity(request, { user_id: user.id, action: 'account.exported' });
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="slotdove-meine-daten.json"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return failure(e);
  }
}

/** Art. 17 GDPR: delete the own account (14-day trash, then final). Owned businesses are deleted too. */
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const { db, user } = await requireUser();
    await softRateLimit(request, `account-delete:${user.id}`, 5);
    z.object({ confirm: z.literal('LÖSCHEN') }).parse(await body(request));
    const { data: isAdmin } = await db.rpc('my_platform_role');
    if (isAdmin) throw new HttpError(409, 'ADMIN_CANNOT_SELF_DELETE');
    // 14-day trash: login blocked and businesses offline immediately; final deletion after 14 days.
    await trashAccount(user.id, user.email || '', 'self');
    await db.auth.signOut();
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
