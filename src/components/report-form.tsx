'use client';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { api, friendlyError } from '@/lib/api-client';

const categories: [string, string][] = [
  ['illegal', 'Rechtswidriger Inhalt'],
  ['abuse', 'Beleidigung, Bedrohung, Hassrede'],
  ['harassment', 'Belästigung / Stalking'],
  ['fraud', 'Betrug, Fake-Angebot, Phishing'],
  ['spam', 'Spam'],
  ['privacy', 'Verletzung meiner Privatsphäre / Daten'],
  ['copyright', 'Urheber- oder Markenrechtsverletzung'],
  ['security', 'Sicherheitslücke'],
  ['other', 'Sonstiges'],
];
export function ReportForm() {
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(''),
    [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      const r = await api<{ case_number: string }>('/api/public/report', 'POST', {
        category: f.category,
        target_url: String(f.target_url || '').trim(),
        description: f.description,
        name: String(f.name || '').trim(),
        email: String(f.email || '').trim(),
        good_faith: f.good_faith === 'on',
        website: f.website || undefined,
      });
      setDone(r.case_number);
    } catch (err) {
      setError(friendlyError(err, 'de'));
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="notice" role="status">
        <ShieldCheck size={16} /> Vielen Dank. Ihre Meldung ist unter der Fallnummer <strong>{done}</strong> eingegangen. Bitte bewahren Sie die Nummer für Rückfragen auf.
      </div>
    );
  return (
    <form onSubmit={submit} className="panel panel-body" style={{ margin: '24px 0' }}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="r-cat">Art der Meldung</label>
          <select id="r-cat" name="category" defaultValue="illegal">
            {categories.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-url">Link zum Inhalt (falls vorhanden)</label>
          <input id="r-url" name="target_url" type="url" maxLength={500} placeholder="https://slotdove.vercel.app/b/…" />
        </div>
        <div className="field full">
          <label htmlFor="r-desc">Begründung: Was ist rechtswidrig bzw. was ist passiert?</label>
          <textarea id="r-desc" name="description" required minLength={20} maxLength={4000} rows={6} />
        </div>
        <div className="field">
          <label htmlFor="r-name">Ihr Name (optional)</label>
          <input id="r-name" name="name" maxLength={120} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="r-email">Ihre E-Mail (optional, für Rückmeldung)</label>
          <input id="r-email" name="email" type="email" maxLength={254} autoComplete="email" />
        </div>
        <div aria-hidden style={{ position: 'absolute', left: '-9999px' }}>
          <label htmlFor="r-web">Website</label>
          <input id="r-web" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <label className="check-label full">
          <input type="checkbox" name="good_faith" required />
          Ich bin in gutem Glauben davon überzeugt, dass die in dieser Meldung enthaltenen Angaben und Behauptungen richtig und vollständig sind (Art. 16 Abs. 2 lit. d DSA).
        </label>
      </div>
      {error && <p className="notice notice-error">{error}</p>}
      <div className="form-actions">
        <Button type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : <ShieldCheck size={15} />} Meldung absenden
        </Button>
      </div>
    </form>
  );
}
