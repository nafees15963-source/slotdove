import 'server-only';
import { supabaseAdmin } from './supabase/admin';
import { mailAccountPurged, mailAccountRestored, mailAccountTrashed } from './mailer';

/** Deleted accounts first go to a 14-day trash: login blocked, businesses offline, everything restorable. */
export async function trashAccount(userId: string, email: string, by: 'self' | 'admin') {
  const db = supabaseAdmin();
  const { data: owned } = await db.from('businesses').select('id,status,published').eq('owner_id', userId);
  const { error } = await db.from('account_deletions').upsert({
    user_id: userId,
    email,
    requested_by: by,
    requested_at: new Date().toISOString(),
    purge_after: new Date(Date.now() + 14 * 86400000).toISOString(),
    businesses: owned || [],
  });
  if (error) throw error;
  for (const b of owned || []) await db.from('businesses').update({ status: 'archived', published: false }).eq('id', b.id);
  await db.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
  await db.from('admin_audit_logs').insert({ actor_id: userId, action: 'account.trashed', details: { by, businesses: (owned || []).length } });
  if (email) mailAccountTrashed(null, { email, by });
}

export async function restoreAccount(userId: string, actor: string) {
  const db = supabaseAdmin();
  const { data: row } = await db.from('account_deletions').select('businesses,email').eq('user_id', userId).maybeSingle();
  if (!row) return false;
  for (const b of (row.businesses || []) as { id: string; status: string; published: boolean }[])
    await db.from('businesses').update({ status: b.status === 'archived' ? 'active' : b.status, published: b.published }).eq('id', b.id);
  await db.auth.admin.updateUserById(userId, { ban_duration: 'none' });
  await db.from('account_deletions').delete().eq('user_id', userId);
  await db.from('admin_audit_logs').insert({ actor_id: actor, action: 'account.restored', details: { user_id: userId } });
  if (row.email) mailAccountRestored({ email: row.email });
  return true;
}

/** Final deletion: files, businesses (with all customer data) and the login. */
export async function purgeAccount(userId: string) {
  const db = supabaseAdmin();
  const { data: owned } = await db.from('businesses').select('id').eq('owner_id', userId);
  for (const b of owned || []) {
    const bucket = db.storage.from('business-logos');
    const [{ data: files }, { data: serviceFiles }] = await Promise.all([bucket.list(b.id, { limit: 1000 }), bucket.list(`${b.id}/services`, { limit: 1000 })]);
    const paths = [...(files || []).filter((f) => f.id).map((f) => `${b.id}/${f.name}`), ...(serviceFiles || []).map((f) => `${b.id}/services/${f.name}`)];
    if (paths.length) await bucket.remove(paths);
    await db.from('businesses').delete().eq('id', b.id);
  }
  await db.from('admin_audit_logs').insert({ actor_id: userId, action: 'account.purged', details: { businesses: (owned || []).length } });
  const { data: u } = await db.auth.admin.getUserById(userId);
  if (u.user?.email) await mailAccountPurged(u.user.email);
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error && !/not found/i.test(error.message)) throw error;
  await db.from('account_deletions').delete().eq('user_id', userId);
}

export async function purgeDue(limit = 10) {
  const { data } = await supabaseAdmin().from('account_deletions').select('user_id').lt('purge_after', new Date().toISOString()).limit(limit);
  let purged = 0;
  for (const row of data || []) {
    try {
      await purgeAccount(row.user_id);
      purged++;
    } catch {
      /* retried on the next run */
    }
  }
  return purged;
}
