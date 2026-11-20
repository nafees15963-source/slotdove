'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { api, friendlyError } from '@/lib/api-client';

const T = '/api/admin/trust';
const fmt = (iso?: string | null) => (iso ? new Intl.DateTimeFormat('de', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) : '—');
async function post(payload: Record<string, unknown>, ok = 'Gespeichert') {
  try {
    const r = await api<Record<string, unknown>>(T, 'POST', payload);
    toast.success(ok);
    return r;
  } catch (e) {
    toast.error(friendlyError(e, 'de'));
    return null;
  }
}
function useView<D>(query: string) {
  const [data, setData] = useState<D | null>(null);
  const load = useCallback(() => api<D>(`${T}?${query}`).then(setData).catch((e) => toast.error(friendlyError(e, 'de'))), [query]);
  useEffect(() => {
    void load();
  }, [load]);
  return [data, load] as const;
}

const categoryDe: Record<string, string> = {
  no_show: 'Nicht erschienen',
  abuse: 'Beleidigung/Bedrohung',
  harassment: 'Belästigung',
  fraud: 'Betrug',
  spam: 'Spam',
  illegal: 'Rechtswidrig',
  privacy: 'Datenschutz',
  copyright: 'Urheberrecht',
  security: 'Sicherheit',
  other: 'Sonstiges',
};
const reportStatusDe: Record<string, string> = { open: 'Offen', in_review: 'In Prüfung', actioned: 'Maßnahme ergriffen', rejected: 'Abgelehnt', closed: 'Geschlossen' };
type Report = {
  id: string;
  case_number: string;
  kind: string;
  category: string;
  business_id: string | null;
  customer_id: string | null;
  target_url: string;
  description: string;
  reporter_kind: string;
  reporter_name: string;
  reporter_email: string;
  status: string;
  decision: string;
  admin_notes: string;
  created_at: string;
};

/** DSA notice-and-action desk (Art. 16/17 DSA). */
export function ReportsDesk({ nameOf }: { nameOf: Map<string, string> }) {
  const [data, load] = useView<{ reports: Report[] }>('view=reports');
  const [filter, setFilter] = useState('open');
  const [open, setOpen] = useState<Report | null>(null);
  const list = (data?.reports || []).filter((r) => filter === 'all' || r.status === filter || (filter === 'open' && r.status === 'in_review'));
  return (
    <section className="panel">
      <div className="panel-head spread">
        <h2 className="panel-title">Meldungen (DSA Art. 16/17)</h2>
        <div className="row">
          {['open', 'actioned', 'rejected', 'closed', 'all'].map((s) => (
            <button key={s} className={`chip ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>
              {s === 'all' ? 'Alle' : reportStatusDe[s]}
            </button>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fall</th>
              <th>Art</th>
              <th>Betrieb</th>
              <th>Melder</th>
              <th>Status</th>
              <th>Eingang</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} onClick={() => setOpen(r)} style={{ cursor: 'pointer' }}>
                <td>
                  <strong>{r.case_number}</strong>
                </td>
                <td>{categoryDe[r.category] || r.category}</td>
                <td>{r.business_id ? nameOf.get(r.business_id) || r.business_id.slice(0, 8) : r.target_url ? 'URL' : '—'}</td>
                <td>{r.reporter_kind === 'member' ? 'Betrieb' : r.reporter_email || 'anonym'}</td>
                <td>
                  <span className={`badge ${r.status === 'open' ? 'badge-red' : r.status === 'actioned' ? 'badge-green' : ''}`}>{reportStatusDe[r.status]}</span>
                </td>
                <td>{fmt(r.created_at)}</td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={6} className="muted">
                  Keine Meldungen in dieser Ansicht.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)} title={`Meldung ${open?.case_number || ''}`} description="Begründete Entscheidung nach Art. 17 DSA">
        {open && <ReportDecision report={open} nameOf={nameOf} onDone={() => (setOpen(null), load())} />}
      </Dialog>
    </section>
  );
}
function ReportDecision({ report: r, nameOf, onDone }: { report: Report; nameOf: Map<string, string>; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget));
        setBusy(true);
        const res = await post({
          action: 'report-update',
          id: r.id,
          status: f.status,
          decision: f.decision,
          admin_notes: f.admin_notes,
          notify: f.notify === 'on',
          suspend_business: f.suspend === 'on',
        });
        setBusy(false);
        if (res) onDone();
      }}
      className="stack"
    >
      <div className="notice">
        <strong>{categoryDe[r.category]}</strong> · {r.kind} · eingegangen {fmt(r.created_at)}
        {r.business_id && <div>Betrieb: {nameOf.get(r.business_id) || r.business_id}</div>}
        {r.target_url && (
          <div>
            URL:{' '}
            <a href={r.target_url} target="_blank" rel="noopener noreferrer nofollow">
              {r.target_url}
            </a>
          </div>
        )}
        <div>
          Melder: {r.reporter_name || '—'} {r.reporter_email && `<${r.reporter_email}>`} ({r.reporter_kind})
        </div>
      </div>
      <p style={{ whiteSpace: 'pre-wrap' }}>{r.description}</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="rd-status">Status</label>
          <select id="rd-status" name="status" defaultValue={r.status}>
            {Object.entries(reportStatusDe).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field full">
          <label htmlFor="rd-decision">Entscheidung & Begründung (geht an Melder/Betroffene)</label>
          <textarea id="rd-decision" name="decision" defaultValue={r.decision} maxLength={4000} placeholder="Maßnahme, Tatsachen, Rechtsgrundlage bzw. AGB-Ziffer, Hinweis auf Rechtsbehelfe …" />
        </div>
        <div className="field full">
          <label htmlFor="rd-notes">Interne Notizen</label>
          <textarea id="rd-notes" name="admin_notes" defaultValue={r.admin_notes} maxLength={4000} />
        </div>
        {r.reporter_email && (
          <label className="check-label full">
            <input type="checkbox" name="notify" defaultChecked /> Melder per E-Mail über die Entscheidung informieren
          </label>
        )}
        {r.business_id && (
          <label className="check-label full">
            <input type="checkbox" name="suspend" /> Betrieb vorläufig sperren (nur bei schwerem Verstoß – Betrieb begründet informieren!)
          </label>
        )}
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? <span className="spinner" /> : null} Entscheidung speichern
      </Button>
    </form>
  );
}

type Dsr = {
  id: string;
  case_number: string;
  type: string;
  requester_name: string;
  requester_email: string;
  subject_email: string;
  status: string;
  identity_verified: boolean;
  received_at: string;
  due_at: string;
  notes: string;
  result: string;
};
const dsrTypeDe: Record<string, string> = {
  access: 'Auskunft (Art. 15)',
  erasure: 'Löschung (Art. 17)',
  rectification: 'Berichtigung (Art. 16)',
  restriction: 'Einschränkung (Art. 18)',
  portability: 'Übertragbarkeit (Art. 20)',
  objection: 'Widerspruch (Art. 21)',
  withdrawal: 'Widerruf Einwilligung',
  other: 'Sonstiges',
};
const dsrStatusDe: Record<string, string> = { new: 'Neu', verifying: 'Identität prüfen', in_progress: 'In Bearbeitung', done: 'Erledigt', rejected: 'Abgelehnt' };

/** GDPR data-subject requests with the one-month deadline, lookup, export and erasure. */
export function DsrDesk() {
  const [data, load] = useView<{ requests: Dsr[] }>('view=dsr');
  const [create, setCreate] = useState(false);
  const [edit, setEdit] = useState<Dsr | null>(null);
  const [email, setEmail] = useState('');
  const [found, setFound] = useState<Record<string, unknown> | null>(null);
  const [now] = useState(() => Date.now());
  return (
    <div className="admin-grid">
      <section className="panel">
        <div className="panel-head spread">
          <h2 className="panel-title">DSGVO-Anfragen</h2>
          <Button size="sm" onClick={() => setCreate(true)}>
            Anfrage erfassen
          </Button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fall</th>
                <th>Art</th>
                <th>Person</th>
                <th>Status</th>
                <th>Frist</th>
              </tr>
            </thead>
            <tbody>
              {(data?.requests || []).map((r) => {
                const overdue = !['done', 'rejected'].includes(r.status) && Date.parse(r.due_at) < now;
                const soon = !overdue && !['done', 'rejected'].includes(r.status) && Date.parse(r.due_at) - now < 7 * 86400000;
                return (
                  <tr key={r.id} onClick={() => setEdit(r)} style={{ cursor: 'pointer' }}>
                    <td>
                      <strong>{r.case_number}</strong>
                    </td>
                    <td>{dsrTypeDe[r.type]}</td>
                    <td>{r.subject_email || r.requester_email}</td>
                    <td>{dsrStatusDe[r.status]}</td>
                    <td>
                      <span className={`badge ${overdue ? 'badge-red' : soon ? 'badge-yellow' : ''}`}>{fmt(r.due_at)}</span>
                    </td>
                  </tr>
                );
              })}
              {!data?.requests.length && (
                <tr>
                  <td colSpan={5} className="muted">
                    Noch keine Anfragen. Frist: 1 Monat ab Eingang (Art. 12 Abs. 3 DSGVO).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Person suchen (alle Betriebe)</h2>
        </div>
        <div className="panel-body stack">
          <form
            className="row"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                setFound(await api(`${T}?view=dsr-lookup&email=${encodeURIComponent(email)}`));
              } catch (err) {
                toast.error(friendlyError(err, 'de'));
              }
            }}
          >
            <input type="email" required placeholder="E-Mail der betroffenen Person" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" variant="outline">
              <Search size={14} /> Suchen
            </Button>
          </form>
          {found && (
            <>
              <div className="notice">
                Konto: {found.account ? 'ja' : 'nein'} · Kundeneinträge: {(found.customers as unknown[])?.length || 0} · Termine: {(found.bookings as unknown[])?.length || 0} · Warteliste:{' '}
                {(found.waitlist as unknown[])?.length || 0} · Meldungen: {(found.reports_filed as unknown[])?.length || 0}
              </div>
              <div className="row wrap">
                <Button variant="outline" asChild>
                  <a href={`${T}?view=dsr-lookup&download=1&email=${encodeURIComponent(email)}`}>
                    <Download size={14} /> Auskunft als JSON
                  </a>
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (!confirm(`Alle Kundendaten zu ${email} in ALLEN Betrieben anonymisieren und Warteliste löschen? Das ist endgültig. Ein Benutzerkonto wird nicht gelöscht (separat unter Benutzer).`)) return;
                    const r = await post({ action: 'dsr-erase', email, confirm: true }, 'Daten gelöscht/anonymisiert');
                    if (r) setFound(null);
                  }}
                >
                  <Trash2 size={14} /> Löschen (Art. 17)
                </Button>
              </div>
              <small className="muted">Hinweis: Für Kundendaten sind die Betriebe Verantwortliche. Lösche nur nach deren Weisung oder bei eigener Verantwortlichkeit; informiere den Betrieb.</small>
            </>
          )}
        </div>
      </section>
      <Dialog open={create} onOpenChange={setCreate} title="DSGVO-Anfrage erfassen">
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            const r = await post({ action: 'dsr-create', ...f }, 'Anfrage angelegt');
            if (r) {
              setCreate(false);
              load();
            }
          }}
        >
          <div className="field">
            <label htmlFor="d-type">Art</label>
            <select id="d-type" name="type">
              {Object.entries(dsrTypeDe).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="d-ch">Eingangskanal</label>
            <input id="d-ch" name="channel" defaultValue="email" maxLength={40} />
          </div>
          <div className="field">
            <label htmlFor="d-n">Name</label>
            <input id="d-n" name="requester_name" maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="d-e">E-Mail Antragsteller</label>
            <input id="d-e" name="requester_email" type="email" required />
          </div>
          <div className="field full">
            <label htmlFor="d-s">Betroffene E-Mail (falls abweichend)</label>
            <input id="d-s" name="subject_email" type="email" />
          </div>
          <div className="field full">
            <label htmlFor="d-no">Notizen</label>
            <textarea id="d-no" name="notes" maxLength={8000} />
          </div>
          <Button type="submit">Speichern</Button>
        </form>
      </Dialog>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={`Anfrage ${edit?.case_number || ''}`} description={edit ? `${dsrTypeDe[edit.type]} · Frist ${fmt(edit.due_at)}` : undefined}>
        {edit && (
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              const r = await post({ action: 'dsr-update', id: edit.id, status: f.status, identity_verified: f.identity_verified === 'on', notes: f.notes, result: f.result });
              if (r) {
                setEdit(null);
                load();
              }
            }}
          >
            <div className="field">
              <label htmlFor="de-s">Status</label>
              <select id="de-s" name="status" defaultValue={edit.status}>
                {Object.entries(dsrStatusDe).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <label className="check-label">
              <input type="checkbox" name="identity_verified" defaultChecked={edit.identity_verified} /> Identität geprüft
            </label>
            <div className="field full">
              <label htmlFor="de-n">Notizen</label>
              <textarea id="de-n" name="notes" defaultValue={edit.notes} maxLength={8000} />
            </div>
            <div className="field full">
              <label htmlFor="de-r">Ergebnis / Antwort an Person</label>
              <textarea id="de-r" name="result" defaultValue={edit.result} maxLength={8000} />
            </div>
            <Button type="submit">Speichern</Button>
          </form>
        )}
      </Dialog>
    </div>
  );
}

type Block = { id: string; kind: string; value: string; reason: string; created_at: string; expires_at: string | null };
/** Platform-wide blocklist (e-mail, domain, hashed IP). */
export function BlocklistDesk() {
  const [data, load] = useView<{ entries: Block[] }>('view=blocklist');
  return (
    <div className="admin-grid">
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Eintrag hinzufügen</h2>
        </div>
        <form
          className="panel-body form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = Object.fromEntries(new FormData(form));
            const r = await post({ action: 'block-add', kind: f.kind, value: f.value, reason: f.reason, days: Number(f.days) || 0 }, 'Gesperrt');
            if (r) {
              form.reset();
              load();
            }
          }}
        >
          <div className="field">
            <label htmlFor="b-k">Art</label>
            <select id="b-k" name="kind">
              <option value="email">E-Mail</option>
              <option value="domain">Domain (z. B. wegwerfmail.de)</option>
              <option value="ip">IP-Hash (aus Protokoll)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="b-v">Wert</label>
            <input id="b-v" name="value" required maxLength={254} />
          </div>
          <div className="field">
            <label htmlFor="b-d">Dauer in Tagen (0 = unbegrenzt)</label>
            <input id="b-d" name="days" type="number" min={0} max={3650} defaultValue={0} />
          </div>
          <div className="field">
            <label htmlFor="b-r">Grund (intern)</label>
            <input id="b-r" name="reason" maxLength={500} />
          </div>
          <Button type="submit" variant="danger">
            <ShieldAlert size={14} /> Sperren
          </Button>
          <small className="muted full">Gesperrt wird bei Registrierung, Online-Buchung, Warteliste, Meldungen und Mitarbeiter-Zugängen.</small>
        </form>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Sperrliste ({data?.entries.length || 0})</h2>
        </div>
        <div className="panel-body feed">
          {(data?.entries || []).map((b) => (
            <div className="feed-row" key={b.id}>
              <span className="badge">{b.kind}</span>
              <span className="grow">
                <strong>{b.value}</strong> <small className="muted">{b.reason}</small>
                <br />
                <small>bis {b.expires_at ? fmt(b.expires_at) : 'unbegrenzt'}</small>
              </span>
              <Button size="sm" variant="ghost" onClick={async () => (await post({ action: 'block-remove', id: b.id }, 'Entfernt'), load())}>
                Entfernen
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

type Stats = {
  days: { date: string; bookings: number; signups: number; waitlist: number; reports: number }[];
  totals: Record<string, number>;
  industries: [string, number][];
  plans: [string, number][];
  waitlistIndustries: [string, number][];
  reportCategories: [string, number][];
};
function Bars({ rows, field, label }: { rows: Stats['days']; field: 'bookings' | 'signups' | 'waitlist' | 'reports'; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r[field]));
  const sum = rows.reduce((s, r) => s + r[field], 0);
  return (
    <section className="panel">
      <div className="panel-head spread">
        <h2 className="panel-title">{label}</h2>
        <strong>{sum}</strong>
      </div>
      <div className="panel-body">
        <div className="mini-bars" role="img" aria-label={`${label}: ${sum} in 30 Tagen`}>
          {rows.map((r) => (
            <span key={r.date} title={`${r.date}: ${r[field]}`} style={{ height: `${Math.max(3, (r[field] / max) * 100)}%` }} />
          ))}
        </div>
        <div className="spread muted" style={{ fontSize: 11, marginTop: 6 }}>
          <span>{rows[0]?.date}</span>
          <span>heute</span>
        </div>
      </div>
    </section>
  );
}
function Ranking({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">{title}</h2>
      </div>
      <div className="panel-body stack">
        {rows.slice(0, 10).map(([k, n]) => (
          <div key={k} className="rank-row">
            <span>{k}</span>
            <span className="rank-bar">
              <span style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <strong>{n}</strong>
          </div>
        ))}
        {!rows.length && <p className="muted">Noch keine Daten.</p>}
      </div>
    </section>
  );
}
/** 30-day platform statistics. */
export function StatsDesk() {
  const [s] = useView<Stats>('view=stats');
  if (!s) return <div className="skeleton" style={{ height: 200 }} />;
  const t = s.totals;
  const kpis: [string, string | number][] = [
    ['Echte Betriebe', t.businesses],
    ['Veröffentlicht', t.published],
    ['Demo-Konten', t.demo],
    ['Gesperrt', t.suspended],
    ['Benutzer', t.users],
    ['Termine (30 T.)', t.bookings30],
    ['Storno-Quote', t.bookings30 ? `${Math.round((t.cancelled30 / t.bookings30) * 100)} %` : '—'],
    ['No-Show-Quote', t.bookings30 ? `${Math.round((t.noShow30 / t.bookings30) * 100)} %` : '—'],
    ['Buchungsvolumen (30 T.)', `${(t.volume30 / 100).toLocaleString('de', { maximumFractionDigits: 0 })} €`],
    ['Warteliste', t.waitlist],
  ];
  return (
    <div className="stack">
      <div className="kpi-row six">
        {kpis.map(([k, v]) => (
          <div className="kpi" key={k}>
            <small>{k}</small>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="admin-grid">
        <Bars rows={s.days} field="bookings" label="Neue Termine / Tag" />
        <Bars rows={s.days} field="signups" label="Registrierungen / Tag" />
        <Bars rows={s.days} field="waitlist" label="Warteliste / Tag" />
        <Bars rows={s.days} field="reports" label="Meldungen / Tag" />
        <Ranking title="Branchen (Betriebe)" rows={s.industries} />
        <Ranking title="Tarife" rows={s.plans} />
        <Ranking title="Branchen (Warteliste)" rows={s.waitlistIndustries} />
        <Ranking title="Meldegründe (30 T.)" rows={s.reportCategories.map(([k, n]) => [categoryDe[k] || k, n])} />
      </div>
    </div>
  );
}

/** Platform switches: maintenance banner, signups, public booking, service broadcast. */
export function PlatformDesk() {
  const [data, load] = useView<{ settings: Record<string, { enabled?: boolean; message?: string }> }>('view=settings');
  const s = data?.settings || {};
  const [msg, setMsg] = useState<string | null>(null);
  const toggle = async (key: string, enabled: boolean, message = '') => {
    const warn: Record<string, string> = {
      signups: enabled ? 'Registrierungen wieder öffnen?' : 'Neue Registrierungen sofort stoppen?',
      public_booking: enabled ? 'Online-Buchungen wieder erlauben?' : 'ALLE Online-Buchungen aller Betriebe pausieren? (Notfall)',
      maintenance: enabled ? 'Wartungsbanner für alle anzeigen?' : 'Wartungsbanner ausblenden?',
    };
    if (!confirm(warn[key])) return;
    await post({ action: 'setting', key, enabled, message });
    load();
  };
  return (
    <div className="admin-grid">
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Not-Schalter</h2>
        </div>
        <div className="panel-body stack">
          <div className="spread">
            <span>
              <strong>Registrierungen</strong>
              <br />
              <small className="muted">Neue Konten erlauben</small>
            </span>
            <Button variant={s.signups?.enabled === false ? 'default' : 'outline'} onClick={() => toggle('signups', s.signups?.enabled === false)}>
              {s.signups?.enabled === false ? 'Gestoppt – öffnen' : 'Offen – stoppen'}
            </Button>
          </div>
          <div className="spread">
            <span>
              <strong>Online-Buchungen</strong>
              <br />
              <small className="muted">Buchungsseiten aller Betriebe</small>
            </span>
            <Button variant={s.public_booking?.enabled === false ? 'default' : 'outline'} onClick={() => toggle('public_booking', s.public_booking?.enabled === false)}>
              {s.public_booking?.enabled === false ? 'Pausiert – fortsetzen' : 'Aktiv – pausieren'}
            </Button>
          </div>
          <div className="stack">
            <strong>Wartungsbanner</strong>
            <textarea maxLength={300} placeholder="z. B. Heute 22–23 Uhr Wartungsarbeiten." value={msg ?? s.maintenance?.message ?? ''} onChange={(e) => setMsg(e.target.value)} />
            <div className="row">
              <Button onClick={() => toggle('maintenance', true, msg ?? s.maintenance?.message ?? '')}>Banner anzeigen</Button>
              {s.maintenance?.enabled && (
                <Button variant="outline" onClick={() => toggle('maintenance', false)}>
                  Ausblenden
                </Button>
              )}
            </div>
            <small className="muted">Wird innerhalb von ca. 1 Minute überall sichtbar.</small>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Service-Mitteilung an alle Betriebe (E-Mail)</h2>
        </div>
        <form
          className="panel-body stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            const test = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') !== 'all';
            if (!test && !confirm('Wirklich an ALLE Betriebe senden? Nur für Service-Infos (Wartung, AGB-Änderung, Sicherheit) – keine Werbung!')) return;
            const r = await post({ action: 'broadcast', subject: f.subject, message: f.message, confirm: true, test }, test ? 'Test an dich gesendet' : 'Versendet');
            if (r) toast.message(`${r.sent}/${r.recipients} zugestellt`);
          }}
        >
          <input name="subject" required minLength={3} maxLength={120} placeholder="Betreff" />
          <textarea name="message" required minLength={10} maxLength={4000} rows={6} placeholder="Nachricht (Absätze mit Leerzeile)" />
          <div className="row">
            <Button type="submit" variant="outline" value="test">
              Test an mich
            </Button>
            <Button type="submit" value="all">
              An alle senden
            </Button>
          </div>
          <small className="muted">Erlaubt sind Service- und Vertragsinformationen. Werbung ohne Einwilligung ist nach § 7 UWG unzulässig.</small>
        </form>
      </section>
    </div>
  );
}

type SearchResult = Record<'businesses' | 'customers' | 'bookings' | 'waitlist' | 'reports' | 'tickets' | 'users', Record<string, string>[]>;
/** One search box for everything on the platform. */
export function GlobalSearch({ onBusiness, onUser }: { onBusiness: (id: string) => void; onUser: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [r, setR] = useState<SearchResult | null>(null);
  const groups: [keyof SearchResult, string, (x: Record<string, string>) => string][] = [
    ['businesses', 'Betriebe', (x) => `${x.name} · /${x.slug} · ${x.email}`],
    ['users', 'Benutzer', (x) => `${x.email}`],
    ['customers', 'Kunden', (x) => `${x.name} · ${x.email || ''} ${x.phone || ''}`],
    ['bookings', 'Termine', (x) => `${x.booking_number} · ${x.customer_name} · ${x.service_name} · ${fmt(x.starts_at)} · ${x.status}`],
    ['tickets', 'Supportfälle', (x) => `${x.case_number} · ${x.subject} · ${x.status}`],
    ['reports', 'Meldungen', (x) => `${x.case_number} · ${categoryDe[x.category] || x.category} · ${x.status}`],
    ['waitlist', 'Warteliste', (x) => `${x.company} · ${x.contact_name} · ${x.email}`],
  ];
  return (
    <section className="panel">
      <form
        className="panel-body row"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            setR(await api<SearchResult>(`${T}?view=search&q=${encodeURIComponent(q)}`));
          } catch (err) {
            toast.error(friendlyError(err, 'de'));
          }
        }}
      >
        <div className="search-field grow">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} minLength={2} maxLength={100} placeholder="Suche: Name, E-Mail, Telefon, Buchungsnummer, Fallnummer, Slug …" aria-label="Globale Suche" />
        </div>
        <Button type="submit">Suchen</Button>
      </form>
      {r && (
        <div className="panel-body stack">
          {groups.map(([key, label, show]) =>
            r[key]?.length ? (
              <div key={key}>
                <small className="muted">
                  {label} ({r[key].length})
                </small>
                {r[key].map((x) => (
                  <button
                    key={x.id}
                    className="search-hit"
                    onClick={() => {
                      if (key === 'businesses') onBusiness(x.id);
                      else if (key === 'users') onUser(x.id);
                      else if (x.business_id) onBusiness(x.business_id);
                    }}
                  >
                    {show(x)}
                  </button>
                ))}
              </div>
            ) : null,
          )}
          {groups.every(([k]) => !r[k]?.length) && <p className="muted">Nichts gefunden.</p>}
        </div>
      )}
    </section>
  );
}

/** Extra security actions inside the user drawer. */
export function UserSecurity({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [d, load] = useView<{ email_confirmed_at: string | null; must_change_password: boolean; factors: { id: string; type: string; status: string; name: string }[]; acceptances: { document: string; version: string; accepted_at: string }[] }>(
    `view=user-security&user=${id}`,
  );
  const [secret, setSecret] = useState('');
  const run = async (payload: Record<string, unknown>, ok: string, ask?: string) => {
    if (ask && !confirm(ask)) return null;
    const r = await post({ ...payload, user_id: id }, ok);
    load();
    onChanged();
    return r;
  };
  return (
    <section className="stack">
      <h3>Sicherheit & Konto</h3>
      {d && (
        <div className="notice">
          E-Mail bestätigt: {d.email_confirmed_at ? fmt(d.email_confirmed_at) : 'nein'} · 2FA: {d.factors.filter((f) => f.status === 'verified').length ? 'aktiv' : 'aus'} · Startpasswort offen:{' '}
          {d.must_change_password ? 'ja' : 'nein'}
          <br />
          Zustimmungen: {d.acceptances.length ? d.acceptances.map((a) => `${a.document} ${a.version} (${fmt(a.accepted_at)})`).join(', ') : 'keine erfasst'}
        </div>
      )}
      <div className="row wrap">
        <Button size="sm" variant="outline" onClick={() => run({ action: 'user-revoke-sessions' }, 'Überall abgemeldet', 'Benutzer auf allen Geräten abmelden?')}>
          Überall abmelden
        </Button>
        {d && !d.email_confirmed_at && (
          <Button size="sm" variant="outline" onClick={() => run({ action: 'user-confirm-email' }, 'E-Mail bestätigt')}>
            E-Mail bestätigen
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const r = await run({ action: 'user-recovery-link' }, 'Link erstellt');
            if (r?.link) setSecret(`Passwort-Link (einmalig, nur sicher weitergeben):\n${r.link}`);
          }}
        >
          Passwort-Link erzeugen
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const r = await run({ action: 'user-temp-password' }, 'Startpasswort gesetzt', 'Neues Startpasswort setzen? Alle Sitzungen werden beendet, die Person muss es beim Login ändern.');
            if (r?.password) setSecret(`Startpasswort (wird nur jetzt angezeigt):\n${r.password}`);
          }}
        >
          Startpasswort setzen
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const email = prompt('Neue E-Mail-Adresse:');
            if (email) await run({ action: 'user-change-email', email }, 'E-Mail geändert');
          }}
        >
          E-Mail ändern
        </Button>
        {!!d?.factors.length && (
          <Button size="sm" variant="outline" onClick={() => run({ action: 'user-mfa-reset' }, '2FA zurückgesetzt', '2FA-Faktoren entfernen? Nur nach sicherer Identitätsprüfung!')}>
            2FA zurücksetzen
          </Button>
        )}
        <Button
          size="sm"
          variant="danger"
          onClick={async () => {
            const c = prompt('Benutzer endgültig löschen? Tippe LÖSCHEN. (Nicht möglich, solange er einen Betrieb besitzt.)');
            if (c === 'LÖSCHEN') await run({ action: 'user-delete', confirm: c }, 'Benutzer gelöscht');
          }}
        >
          <Trash2 size={13} /> Löschen
        </Button>
      </div>
      {secret && (
        <pre className="secret-box" onClick={() => navigator.clipboard.writeText(secret.split('\n').slice(1).join('\n')).then(() => toast.success('Kopiert'))}>
          {secret}
        </pre>
      )}
    </section>
  );
}

/** Admin creates a user account directly (forced password change at first login). */
export function CreateUserButton({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Benutzer anlegen
      </Button>
      <Dialog open={open} onOpenChange={(v) => (setOpen(v), v || setPw(''))} title="Benutzer anlegen">
        {pw ? (
          <pre className="secret-box">Startpasswort (nur jetzt sichtbar):\n{pw}</pre>
        ) : (
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              const r = await post({ action: 'user-create', email: f.email, name: f.name }, 'Benutzer angelegt');
              if (r?.password) {
                setPw(String(r.password));
                onDone();
              }
            }}
          >
            <div className="field">
              <label htmlFor="cu-n">Name</label>
              <input id="cu-n" name="name" required minLength={2} maxLength={100} />
            </div>
            <div className="field">
              <label htmlFor="cu-e">E-Mail</label>
              <input id="cu-e" name="email" type="email" required />
            </div>
            <Button type="submit">Anlegen</Button>
          </form>
        )}
      </Dialog>
    </>
  );
}

/** Free release window, pre-registration gate and voluntary support link. */
export function ReleaseDesk() {
  const [data, load] = useView<{ settings: Record<string, Record<string, unknown>> }>('view=settings');
  if (!data) return <div className="skeleton" style={{ height: 160 }} />;
  const r = (data.settings.release || {}) as { free_from?: string; free_until?: string; invite_only?: boolean };
  const sp = (data.settings.support || {}) as { enabled?: boolean; url?: string; text?: string };
  return (
    <div className="admin-grid" style={{ marginBottom: 18 }}>
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Gratis-Release</h2>
        </div>
        <form
          className="panel-body form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            if (await post({ action: 'release', free_from: f.free_from, free_until: f.free_until, invite_only: f.invite_only === 'on' }, 'Release gespeichert')) load();
          }}
        >
          <div className="field">
            <label htmlFor="rl-from">Kostenlos ab</label>
            <input id="rl-from" name="free_from" type="date" required defaultValue={r.free_from || '2027-01-01'} />
          </div>
          <div className="field">
            <label htmlFor="rl-until">Kostenlos bis</label>
            <input id="rl-until" name="free_until" type="date" required defaultValue={r.free_until || '2027-12-31'} />
          </div>
          <label className="check-label full">
            <input type="checkbox" name="invite_only" defaultChecked={r.invite_only !== false} /> Registrierung nur nach meiner Bestätigung (Voranmeldung → „Bestätigen & Link senden“)
          </label>
          <Button type="submit">Speichern</Button>
          <small className="muted full">Die Daten erscheinen auf Startseite, Tarifseite, im Dashboard und in den AGB-Hinweisen. Änderungen sind nach ca. 1 Minute sichtbar.</small>
        </form>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Freiwillig unterstützen (PayPal-Link)</h2>
        </div>
        <form
          className="panel-body form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            if (await post({ action: 'support', enabled: f.enabled === 'on', url: String(f.url || ''), text: String(f.text || '') }, 'Gespeichert')) load();
          }}
        >
          <div className="field full">
            <label htmlFor="sp-url">Link (z. B. https://paypal.me/deinname)</label>
            <input id="sp-url" name="url" type="url" maxLength={300} defaultValue={sp.url || ''} placeholder="https://paypal.me/…" />
          </div>
          <div className="field full">
            <label htmlFor="sp-text">Eigener Text (optional)</label>
            <input id="sp-text" name="text" maxLength={300} defaultValue={sp.text || ''} placeholder="Hilf mit, die Serverkosten zu decken." />
          </div>
          <label className="check-label full">
            <input type="checkbox" name="enabled" defaultChecked={!!sp.enabled} /> Button „Unterstützen“ auf der Webseite anzeigen
          </label>
          <Button type="submit">Speichern</Button>
          <small className="muted full">Erlaubt sind nur https-Links von paypal.me, PayPal, Ko-fi, Buy Me a Coffee und Stripe. Auf der Seite steht automatisch: freiwillig, ohne Gegenleistung, keine Spendenquittung.</small>
        </form>
      </section>
    </div>
  );
}

type SignatureRow = { user_id: string; version: string; signer_name: string; accepted_at: string; ip_hash: string | null; user_agent: string; email: string; businesses: string[] };
/** Electronic signatures of the terms, plus accounts that have not signed the current version. */
export function SignaturesDesk({ onUser }: { onUser: (id: string) => void }) {
  const [d] = useView<{ version: string; rows: SignatureRow[]; missing: { user_id: string; email: string; businesses: string[] }[] }>('view=signatures');
  const [open, setOpen] = useState<SignatureRow | null>(null);
  if (!d) return <div className="skeleton" style={{ height: 200 }} />;
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head spread">
          <h2 className="panel-title">
            Unterschriften ({d.rows.length}) · aktuelle Version {d.version}
          </h2>
          <a className="btn btn-outline btn-sm" href={`${T}?view=signatures&csv=1`}>
            <Download size={13} /> CSV
          </a>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Unterschrift (Name)</th>
                <th>E-Mail</th>
                <th>Betrieb</th>
                <th>Version</th>
                <th>Zeitpunkt</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r, i) => (
                <tr key={i} onClick={() => setOpen(r)} style={{ cursor: 'pointer' }}>
                  <td>
                    <span className="sign-mini">{r.signer_name}</span>
                  </td>
                  <td>{r.email}</td>
                  <td>{r.businesses.join(', ') || '—'}</td>
                  <td>
                    <span className={`badge ${r.version === d.version ? 'badge-green' : ''}`}>{r.version}</span>
                  </td>
                  <td>{fmt(r.accepted_at)}</td>
                </tr>
              ))}
              {!d.rows.length && (
                <tr>
                  <td colSpan={5} className="muted">
                    Noch keine Unterschriften.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Noch nicht unterschrieben ({d.missing.length})</h2>
        </div>
        <div className="panel-body feed">
          {d.missing.map((m) => (
            <button key={m.user_id} className="search-hit" onClick={() => onUser(m.user_id)}>
              {m.email} {m.businesses.length ? `· ${m.businesses.join(', ')}` : ''}
            </button>
          ))}
          {!d.missing.length && <p className="muted">Alle Konten haben die aktuelle Version unterschrieben.</p>}
          <small className="muted">Diese Konten können das Dashboard erst nach der Unterschrift nutzen.</small>
        </div>
      </section>
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)} title="Nachweis der Unterschrift">
        {open && (
          <div className="stack">
            <div className="sign-preview">{open.signer_name}</div>
            <div className="notice" style={{ fontSize: 13 }}>
              E-Mail: {open.email}
              <br />
              Betrieb: {open.businesses.join(', ') || '—'}
              <br />
              Zeitpunkt: {fmt(open.accepted_at)}
              <br />
              Version: {open.version} (Nutzungsbedingungen, Datenschutzerklärung, AVV)
              <br />
              Netzwerk-Hash: {open.ip_hash || '—'}
              <br />
              Browser: {open.user_agent || '—'}
            </div>
            <Button variant="outline" onClick={() => (onUser(open.user_id), setOpen(null))}>
              Benutzer öffnen
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
