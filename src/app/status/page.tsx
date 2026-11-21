import { emailConfigured } from '@/lib/email';
import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal';
export const metadata: Metadata = { title: 'Status – Slotdove', description: 'Aktueller Betriebsstatus von Slotdove.' };
export const revalidate = 60;
type Status = { level?: 'ok' | 'degraded' | 'down'; message?: string; updated_at?: string };
async function load() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { db: false, status: {} as Status };
  try {
    const r = await fetch(`${url}/rest/v1/platform_settings?key=eq.status&select=value`, { headers: { apikey: key }, signal: AbortSignal.timeout(2500), next: { revalidate: 60 } });
    if (!r.ok) return { db: false, status: {} as Status };
    const rows = (await r.json()) as { value: Status }[];
    return { db: true, status: rows[0]?.value || {} };
  } catch {
    return { db: false, status: {} as Status };
  }
}
export default async function Page() {
  const { db, status } = await load();
  const level = !db ? 'down' : status.level || 'ok';
  const email = emailConfigured();
  const label = { ok: 'Alle Systeme laufen', degraded: 'Eingeschränkter Betrieb', down: 'Störung' }[level];
  const rows: [string, boolean][] = [
    ['Website', true],
    ['Datenbank & Anmeldung', db],
    ['Online-Buchung', db && level !== 'down'],
    ['E-Mail-Versand', email],
  ];
  return (
    <LegalPage title="Status">
      <div className={`status-hero status-${level}`}>
        <span className="status-dot" />
        <strong>{label}</strong>
      </div>
      {status.message && <p className="notice">{status.message}</p>}
      <table>
        <tbody>
          {rows.map(([name, ok]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{ok ? '● in Betrieb' : '● gestört'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="meta">Diese Seite aktualisiert sich etwa jede Minute. Slotdove ist ein kostenloses Testprojekt ohne Verfügbarkeitszusage.</p>
    </LegalPage>
  );
}
