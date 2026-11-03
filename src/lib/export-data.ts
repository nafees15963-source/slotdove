import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from './http';
/** Page under PostgREST's per-response limit. Reject large exports explicitly
 * rather than silently handing back an incomplete privacy export. */
export async function exportRows(
  db: SupabaseClient,
  table: 'customers' | 'bookings',
  columns: string,
  businessId: string,
  customerId?: string,
) {
  let countQuery = db
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId);
  if (customerId) countQuery = countQuery.eq('customer_id', customerId);
  const { count, error } = await countQuery;
  if (error) throw error;
  if ((count || 0) > 5000) throw new HttpError(413, 'EXPORT_LIMIT_EXCEEDED');
  const rows: Record<string, unknown>[] = [];
  let cursor = '';
  while (rows.length < (count || 0)) {
    let query = db.from(table).select(columns).eq('business_id', businessId).order('id').limit(500);
    if (customerId) query = query.eq('customer_id', customerId);
    if (cursor) query = query.gt('id', cursor);
    const { data, error } = await query;
    if (error) throw error;
    const batch = data as unknown as Record<string, unknown>[];
    if (!batch.length) break;
    rows.push(...batch);
    cursor = String(batch.at(-1)!.id);
  }
  return rows;
}
