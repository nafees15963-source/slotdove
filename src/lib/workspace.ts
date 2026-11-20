import 'server-only';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import type { Workspace, Business } from './types';
export async function loadWorkspace(businessId?: string) {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: memberships, error: membershipError } = await db
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id);
  if (membershipError) throw new Error('WORKSPACE_UNAVAILABLE');
  const { data: supportBusiness } = await db.rpc('my_support_business');
  const { data: profile } = await db.from('profiles').select('tutorials_off').eq('id', user.id).maybeSingle();
  const memberIds = [...(memberships || []).map((m) => m.business_id), ...(supportBusiness ? [supportBusiness as string] : [])];
  const { data: businesses, error } = await db
    .from('businesses')
    .select('*')
    .or(`owner_id.eq.${user.id}${memberIds.length ? `,id.in.(${memberIds.join(',')})` : ''}`)
    .order('created_at')
    .limit(100);
  if (error) throw new Error('WORKSPACE_UNAVAILABLE');
  if (!businesses?.length) {
    const { data: platformAdmin } = await db.rpc('my_platform_role');
    redirect(platformAdmin ? '/admin' : '/onboarding');
  }
  const selected = businessId || (supportBusiness as string | null) || (await cookies()).get('slotdove-business')?.value;
  const business = (businesses.find((b) => b.id === selected) || businesses[0]) as Business;
  const { data: role } = await db.rpc('my_business_role', { bid: business.id });
  if (!role) throw new Error('WORKSPACE_SUSPENDED');
  const [year, month] = formatInTimeZone(new Date(), business.timezone, 'yyyy-MM')
    .split('-')
    .map(Number);
  const monthBoundary = (offset: number) =>
    fromZonedTime(
      new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10) + 'T00:00:00',
      business.timezone,
    ).toISOString();
  const lo = monthBoundary(-1),
    hi = monthBoundary(3);
  const queries = await Promise.all([
    db.from('services').select('*').eq('business_id', business.id).order('sort_order').limit(200),
    db.from('staff_profiles').select('*').eq('business_id', business.id).order('name').limit(100),
    db.from('customers').select('*').eq('business_id', business.id).order('id').limit(100),
    db
      .from('bookings')
      .select('*')
      .eq('business_id', business.id)
      .gte('starts_at', lo)
      .lt('starts_at', hi)
      .order('starts_at')
      .limit(500),
    db.from('availability_rules').select('*').eq('business_id', business.id).limit(1000),
    db
      .from('blocked_times')
      .select('*')
      .eq('business_id', business.id)
      .gte('ends_at', lo)
      .limit(200),
    db
      .from('notification_jobs')
      .select('id,kind,status,scheduled_at,attempts,last_error')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(30),
    db
      .from('service_staff')
      .select('service_id,staff_id')
      .eq('business_id', business.id)
      .limit(2000),
    db.from('business_entitlements').select('plan_id').eq('business_id', business.id).maybeSingle(),
    db.rpc('dashboard_stats', {
      bid: business.id,
      p_from: monthBoundary(0),
      p_to: monthBoundary(1),
    }),
    db.rpc('my_platform_role'),
    db.from('feature_flags').select('key,stage').limit(200),
    db.from('business_features').select('flag_key,enabled').eq('business_id', business.id).limit(200),
    db
      .from('announcements')
      .select('id,business_id,title,body,level,created_at')
      .or(`business_id.is.null,business_id.eq.${business.id}`)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);
  const err = queries.slice(0, 11).find((q) => q.error);
  const overrides = new Map(((queries[12].data || []) as { flag_key: string; enabled: boolean }[]).map((f) => [f.flag_key, f.enabled]));
  const features = ((queries[11].data || []) as { key: string; stage: string }[])
    .filter((f) => overrides.get(f.key) ?? f.stage === 'all')
    .map((f) => f.key);
  if (err) throw new Error('WORKSPACE_UNAVAILABLE');
  return {
    user: { id: user.id, email: user.email || '' },
    tutorialsOff: !!profile?.tutorials_off,
    mustChangePassword: !!user.app_metadata?.must_change_password,
    businesses: businesses as Business[],
    isAdmin: !!queries[10].data,
    workspace: {
      business,
      role,
      services: queries[0].data || [],
      staff: queries[1].data || [],
      customers: queries[2].data || [],
      bookings: queries[3].data || [],
      availability: queries[4].data || [],
      blocks: queries[5].data || [],
      notifications: queries[6].data || [],
      assignments: queries[7].data || [],
      plan: queries[8].data?.plan_id || 'free',
      stats: queries[9].data,
      // Before the 2026-11-18 migration the flag tables do not exist yet.
      features: queries[11].error ? ['assistant', 'chat', 'smart_slots'] : features,
      announcements: queries[13].data || [],
      support: !!supportBusiness && supportBusiness === business.id && business.owner_id !== user.id,
    } as Workspace,
  };
}
