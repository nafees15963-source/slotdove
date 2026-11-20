'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileSignature, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Brand } from './brand';
import { api, friendlyError } from '@/lib/api-client';

/** Must be completed before the dashboard can be used: explicit consent + typed full name as signature. */
export function SignTerms({ next, version, email, from, until }: { next: string; version: string; email: string; from: string; until: string }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [name, setName] = useState('');
  const today = new Intl.DateTimeFormat('de', { dateStyle: 'long' }).format(new Date());
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await api('/api/legal', 'POST', {
        name: name.trim(),
        terms: f.get('terms') === 'on',
        liability: f.get('liability') === 'on',
        privacy: f.get('privacy') === 'on',
        dpa: f.get('dpa') === 'on',
        free: f.get('free') === 'on',
      });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message === 'INVALID_INPUT' ? 'Bitte alle Punkte bestätigen und den vollständigen Vor- und Nachnamen eingeben.' : friendlyError(err, 'de'));
      setBusy(false);
    }
  }
  return (
    <main className="sign-page">
      <form className="panel panel-body sign-card" onSubmit={submit}>
        <Brand />
        <h1>
          <FileSignature size={24} /> Nutzungsvereinbarung
        </h1>
        <p className="muted">
          Bevor du Slotdove nutzt, lies bitte die wichtigsten Punkte und unterschreibe online mit deinem vollständigen Namen. Version {version} · Konto {email}
        </p>
        <ul className="sign-points">
          <li>
            <strong>Privates Testprojekt:</strong> „Slotdove“ ist der Projektname eines privaten, nicht-kommerziellen Testprojekts. Es besteht kein Gewerbe.
          </li>
          <li>
            <strong>Kostenlos:</strong> Die Nutzung ist vom {from} bis {until} komplett kostenlos. Es wird kein Geld verlangt, es gibt kein Abo und keine Zahlungsdaten.
          </li>
          <li>
            <strong>Ohne Gewähr:</strong> Die Software ist in Entwicklung. Ausfälle, Fehler, doppelte oder verlorene Termine und nicht zugestellte E-Mails sind möglich.
          </li>
          <li>
            <strong>Keine Haftung für Termine:</strong> Für Termine und deine Kunden bist allein du verantwortlich. Eine Haftung für Schäden besteht nur bei Vorsatz und grober Fahrlässigkeit sowie in den
            gesetzlich zwingenden Fällen (Leben, Körper, Gesundheit, Produkthaftung, DSGVO).
          </li>
          <li>
            <strong>Eigene Vorsorge:</strong> Wichtige Termine hältst du zusätzlich selbst fest und sicherst deine Daten regelmäßig über den Export.
          </li>
        </ul>
        <div className="stack sign-checks">
          <label className="check-label">
            <input type="checkbox" name="terms" required /> Ich habe die <Link href="/agb" target="_blank">Nutzungsbedingungen</Link> gelesen und akzeptiere sie.
          </label>
          <label className="check-label">
            <input type="checkbox" name="liability" required /> Ich habe verstanden, dass Slotdove ohne Gewähr bereitgestellt wird und der Betreiber für ausgefallene, falsche oder doppelte Termine,
            nicht zugestellte E-Mails, Ausfälle und Datenverluste nur im gesetzlich zwingenden Umfang haftet (§ 14 der Nutzungsbedingungen).
          </label>
          <label className="check-label">
            <input type="checkbox" name="free" required /> Mir ist bekannt, dass Slotdove ein privates, kostenloses Testprojekt ist und mir keine Kosten entstehen.
          </label>
          <label className="check-label">
            <input type="checkbox" name="dpa" required /> Ich schließe den <Link href="/avv" target="_blank">Auftragsverarbeitungsvertrag</Link> für die Daten meiner Kunden und meines Teams ab.
          </label>
          <label className="check-label">
            <input type="checkbox" name="privacy" required /> Ich habe die <Link href="/datenschutz" target="_blank">Datenschutzerklärung</Link> zur Kenntnis genommen.
          </label>
        </div>
        <div className="field">
          <label htmlFor="sign-name">Unterschrift: vollständiger Vor- und Nachname</label>
          <input id="sign-name" className="sign-input" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={120} autoComplete="name" placeholder="Vorname Nachname" />
          <small className="muted">
            Ort/Datum: online, {today}. Mit Klick auf „Verbindlich unterschreiben“ gibst du eine elektronische Erklärung ab. Gespeichert werden Name, Zeitpunkt, Textversion und ein pseudonymisierter
            Netzwerk-Hash als Nachweis.
          </small>
        </div>
        {name.trim() && <div className="sign-preview">{name.trim()}</div>}
        {error && <p className="notice notice-error">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : <ShieldCheck size={16} />} Verbindlich unterschreiben
        </Button>
        <small className="muted">
          Du möchtest nicht zustimmen? Dann kannst du Slotdove nicht nutzen. Dein Konto löschen wir auf Wunsch: <a href="mailto:slotdove@gmail.com">slotdove@gmail.com</a>.
        </small>
      </form>
    </main>
  );
}
