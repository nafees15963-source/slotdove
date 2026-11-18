/** Platform-side risk scoring of accounts from the activity trail. Local and rule based. */
export type ActivityRow = { user_id: string | null; business_id: string | null; action: string; created_at: string; ip_hash?: string | null };
export type RiskFinding = { user_id: string; score: number; reasons: string[] };
const disposable = ['mailinator', 'trashmail', 'tempmail', '10minutemail', 'guerrillamail', 'yopmail', 'wegwerf', 'sharklasers', 'getnada', 'dispostable', 'throwaway'];
export function scoreUsers(
  rows: ActivityRow[],
  users: { id: string; email?: string; created_at?: string; confirmed?: boolean }[],
  flaggedByUser: Map<string, number>,
): RiskFinding[] {
  const byUser = new Map<string, ActivityRow[]>();
  for (const r of rows) if (r.user_id) byUser.set(r.user_id, [...(byUser.get(r.user_id) || []), r]);
  const out: RiskFinding[] = [];
  for (const u of users) {
    const list = (byUser.get(u.id) || []).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const reasons: string[] = [];
    let score = 0;
    // Bursts: more than 30 actions within 2 minutes.
    let burst = 0;
    for (let i = 0, j = 0; i < list.length; i++) {
      while (Date.parse(list[i].created_at) - Date.parse(list[j].created_at) > 120000) j++;
      burst = Math.max(burst, i - j + 1);
    }
    if (burst > 30) { score += 0.35; reasons.push(`burst:${burst}`); }
    const deletes = list.filter((r) => r.action.includes('delete')).length;
    if (deletes > 15) { score += 0.25; reasons.push(`deletes:${deletes}`); }
    const failed = list.filter((r) => r.action === 'auth.login_failed').length;
    if (failed >= 5) { score += 0.3; reasons.push(`failed_logins:${failed}`); }
    const ips = new Set(list.map((r) => r.ip_hash).filter(Boolean));
    if (ips.size >= 6) { score += 0.2; reasons.push(`ips:${ips.size}`); }
    const businesses = new Set(list.filter((r) => r.action === 'business.created').map((r) => r.business_id));
    if (businesses.size >= 3) { score += 0.25; reasons.push(`new_businesses:${businesses.size}`); }
    const flagged = flaggedByUser.get(u.id) || 0;
    if (flagged) { score += Math.min(0.6, 0.25 * flagged); reasons.push(`flagged_messages:${flagged}`); }
    const domain = (u.email || '').split('@')[1] || '';
    if (disposable.some((d) => domain.includes(d))) { score += 0.3; reasons.push('disposable_email'); }
    if (u.confirmed === false && u.created_at && Date.now() - Date.parse(u.created_at) > 3 * 86400000) { score += 0.1; reasons.push('unconfirmed'); }
    if (score > 0) out.push({ user_id: u.id, score: Math.min(1, Math.round(score * 100) / 100), reasons });
  }
  return out.sort((a, b) => b.score - a.score);
}
export const riskLabels: Record<string, string> = {
  burst: 'Ungewöhnlich viele Aktionen in kurzer Zeit',
  deletes: 'Viele Löschungen',
  failed_logins: 'Fehlgeschlagene Anmeldungen',
  ips: 'Viele verschiedene Netzwerke',
  new_businesses: 'Legt viele Unternehmen an',
  flagged_messages: 'Auffällige Chatnachrichten',
  disposable_email: 'Wegwerf-E-Mail-Adresse',
  unconfirmed: 'E-Mail nie bestätigt',
};
