import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../http';
import type { BrainData } from './brain';
/** Loads what the assistant may see, with the signed-in user's own permissions.
 * Returns null when the assistant feature is switched off for the business. */
export async function loadBrainData(db: SupabaseClient, businessId: string, role: string): Promise<BrainData | null> {
    const lo = new Date(Date.now() - 130 * 86400000).toISOString(),
      hi = new Date(Date.now() + 130 * 86400000).toISOString();
    const [business, services, staff, availability, blocks, assignments, bookings, customers, flags, overrides] = await Promise.all([
      db.from('businesses').select('*').eq('id', businessId).single(),
      db.from('services').select('*').eq('business_id', businessId).order('sort_order'),
      db.from('staff_profiles').select('*').eq('business_id', businessId),
      db.from('availability_rules').select('*').eq('business_id', businessId),
      db.from('blocked_times').select('*').eq('business_id', businessId).gte('ends_at', lo).limit(500),
      db.from('service_staff').select('service_id,staff_id').eq('business_id', businessId),
      db
        .from('bookings')
        .select('id,booking_number,business_id,staff_id,service_id,customer_id,starts_at,ends_at,status,service_name,customer_name,price_cents,notes,internal_notes,created_at,is_sample')
        .eq('business_id', businessId)
        .gte('starts_at', lo)
        .lt('starts_at', hi)
        .order('starts_at')
        .limit(3000),
      db.from('customers').select('id,name,created_at').eq('business_id', businessId).limit(3000),
      db.from('feature_flags').select('key,stage').eq('key', 'assistant'),
      db.from('business_features').select('flag_key,enabled').eq('business_id', businessId).eq('flag_key', 'assistant'),
    ]);
    if (business.error || !business.data) throw new HttpError(403, 'FORBIDDEN');
    const enabled = overrides.data?.[0]?.enabled ?? (flags.data?.[0]?.stage ?? 'all') === 'all';
    if (!enabled) return null;
    return {
      business: business.data,
      services: services.data || [],
      staff: staff.data || [],
      availability: availability.data || [],
      blocks: blocks.data || [],
      assignments: assignments.data || [],
      bookings: bookings.data || [],
      customers: customers.data || [],
      role,
    } satisfies BrainData;
}
