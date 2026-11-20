'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, ImagePlus, ShieldCheck, Trash2 } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { useI18n } from '../providers';
import { useWorkspace } from './shell';
import { api, friendlyError } from '@/lib/api-client';
import { ServiceArt } from '@/lib/service-art';
import type { Service } from '@/lib/types';

/** Service picture with upload / remove controls for managers. */
export function ServiceImage({ service }: { service: Service }) {
  const w = useWorkspace(),
    { locale } = useI18n(),
    router = useRouter(),
    file = useRef<HTMLInputElement>(null),
    [busy, setBusy] = useState(false);
  const de = locale === 'de';
  async function upload(f: File) {
    if (f.size > 2097152) return toast.error(de ? 'Bild ist größer als 2 MB.' : 'Image is larger than 2 MB.');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', f);
      const r = await fetch(`/api/businesses/${w.business.id}/service-image?service=${service.id}`, { method: 'POST', body: form });
      if (!r.ok) throw new Error((await r.json()).error || 'REQUEST_FAILED');
      toast.success(de ? 'Bild gespeichert.' : 'Picture saved.');
      router.refresh();
    } catch (e) {
      toast.error(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="service-art-wrap">
      <ServiceArt service={service} size={52} />
      <div className="service-art-actions">
        <button type="button" className="btn btn-ghost btn-icon" disabled={busy} aria-label={de ? 'Eigenes Bild hochladen' : 'Upload picture'} title={de ? 'Eigenes Bild hochladen (PNG, JPG, WebP, max. 2 MB)' : 'Upload picture'} onClick={() => file.current?.click()}>
          {busy ? <span className="spinner" /> : <ImagePlus size={15} />}
        </button>
        {service.image_path && (
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            aria-label={de ? 'Bild entfernen – KI-Bild verwenden' : 'Remove picture'}
            title={de ? 'Bild entfernen – automatisches Bild verwenden' : 'Remove picture'}
            onClick={async () => {
              try {
                await api(`/api/businesses/${w.business.id}/service-image?service=${service.id}`, 'DELETE');
                router.refresh();
              } catch (e) {
                toast.error(friendlyError(e, locale));
              }
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
    </div>
  );
}

/** Owner/admin creates a login for an employee. The generated password is shown once. */
export function StaffAccountDialog({ open, onClose, staffId }: { open: boolean; onClose: () => void; staffId?: string }) {
  const w = useWorkspace(),
    { locale } = useI18n(),
    router = useRouter(),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const de = locale === 'de';
  const staff = w.staff.find((s) => s.id === staffId);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (f.confirm !== 'on') return toast.error(de ? 'Bitte bestätige die Information der Person.' : 'Please confirm.');
    setBusy(true);
    try {
      const r = await api<{ email: string; password: string }>(`/api/businesses/${w.business.id}/staff-account`, 'POST', {
        email: f.email,
        name: f.name,
        role: f.role,
        ...(staffId ? { staff_id: staffId } : {}),
      });
      setResult(r);
      router.refresh();
    } catch (err) {
      toast.error(friendlyError(err, locale));
    } finally {
      setBusy(false);
    }
  }
  const text = result
    ? de
      ? `Dein Zugang zu ${w.business.name} bei Slotdove:\nAnmeldung: ${location.origin}/login\nE-Mail: ${result.email}\nStartpasswort: ${result.password}\nBitte ändere das Passwort direkt bei der ersten Anmeldung.`
      : `Your ${w.business.name} access on Slotdove:\nLogin: ${location.origin}/login\nEmail: ${result.email}\nInitial password: ${result.password}\nPlease change it at first login.`
    : '';
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setResult(null);
          onClose();
        }
      }}
      title={de ? 'Mitarbeiter-Zugang erstellen' : 'Create staff login'}
      description={de ? 'Du legst das Konto selbst an – ohne Einladungs-E-Mail.' : 'Create the account yourself – no invitation email needed.'}
    >
      {result ? (
        <div className="stack">
          <div className="notice">
            <ShieldCheck size={16} />{' '}
            {de
              ? 'Zugang erstellt. Das Startpasswort wird nur JETZT angezeigt und nirgends im Klartext gespeichert. Gib es persönlich oder über einen sicheren Weg weiter – die Person muss es bei der ersten Anmeldung ändern.'
              : 'Account created. The initial password is shown only NOW and is never stored in plain text. The person must change it at first login.'}
          </div>
          <pre className="secret-box">{text}</pre>
          <Button
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              toast.success(de ? 'Kopiert' : 'Copied');
            }}
          >
            <Copy size={15} /> {de ? 'Zugangsdaten kopieren' : 'Copy credentials'}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="sa-name">{de ? 'Name' : 'Name'}</label>
              <input id="sa-name" name="name" required minLength={2} maxLength={100} defaultValue={staff?.name} />
            </div>
            <div className="field">
              <label htmlFor="sa-email">{de ? 'E-Mail (Login)' : 'Email (login)'}</label>
              <input id="sa-email" name="email" type="email" required maxLength={254} autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="sa-role">{de ? 'Rolle' : 'Role'}</label>
              <select id="sa-role" name="role" defaultValue="staff">
                <option value="staff">{de ? 'Mitarbeiter – sieht eigene Termine' : 'Staff – own appointments'}</option>
                {w.role === 'owner' && <option value="admin">{de ? 'Admin – verwaltet den Betrieb' : 'Admin – manages the business'}</option>}
              </select>
            </div>
            <label className="check-label full">
              <input type="checkbox" name="confirm" />
              {de
                ? 'Die Person weiß Bescheid, dass ich für sie ein Konto anlege, und hat die Datenschutzhinweise erhalten.'
                : 'The person knows I am creating an account for them and received the privacy notice.'}
            </label>
          </div>
          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              {de ? 'Abbrechen' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <span className="spinner" /> : <ShieldCheck size={15} />} {de ? 'Zugang erstellen' : 'Create login'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

export const reportCategories: Record<string, [string, string]> = {
  no_show: ['Repeated no-show', 'Wiederholt nicht erschienen'],
  abuse: ['Abusive behaviour', 'Beleidigung / Bedrohung'],
  harassment: ['Harassment', 'Belästigung'],
  fraud: ['Fraud / fake bookings', 'Betrug / Fake-Buchungen'],
  spam: ['Spam', 'Spam'],
  illegal: ['Illegal content', 'Rechtswidrige Inhalte'],
  privacy: ['Privacy violation', 'Datenschutzverstoß'],
  copyright: ['Copyright', 'Urheberrecht'],
  security: ['Security issue', 'Sicherheitsproblem'],
  other: ['Other', 'Sonstiges'],
};

/** A business reports a customer (or content) to the Slotdove trust & safety team. */
export function ReportDialog({ target, onClose }: { target: { customer_id?: string; name: string } | null; onClose: () => void }) {
  const w = useWorkspace(),
    { locale } = useI18n(),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState('');
  const de = locale === 'de';
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      const r = await api<{ case_number: string }>('/api/reports', 'POST', {
        business_id: w.business.id,
        customer_id: target?.customer_id,
        category: f.category,
        description: f.description,
        good_faith: f.good_faith === 'on',
        block: f.block === 'on',
      });
      setDone(r.case_number);
    } catch (err) {
      toast.error(friendlyError(err, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={!!target}
      onOpenChange={(v) => {
        if (!v) {
          setDone('');
          onClose();
        }
      }}
      title={de ? `${target?.name || 'Kunde'} melden` : `Report ${target?.name || 'customer'}`}
      description={de ? 'Die Meldung geht vertraulich an das Slotdove-Sicherheitsteam.' : 'The report goes confidentially to the Slotdove safety team.'}
    >
      {done ? (
        <div className="stack">
          <div className="notice">
            <ShieldCheck size={16} /> {de ? `Danke. Deine Meldung ist eingegangen – Fallnummer ${done}. Wir prüfen sie und informieren dich über die Entscheidung.` : `Thanks. Case ${done} received.`}
          </div>
          <Button onClick={onClose}>{de ? 'Schließen' : 'Close'}</Button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="rp-cat">{de ? 'Grund' : 'Reason'}</label>
              <select id="rp-cat" name="category" defaultValue="no_show">
                {Object.entries(reportCategories).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v[de ? 1 : 0]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="rp-desc">{de ? 'Was ist passiert? (sachlich, mit Datum)' : 'What happened? (factual, with dates)'}</label>
              <textarea id="rp-desc" name="description" required minLength={10} maxLength={4000} />
            </div>
            <label className="check-label full">
              <input type="checkbox" name="block" defaultChecked />
              {de ? 'Diese E-Mail-Adresse für Online-Buchungen in meinem Betrieb sperren' : 'Block this email from booking my business online'}
            </label>
            <label className="check-label full">
              <input type="checkbox" name="good_faith" required />
              {de ? 'Ich bestätige, dass meine Angaben nach bestem Wissen richtig und vollständig sind.' : 'I confirm my information is accurate and complete to the best of my knowledge.'}
            </label>
          </div>
          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              {de ? 'Abbrechen' : 'Cancel'}
            </Button>
            <Button type="submit" variant="danger" disabled={busy}>
              {busy ? <span className="spinner" /> : null} {de ? 'Meldung senden' : 'Send report'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/** Personal data rights: export (Art. 15/20), tutorials back on, delete account (Art. 17). */
export function AccountPrivacy() {
  const { locale } = useI18n(),
    w = useWorkspace(),
    [open, setOpen] = useState(false),
    [text, setText] = useState(''),
    [busy, setBusy] = useState(false);
  const de = locale === 'de';
  return (
    <>
      <Button variant="outline" asChild>
        <a href={`/api/account`}>{de ? 'Meine persönlichen Daten (JSON)' : 'My personal data (JSON)'}</a>
      </Button>
      <Button variant="outline" asChild>
        <a href={`/account/nachweis`} target="_blank">
          {de ? 'Mein Vertragsnachweis (PDF)' : 'My signed agreement (PDF)'}
        </a>
      </Button>
      <Button
        variant="ghost"
        onClick={async () => {
          try {
            localStorage.removeItem('slotdove-tours-off');
            localStorage.removeItem('slotdove-tour-overview');
          } catch {}
          await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tutorials_off: false }) });
          toast.success(de ? 'Tutorials sind wieder eingeschaltet.' : 'Tutorials are back on.');
        }}
      >
        {de ? 'Tutorials wieder anzeigen' : 'Show tutorials again'}
      </Button>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Trash2 size={14} /> {de ? 'Konto endgültig löschen' : 'Delete account permanently'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={de ? 'Konto endgültig löschen' : 'Delete account'}>
        <div className="stack">
          <div className="notice notice-warn">
            {de
              ? `Dein Konto wird sofort gesperrt${w.role === 'owner' ? ` und dein Betrieb „${w.business.name}“ offline genommen` : ''}. 14 Tage lang kann alles auf Wunsch wiederhergestellt werden (E-Mail an uns). Danach werden Konto${w.role === 'owner' ? ', Betrieb, Termine, Kunden und Bilder' : ''} endgültig gelöscht. Exportiere vorher deine Daten.`
              : 'Your account will be deleted immediately, including businesses you own and all their data. Export first.'}
          </div>
          <label htmlFor="del-confirm">{de ? 'Tippe LÖSCHEN zur Bestätigung' : 'Type LÖSCHEN to confirm'}</label>
          <input id="del-confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          <Button
            variant="danger"
            disabled={text !== 'LÖSCHEN' || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api('/api/account', 'DELETE', { confirm: 'LÖSCHEN' });
                location.href = '/';
              } catch (e) {
                toast.error(friendlyError(e, locale));
                setBusy(false);
              }
            }}
          >
            {busy ? <span className="spinner" /> : <Trash2 size={14} />} {de ? 'Jetzt unwiderruflich löschen' : 'Delete now'}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

const historyLabels: Record<string, string> = {
  'bookings.create': 'Termin angelegt',
  'bookings.update': 'Termin bearbeitet',
  'bookings.delete': 'Termin gelöscht',
  'booking-status.create': 'Termin geändert/abgesagt',
  'booking-status.update': 'Termin geändert/abgesagt',
  'customers.create': 'Kunde angelegt',
  'customers.update': 'Kunde bearbeitet',
  'customers.delete': 'Kunde gelöscht',
  'anonymize-customer.create': 'Kunde anonymisiert',
  'services.create': 'Leistung angelegt',
  'services.update': 'Leistung bearbeitet',
  'services.delete': 'Leistung gelöscht',
  'staff.create': 'Teammitglied angelegt',
  'staff.update': 'Teammitglied bearbeitet',
  'staff.delete': 'Teammitglied entfernt',
  'staff-account.create': 'Mitarbeiter-Zugang erstellt',
  'settings.update': 'Einstellungen geändert',
  'settings.create': 'Einstellungen geändert',
  'week-plan-replace.create': 'Arbeitszeiten geändert',
  'holidays.create': 'Feiertage eingetragen',
  'blocks.create': 'Abwesenheit eingetragen',
  'blocks.delete': 'Abwesenheit gelöscht',
  'invitations.create': 'Einladung verschickt',
  'customer.booked': 'Kunde hat online gebucht',
  'customer.cancelled': 'Kunde hat abgesagt',
  'customer.rescheduled': 'Kunde hat verschoben',
  'report.created': 'Meldung abgeschickt',
};
/** Owner/admin change log: who changed what in the last 90 days. */
export function HistoryPanel() {
  const w = useWorkspace(),
    { locale } = useI18n(),
    [rows, setRows] = useState<{ action: string; at: string; who: string; detail: string }[] | null>(null);
  const de = locale === 'de';
  return (
    <div className="panel settings-section">
      <h3>{de ? 'Änderungsprotokoll (90 Tage)' : 'Change log (90 days)'}</h3>
      <p className="muted" style={{ fontSize: 12 }}>
        {de ? 'Wer hat wann was geändert? Hilfreich, wenn ein Termin „verschwunden“ ist.' : 'Who changed what and when.'}
      </p>
      {!rows ? (
        <Button
          variant="outline"
          onClick={() =>
            api<{ entries: NonNullable<typeof rows> }>(`/api/businesses/${w.business.id}/history`)
              .then((r) => setRows(r.entries))
              .catch((e) => toast.error(friendlyError(e, locale)))
          }
        >
          {de ? 'Protokoll anzeigen' : 'Show log'}
        </Button>
      ) : (
        <div className="history-list">
          {rows.map((r, i) => (
            <div key={i} className="history-row">
              <time>{new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(r.at))}</time>
              <span>
                <strong>{r.who}</strong> · {historyLabels[r.action] || r.action}
                {r.detail ? ` · ${r.detail}` : ''}
              </span>
            </div>
          ))}
          {!rows.length && <p className="muted">{de ? 'Keine Einträge.' : 'No entries.'}</p>}
        </div>
      )}
    </div>
  );
}
