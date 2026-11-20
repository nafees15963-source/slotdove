import 'server-only';
import { supabaseAdmin } from './supabase/admin';
import type { ProofData } from '@/components/signature-proof';
export async function loadProof(userId: string): Promise<ProofData | null> {
  const db = supabaseAdmin();
  const [{ data: u }, { data: sigs }, { data: biz }] = await Promise.all([
    db.auth.admin.getUserById(userId),
    db.from('legal_acceptances').select('document,version,signer_name,accepted_at,ip_hash,user_agent,method').eq('user_id', userId).order('accepted_at', { ascending: false }),
    db.from('businesses').select('name,slug').eq('owner_id', userId),
  ]);
  if (!u.user) return null;
  return { email: u.user.email || '', userId, businesses: biz || [], signatures: sigs || [] };
}
