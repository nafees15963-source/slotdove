import { OPERATOR } from '@/lib/operator';
import { PrintButton } from './print-button';

export type ProofData = {
  email: string;
  userId: string;
  businesses: { name: string; slug: string }[];
  signatures: { document: string; version: string; signer_name: string; accepted_at: string; ip_hash: string | null; user_agent: string; method: string }[];
};
const docName: Record<string, string> = { terms: 'Nutzungsbedingungen', privacy: 'Datenschutzerklärung (Kenntnisnahme)', dpa: 'Auftragsverarbeitungsvertrag (Art. 28 DSGVO)' };
/** Printable proof of the electronic signature (browser "Print → Save as PDF"). */
export function SignatureProof({ data }: { data: ProofData }) {
  const fmt = (iso: string) => new Intl.DateTimeFormat('de', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'Europe/Berlin' }).format(new Date(iso));
  const last = data.signatures.find((s) => s.method === 'signature');
  return (
    <main className="proof">
      <div className="proof-actions">
        <PrintButton />
      </div>
      <h1>Nachweis der elektronischen Zustimmung</h1>
      <p>
        Betreiber: {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.city} – privates, nicht-kommerzielles Testprojekt „Slotdove“
      </p>
      <h2>Nutzer</h2>
      <table>
        <tbody>
          <tr>
            <th>E-Mail</th>
            <td>{data.email}</td>
          </tr>
          <tr>
            <th>Konto-ID</th>
            <td>{data.userId}</td>
          </tr>
          <tr>
            <th>Betrieb(e)</th>
            <td>{data.businesses.map((b) => `${b.name} (/b/${b.slug})`).join(', ') || '—'}</td>
          </tr>
        </tbody>
      </table>
      <h2>Zustimmungen</h2>
      <table>
        <thead>
          <tr>
            <th>Dokument</th>
            <th>Version</th>
            <th>Art</th>
            <th>Name (Unterschrift)</th>
            <th>Zeitpunkt (Berlin)</th>
          </tr>
        </thead>
        <tbody>
          {data.signatures.map((s, i) => (
            <tr key={i}>
              <td>{docName[s.document] || s.document}</td>
              <td>{s.version}</td>
              <td>{s.method === 'signature' ? 'Unterschrift (Name eingetippt)' : 'Häkchen bei Registrierung'}</td>
              <td>{s.signer_name || '—'}</td>
              <td>{fmt(s.accepted_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {last && (
        <>
          <h2>Unterschrift</h2>
          <div className="sign-preview">{last.signer_name}</div>
          <p className="meta">
            Netzwerk-Hash (pseudonymisierte IP): {last.ip_hash || '—'}
            <br />
            Browser: {last.user_agent || '—'}
          </p>
        </>
      )}
      <p className="meta">
        Die Zustimmung erfolgte durch Anklicken der Erklärungen und Eingabe des vollständigen Namens (einfache elektronische Erklärung). Die Texte der jeweiligen Version sind unter /agb, /datenschutz
        und /avv abrufbar. Erstellt am {fmt(new Date().toISOString())}.
      </p>
    </main>
  );
}
