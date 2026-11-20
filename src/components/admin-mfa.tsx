'use client';
import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { supabaseBrowser } from '@/lib/supabase/client';

/** Second factor for platform administrators (TOTP authenticator app). */
export function AdminMfa({ enrolled }: { enrolled: boolean }) {
  const [factorId, setFactorId] = useState(''),
    [qr, setQr] = useState(''),
    [secret, setSecret] = useState(''),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const sb = supabaseBrowser();
    (async () => {
      const { data: list } = await sb.auth.mfa.listFactors();
      const verified = list?.totp?.find((f) => f.status === 'verified');
      if (verified) return setFactorId(verified.id);
      if (enrolled) return;
      // Remove half-finished enrolments, then start a fresh one.
      for (const f of list?.all || []) if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Slotdove Admin ${new Date().toISOString().slice(0, 10)}` });
      if (error || !data) return setError('2FA konnte nicht gestartet werden. Ist TOTP im Supabase-Projekt aktiviert (Authentication → Multi-Factor)?');
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    })();
  }, [enrolled]);
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const sb = supabaseBrowser();
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') });
    if (error) {
      setError('Der Code ist falsch oder abgelaufen. Bitte den aktuellen 6-stelligen Code eingeben.');
      setBusy(false);
      return;
    }
    location.reload();
  }
  return (
    <main className="auth-page" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 20 }}>
      <form onSubmit={verify} className="panel panel-body stack" style={{ maxWidth: 420, width: '100%' }}>
        <ShieldCheck size={28} color="var(--purple)" />
        <h1 style={{ fontSize: 24 }}>Zwei-Faktor-Bestätigung</h1>
        {qr ? (
          <>
            <p>Der Admin-Bereich ist zusätzlich geschützt. Scanne den QR-Code mit einer Authenticator-App (z. B. Google Authenticator, Microsoft Authenticator, 1Password, Aegis).</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR-Code für die Authenticator-App" width={200} height={200} style={{ background: '#fff', borderRadius: 12, padding: 8, justifySelf: 'center' }} />
            <small>
              Manuell: <code style={{ userSelect: 'all', wordBreak: 'break-all' }}>{secret}</code>
            </small>
          </>
        ) : (
          <p>Gib den 6-stelligen Code aus deiner Authenticator-App ein.</p>
        )}
        <div className="field">
          <label htmlFor="mfa-code">Code</label>
          <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        {error && <p className="notice notice-error">{error}</p>}
        <Button type="submit" disabled={busy || !factorId}>
          {busy ? <span className="spinner" /> : 'Bestätigen'}
        </Button>
        <small className="muted">Gerät verloren? Faktor im Supabase-Dashboard unter Authentication → Users → MFA entfernen, oder als Notfall ADMIN_MFA=off in Vercel setzen.</small>
      </form>
    </main>
  );
}
