'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  Ban,
  Building2,
  CircleHelp,
  Copy,
  Eye,
  EyeOff,
  Flag,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  Plus,
  RefreshCcw,
  ScrollText,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { Brand } from './brand';
import { Preferences } from './preferences';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { useI18n } from './providers';
import { api, friendlyError } from '@/lib/api-client';
import { riskLabels } from '@/lib/ai/anomaly';
import { reasonLabels } from '@/lib/ai/moderation';
import { industries, industryById } from '@/lib/industries';
import { TutorialProvider, useTutorial } from './tutorial';

type AdminBusiness = {
  id: string;
  name: string;
  slug: string;
  email: string;
  owner_id: string;
  industry: string;
  status: string;
  is_demo: boolean;
  demo_expires_at: string | null;
  created_at: string;
  published: boolean;
  business_entitlements: { plan_id: string } | null;
};
type Account = { id: string; email?: string; created_at?: string; confirmed: boolean; last_sign_in_at?: string; last_activity_at: string | null; banned_until: string | null };
type Report = {
  id: string;
  status: string;
  reason: string;
  reporter_kind: string;
  created_at: string;
  business_id: string;
  messages: { id: string; body: string; sender_kind: string; sender_id: string | null; sender_name: string; conversation_id: string; hidden: boolean; created_at: string } | null;
};
type Flag = { key: string; name: string; description: string; stage: 'off' | 'beta' | 'all' };
type ActivityRow = { id: number; user_id: string | null; business_id: string | null; action: string; details: Record<string, unknown>; ip_hash?: string | null; user_agent?: string | null; created_at: string };
type AdminData = {
  businesses: AdminBusiness[];
  bookingCount: number;
  messageCount: number;
  audit: { id: number; action: string; business_id: string | null; created_at: string; details: Record<string, unknown> }[];
  accounts: Account[];
  notifications: { id: string; business_id: string; kind: string; status: string; last_error: string | null; created_at: string }[];
  reports: Report[];
  flags: Flag[];
  overrides: { business_id: string; flag_key: string; enabled: boolean }[];
  announcements: { id: string; business_id: string | null; title: string; body: string; level: string; created_at: string; expires_at: string | null }[];
  activity: ActivityRow[];
  risks: { user_id: string; score: number; reasons: string[] }[];
  support: { id: string; business_id: string; last_message_at: string }[];
};
type Tab = 'overview' | 'businesses' | 'users' | 'moderation' | 'features' | 'announcements' | 'logs';
const bannedNow = (until: string | null | undefined) => !!until && Date.parse(until) > Date.now();
const fmt = (iso: string | null | undefined, locale: string) =>
  iso ? new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) : '—';
const actionLabel = (a: string) =>
  ({
    'auth.login': 'Angemeldet',
    'auth.logout': 'Abgemeldet',
    'auth.login_failed': 'Anmeldung fehlgeschlagen',
    'auth.signup': 'Registriert',
    'business.created': 'Unternehmen angelegt',
    'bookings.create': 'Termin angelegt',
    'booking-status.create': 'Termin geändert',
    'chat.send': 'Nachricht gesendet',
    'chat.report': 'Nachricht gemeldet',
  })[a] || a;

export function Admin() {
  return (
    <TutorialProvider page="admin">
      <AdminConsole />
    </TutorialProvider>
  );
}
function AdminConsole() {
  const router = useRouter(),
    tutorial = useTutorial();
  const { locale } = useI18n();
  const de = locale === 'de';
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [business, setBusiness] = useState<string | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(await api<AdminData>('/api/admin'));
      setError('');
    } catch (e) {
      setError(friendlyError(e, locale));
    }
  }, [locale]);
  useEffect(() => {
    void load();
  }, [load]);
  const action = useCallback(
    async (payload: Record<string, unknown>, success?: string) => {
      setBusy(true);
      try {
        const r = await api<Record<string, unknown>>('/api/admin', 'POST', payload);
        toast.success(success || (de ? 'Gespeichert' : 'Saved'));
        await load();
        return r;
      } catch (e) {
        toast.error(friendlyError(e, locale));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [de, load, locale],
  );
  const emailOf = useMemo(() => new Map((data?.accounts || []).map((a) => [a.id, a.email || a.id.slice(0, 8)])), [data]);
  const nameOf = useMemo(() => new Map((data?.businesses || []).map((b) => [b.id, b.name])), [data]);
  const openReports = data?.reports.filter((r) => r.status === 'open') || [];
  const nav: [Tab, typeof LayoutDashboard, string, number?][] = [
    ['overview', LayoutDashboard, de ? 'Übersicht' : 'Overview'],
    ['businesses', Building2, de ? 'Unternehmen' : 'Businesses', data?.businesses.length],
    ['users', Users, de ? 'Benutzer' : 'Users', data?.risks.filter((r) => r.score >= 0.5).length || undefined],
    ['moderation', MessageCircle, de ? 'Chats & Meldungen' : 'Chats & reports', openReports.length || undefined],
    ['features', FlaskConical, de ? 'Beta & Funktionen' : 'Beta & features'],
    ['announcements', Megaphone, de ? 'Mitteilungen' : 'Announcements'],
    ['logs', ScrollText, de ? 'Protokolle' : 'Logs'],
  ];
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <Brand />
          <span className="badge badge-dark">
            <ShieldCheck size={12} /> Admin
          </span>
        </div>
        <nav>
          {nav.map(([key, Icon, label, count]) => (
            <button key={key} className={`admin-nav ${tab === key ? 'on' : ''}`} onClick={() => setTab(key)}>
              <Icon size={17} />
              {label}
              {!!count && <span className="admin-count">{count}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-side-bottom">
          <button className="admin-nav" onClick={() => tutorial.start('admin')}>
            <CircleHelp size={17} /> {de ? 'Anleitung' : 'Guide'}
          </button>
          <Link className="admin-nav" href="/dashboard">
            <Building2 size={17} /> {de ? 'Mein Geschäftskonto' : 'My business account'}
          </Link>
          <button
            className="admin-nav"
            onClick={async () => {
              await api('/api/auth', 'POST', { action: 'logout' }).catch(() => null);
              router.push('/admin/login');
              router.refresh();
            }}
          >
            <LogOut size={17} /> {de ? 'Abmelden' : 'Log out'}
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-top">
          <div>
            <h1>{nav.find((n) => n[0] === tab)?.[2]}</h1>
            <p className="muted">{de ? 'Slotdove Control Center · getrennt von deinem Geschäftskonto' : 'Slotdove Control Center · separate from your business account'}</p>
          </div>
          <div className="row">
            <Preferences />
            <Button variant="outline" onClick={() => void load()} disabled={busy}>
              <RefreshCcw size={14} /> {de ? 'Aktualisieren' : 'Refresh'}
            </Button>
            <Button onClick={() => setCreate(true)}>
              <Plus size={15} /> {de ? 'Unternehmen' : 'Business'}
            </Button>
          </div>
        </header>
        {error && (
          <div className="notice notice-error">
            {error} {de ? '(Ist SUPABASE_SECRET_KEY auf dem Server gesetzt?)' : '(Is SUPABASE_SECRET_KEY configured?)'}
          </div>
        )}
        {!data && !error && <div className="skeleton-grid">{Array.from({ length: 6 }, (_, i) => <div className="skeleton" key={i} />)}</div>}
        {data && tab === 'overview' && (
          <>
            <div className="kpi-row six">
              {[
                [de ? 'Unternehmen' : 'Businesses', data.businesses.length],
                [de ? 'Benutzer' : 'Users', data.accounts.length],
                [de ? 'Termine gesamt' : 'Appointments', data.bookingCount],
                [de ? 'Nachrichten (14 T.)' : 'Messages (14d)', data.messageCount],
                [de ? 'Offene Meldungen' : 'Open reports', openReports.length],
                [de ? 'Risiko-Konten' : 'Risky accounts', data.risks.filter((r) => r.score >= 0.5).length],
              ].map(([label, value]) => (
                <div className="kpi" key={String(label)}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="admin-grid">
              <section className="panel">
                <div className="panel-head">
                  <h2 className="panel-title row">
                    <AlertTriangle size={16} className="amber" /> {de ? 'KI-Risikoanalyse' : 'AI risk analysis'}
                  </h2>
                  <small className="muted">{de ? 'letzte 14 Tage' : 'last 14 days'}</small>
                </div>
                <div className="panel-body stack">
                  {data.risks.slice(0, 8).map((r) => (
                    <button key={r.user_id} className="risk-row" onClick={() => setUser(r.user_id)}>
                      <span className={`risk-score ${r.score >= 0.6 ? 'high' : r.score >= 0.3 ? 'mid' : 'low'}`}>{Math.round(r.score * 100)}</span>
                      <span className="grow">
                        <strong>{emailOf.get(r.user_id) || r.user_id}</strong>
                        <small>{r.reasons.map((x) => riskLabels[x.split(':')[0]] + (x.includes(':') ? ` (${x.split(':')[1]})` : '')).join(' · ')}</small>
                      </span>
                    </button>
                  ))}
                  {!data.risks.length && <p className="muted">{de ? 'Keine Auffälligkeiten. 👍' : 'Nothing suspicious. 👍'}</p>}
                </div>
              </section>
              <section className="panel">
                <div className="panel-head">
                  <h2 className="panel-title row">
                    <Activity size={16} /> {de ? 'Live-Aktivität' : 'Live activity'}
                  </h2>
                </div>
                <div className="panel-body feed">
                  {data.activity.slice(0, 14).map((a) => (
                    <div className="feed-row" key={a.id}>
                      <span className="feed-dot" />
                      <span className="grow">
                        <button className="link" onClick={() => a.user_id && setUser(a.user_id)}>
                          {a.user_id ? emailOf.get(a.user_id) : String(a.details?.email || '—')}
                        </button>{' '}
                        {actionLabel(a.action)}
                        {a.business_id && <small> · {nameOf.get(a.business_id)}</small>}
                      </span>
                      <small>{fmt(a.created_at, locale)}</small>
                    </div>
                  ))}
                  {!data.activity.length && <p className="muted">{de ? 'Noch keine Aktivität protokolliert.' : 'No activity logged yet.'}</p>}
                </div>
              </section>
            </div>
            {openReports.length > 0 && (
              <section className="panel" style={{ marginTop: 20 }}>
                <div className="panel-head">
                  <h2 className="panel-title row">
                    <Flag size={16} /> {de ? 'Offene Meldungen' : 'Open reports'}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setTab('moderation')}>
                    {de ? 'Alle ansehen' : 'View all'}
                  </Button>
                </div>
                <ReportList reports={openReports.slice(0, 4)} action={action} nameOf={nameOf} />
              </section>
            )}
          </>
        )}
        {data && tab === 'businesses' && <BusinessTable data={data} emailOf={emailOf} onOpen={setBusiness} />}
        {data && tab === 'users' && <UserTable data={data} onOpen={setUser} />}
        {data && tab === 'moderation' && <Moderation data={data} action={action} nameOf={nameOf} />}
        {data && tab === 'features' && <Features data={data} action={action} />}
        {data && tab === 'announcements' && <Announcements data={data} action={action} nameOf={nameOf} />}
        {data && tab === 'logs' && (
          <div className="admin-grid">
            <section className="panel">
              <div className="panel-head">
                <h2 className="panel-title">{de ? 'Verwaltungsprotokoll' : 'Admin audit log'}</h2>
              </div>
              <div className="panel-body feed">
                {data.audit.map((a) => (
                  <div className="feed-row" key={a.id}>
                    <span className="feed-dot" />
                    <span className="grow">
                      {a.action} {a.business_id && <small>· {nameOf.get(a.business_id)}</small>}
                    </span>
                    <small>{fmt(a.created_at, locale)}</small>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2 className="panel-title">{de ? 'E-Mail-Probleme' : 'Email problems'}</h2>
              </div>
              <div className="panel-body feed">
                {data.notifications.map((n) => (
                  <div className="feed-row" key={n.id}>
                    <span className="feed-dot red" />
                    <span className="grow">
                      {n.kind} · {n.status} <small>{nameOf.get(n.business_id)}</small>
                      {n.last_error && <small className="block">{n.last_error}</small>}
                    </span>
                    <small>{fmt(n.created_at, locale)}</small>
                  </div>
                ))}
                {!data.notifications.length && <p className="muted">{de ? 'Keine fehlgeschlagenen E-Mails.' : 'No failed emails.'}</p>}
              </div>
            </section>
          </div>
        )}
      </main>
      {business && data && <BusinessDrawer id={business} data={data} onClose={() => setBusiness(null)} action={action} emailOf={emailOf} onUser={setUser} />}
      {user && data && <UserDrawer id={user} data={data} onClose={() => setUser(null)} action={action} nameOf={nameOf} onBusiness={(id) => (setUser(null), setBusiness(id))} />}
      <CreateBusiness open={create} onClose={() => setCreate(false)} action={action} />
    </div>
  );
}
type ActionFn = (payload: Record<string, unknown>, success?: string) => Promise<Record<string, unknown> | null>;
function BusinessTable({ data, emailOf, onOpen }: { data: AdminData; emailOf: Map<string, string>; onOpen: (id: string) => void }) {
  const { locale } = useI18n();
  const de = locale === 'de';
  const [q, setQ] = useState('');
  const rows = data.businesses.filter((b) => `${b.name} ${b.slug} ${b.email} ${emailOf.get(b.owner_id)}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={de ? 'Suchen nach Name, Link, E-Mail …' : 'Search name, link, email …'} />
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{de ? 'Unternehmen' : 'Business'}</th>
              <th>{de ? 'Inhaber' : 'Owner'}</th>
              <th>{de ? 'Tarif' : 'Plan'}</th>
              <th>Status</th>
              <th>{de ? 'Erstellt' : 'Created'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="clickable" onClick={() => onOpen(b.id)}>
                <td>
                  <div className="row">
                    <span className="avatar">{industryById(b.industry).emoji}</span>
                    <span>
                      <strong>{b.name}</strong>
                      <small className="block">/b/{b.slug}</small>
                    </span>
                  </div>
                </td>
                <td>{emailOf.get(b.owner_id)}</td>
                <td>
                  <span className="badge badge-purple">{b.business_entitlements?.plan_id || 'free'}</span>
                </td>
                <td>
                  <span className={`badge ${b.status === 'active' ? 'badge-green' : 'badge-red'}`}>{b.status}</span>
                  {b.is_demo && <span className="badge badge-amber">Demo</span>}
                  {b.published && <span className="badge">online</span>}
                </td>
                <td>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(b.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function UserTable({ data, onOpen }: { data: AdminData; onOpen: (id: string) => void }) {
  const { locale } = useI18n();
  const de = locale === 'de';
  const [q, setQ] = useState('');
  const risk = new Map(data.risks.map((r) => [r.user_id, r.score]));
  const rows = data.accounts.filter((a) => (a.email || '').toLowerCase().includes(q.toLowerCase())).sort((a, b) => (risk.get(b.id) || 0) - (risk.get(a.id) || 0));
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={de ? 'E-Mail suchen …' : 'Search email …'} />
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>E-Mail</th>
              <th>{de ? 'Risiko' : 'Risk'}</th>
              <th>Status</th>
              <th>{de ? 'Letzte Anmeldung' : 'Last sign in'}</th>
              <th>{de ? 'Letzte Aktivität' : 'Last activity'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="clickable" onClick={() => onOpen(a.id)}>
                <td>
                  <strong>{a.email}</strong>
                </td>
                <td>{risk.get(a.id) ? <span className={`risk-score ${(risk.get(a.id) || 0) >= 0.6 ? 'high' : (risk.get(a.id) || 0) >= 0.3 ? 'mid' : 'low'}`}>{Math.round((risk.get(a.id) || 0) * 100)}</span> : <span className="muted">–</span>}</td>
                <td>
                  {bannedNow(a.banned_until) ? (
                    <span className="badge badge-red">{de ? 'gesperrt' : 'banned'}</span>
                  ) : a.confirmed ? (
                    <span className="badge badge-green">{de ? 'bestätigt' : 'verified'}</span>
                  ) : (
                    <span className="badge badge-amber">{de ? 'unbestätigt' : 'unverified'}</span>
                  )}
                </td>
                <td>{fmt(a.last_sign_in_at, locale)}</td>
                <td>{fmt(a.last_activity_at, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function ReportList({ reports, action, nameOf }: { reports: Report[]; action: ActionFn; nameOf: Map<string, string> }) {
  const { locale } = useI18n();
  const de = locale === 'de';
  return (
    <div className="panel-body stack">
      {reports.map((r) => (
        <div key={r.id} className={`report-card ${r.status}`}>
          <div className="spread wrap">
            <div className="row wrap">
              <span className={`badge ${r.reporter_kind === 'system' ? 'badge-purple' : 'badge-amber'}`}>{r.reporter_kind === 'system' ? 'KI' : r.reporter_kind === 'customer' ? (de ? 'Kunde' : 'Customer') : de ? 'Mitglied' : 'Member'}</span>
              <small>
                {nameOf.get(r.business_id)} · {fmt(r.created_at, locale)}
              </small>
            </div>
            <span className="badge">{r.status}</span>
          </div>
          <blockquote className={r.messages?.hidden ? 'hidden-msg' : ''}>
            <strong>{r.messages?.sender_name || '—'}:</strong> {r.messages?.body}
          </blockquote>
          <small className="muted">
            {r.reason
              .split(/[,:() ]+/)
              .map((x) => reasonLabels[x]?.[de ? 'de' : 'en'])
              .filter(Boolean)
              .join(', ') || r.reason}
          </small>
          <div className="row wrap">
            {r.messages && (
              <Button size="sm" variant="outline" onClick={() => action({ action: 'hide-message', id: r.messages!.id, hidden: !r.messages!.hidden })}>
                {r.messages.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                {r.messages.hidden ? (de ? 'Wieder anzeigen' : 'Show again') : de ? 'Ausblenden' : 'Hide'}
              </Button>
            )}
            {r.status === 'open' && (
              <>
                <Button size="sm" onClick={() => action({ action: 'report', id: r.id, status: 'resolved' })}>
                  {de ? 'Erledigt' : 'Resolve'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => action({ action: 'report', id: r.id, status: 'dismissed' })}>
                  {de ? 'Unbegründet' : 'Dismiss'}
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
      {!reports.length && <p className="muted">{de ? 'Keine Meldungen.' : 'No reports.'}</p>}
    </div>
  );
}
function Moderation({ data, action, nameOf }: { data: AdminData; action: ActionFn; nameOf: Map<string, string> }) {
  const { locale } = useI18n();
  const de = locale === 'de';
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [support, setSupport] = useState<string | null>(data.support[0]?.business_id || null);
  return (
    <div className="admin-grid">
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{de ? 'Meldungen' : 'Reports'}</h2>
          <div className="tabs">
            {(['open', 'all'] as const).map((f) => (
              <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'open' ? (de ? 'Offen' : 'Open') : de ? 'Alle' : 'All'}
              </button>
            ))}
          </div>
        </div>
        <ReportList reports={data.reports.filter((r) => filter === 'all' || r.status === 'open')} action={action} nameOf={nameOf} />
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{de ? 'Support-Postfach' : 'Support inbox'}</h2>
          <select value={support || ''} onChange={(e) => setSupport(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">{de ? 'Unternehmen wählen' : 'Choose business'}</option>
            {data.businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {data.support.some((s) => s.business_id === b.id) ? ' 💬' : ''}
              </option>
            ))}
          </select>
        </div>
        {support ? <SupportThread businessId={support} conversationId={data.support.find((s) => s.business_id === support)?.id} action={action} /> : <p className="panel-body muted">{de ? 'Wähle ein Unternehmen.' : 'Choose a business.'}</p>}
      </section>
    </div>
  );
}
function ConversationView({ conversationId, action, compact }: { conversationId: string; action: ActionFn; compact?: boolean }) {
  const { locale } = useI18n();
  const [messages, setMessages] = useState<{ id: string; sender_kind: string; sender_name: string; body: string; flagged: boolean; hidden: boolean; created_at: string }[]>([]);
  const load = useCallback(() => api<{ messages: typeof messages }>(`/api/admin?conversation=${conversationId}`).then((r) => setMessages(r.messages)).catch(() => null), [conversationId]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className={`chat-messages admin-thread ${compact ? 'compact' : ''}`}>
      {messages.map((m) => (
        <div key={m.id} className={`bubble-row ${m.sender_kind} ${m.sender_kind === 'admin' ? 'own' : ''}`}>
          <div className={`bubble ${m.flagged ? 'flagged' : ''} ${m.hidden ? 'hidden-msg' : ''}`}>
            <div className="bubble-meta">
              <strong>{m.sender_name}</strong>
              <time>{fmt(m.created_at, locale)}</time>
            </div>
            <p>{m.body}</p>
          </div>
          <button className="report-btn" title={m.hidden ? 'Anzeigen' : 'Ausblenden'} onClick={async () => (await action({ action: 'hide-message', id: m.id, hidden: !m.hidden }), load())}>
            {m.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        </div>
      ))}
      {!messages.length && <p className="muted">—</p>}
    </div>
  );
}
function SupportThread({ businessId, conversationId, action }: { businessId: string; conversationId?: string; action: ActionFn }) {
  const { locale } = useI18n();
  const de = locale === 'de';
  const [text, setText] = useState('');
  const [key, setKey] = useState(0);
  return (
    <div className="panel-body stack">
      {conversationId && <ConversationView key={key + conversationId} conversationId={conversationId} action={action} />}
      <form
        className="chat-input"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          if (await action({ action: 'support-reply', business_id: businessId, text }, de ? 'Gesendet' : 'Sent')) {
            setText('');
            setKey((k) => k + 1);
          }
        }}
      >
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={de ? 'Als Slotdove Support antworten …' : 'Reply as Slotdove support …'} />
        <button className="btn btn-primary btn-icon" aria-label={de ? 'Senden' : 'Send'}>
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
function Features({ data, action }: { data: AdminData; action: ActionFn }) {
  const { locale } = useI18n();
  const de = locale === 'de';
  const [draft, setDraft] = useState({ key: '', name: '', description: '', stage: 'beta' as Flag['stage'] });
  return (
    <div className="stack">
      <div className="notice">
        {de
          ? '„Beta“ = nur für Konten, denen du die Funktion einzeln freischaltest (im Unternehmen unter „Funktionen“). „Alle“ = für jeden aktiv. „Aus“ = niemand.'
          : '“Beta” = only for accounts you enable individually. “All” = everyone. “Off” = no one.'}
      </div>
      <div className="flag-grid">
        {data.flags.map((f) => {
          const enabled = data.overrides.filter((o) => o.flag_key === f.key && o.enabled).length;
          return (
            <div className={`flag-card ${f.stage}`} key={f.key}>
              <div className="spread">
                <strong>{f.name}</strong>
                <code>{f.key}</code>
              </div>
              <p className="muted">{f.description}</p>
              <div className="segmented">
                {(['off', 'beta', 'all'] as const).map((s) => (
                  <button key={s} className={f.stage === s ? 'on' : ''} onClick={() => action({ action: 'flag', ...f, stage: s })}>
                    {s === 'off' ? (de ? 'Aus' : 'Off') : s === 'beta' ? 'Beta' : de ? 'Alle' : 'All'}
                  </button>
                ))}
              </div>
              <small className="muted">
                {enabled} {de ? 'Konten einzeln freigeschaltet' : 'accounts enabled individually'}
              </small>
              <button className="btn btn-ghost btn-sm danger-text" onClick={() => confirm(de ? 'Funktion löschen?' : 'Delete feature?') && action({ action: 'flag-delete', key: f.key })}>
                <Trash2 size={13} /> {de ? 'Löschen' : 'Delete'}
              </button>
            </div>
          );
        })}
      </div>
      <section className="panel panel-body">
        <h3 className="panel-title">{de ? 'Neue Beta-Funktion anlegen' : 'New beta feature'}</h3>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="fk">{de ? 'Schlüssel (für Entwickler)' : 'Key'}</label>
            <input id="fk" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="z_b_online_zahlung" />
          </div>
          <div className="field">
            <label htmlFor="fn">Name</label>
            <input id="fn" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="field full">
            <label htmlFor="fd">{de ? 'Beschreibung' : 'Description'}</label>
            <input id="fd" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
        </div>
        <div className="form-actions">
          <Button disabled={draft.key.length < 2 || draft.name.length < 2} onClick={async () => (await action({ action: 'flag', ...draft })) && setDraft({ key: '', name: '', description: '', stage: 'beta' })}>
            <Plus size={14} /> {de ? 'Anlegen' : 'Create'}
          </Button>
        </div>
      </section>
    </div>
  );
}
function Announcements({ data, action, nameOf }: { data: AdminData; action: ActionFn; nameOf: Map<string, string> }) {
  const { locale } = useI18n();
  const de = locale === 'de';
  const [form, setForm] = useState({ business_id: '', title: '', body: '', level: 'info', days: 14 });
  return (
    <div className="admin-grid">
      <section className="panel panel-body">
        <h3 className="panel-title">{de ? 'Mitteilung senden' : 'Send announcement'}</h3>
        <p className="muted">{de ? 'Erscheint als Banner oben im Dashboard – für alle oder ein einzelnes Konto. Ideal für neue Beta-Versionen.' : 'Shows as a banner in the dashboard – for everyone or a single account.'}</p>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="an-b">{de ? 'Empfänger' : 'Recipient'}</label>
            <select id="an-b" value={form.business_id} onChange={(e) => setForm({ ...form, business_id: e.target.value })}>
              <option value="">{de ? 'Alle Unternehmen' : 'All businesses'}</option>
              {data.businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field full">
            <label htmlFor="an-t">{de ? 'Titel' : 'Title'}</label>
            <input id="an-t" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={de ? 'Neu: Wochenplan-Editor 🎉' : 'New: week plan editor 🎉'} />
          </div>
          <div className="field full">
            <label htmlFor="an-x">Text</label>
            <textarea id="an-x" value={form.body} maxLength={2000} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="an-l">{de ? 'Art' : 'Type'}</label>
            <select id="an-l" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option value="info">Info</option>
              <option value="success">{de ? 'Neuigkeit' : 'News'}</option>
              <option value="warning">{de ? 'Wichtig' : 'Important'}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="an-d">{de ? 'Sichtbar (Tage)' : 'Visible (days)'}</label>
            <input id="an-d" type="number" min={1} max={365} value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} />
          </div>
        </div>
        <div className="form-actions">
          <Button disabled={form.title.length < 2} onClick={async () => (await action({ action: 'announce', ...form, business_id: form.business_id || null }, de ? 'Mitteilung veröffentlicht' : 'Published')) && setForm({ ...form, title: '', body: '' })}>
            <Megaphone size={14} /> {de ? 'Veröffentlichen' : 'Publish'}
          </Button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{de ? 'Aktive Mitteilungen' : 'Announcements'}</h2>
        </div>
        <div className="panel-body stack">
          {data.announcements.map((a) => (
            <div className={`announcement ${a.level}`} key={a.id}>
              <Megaphone size={15} />
              <div className="grow">
                <strong>{a.title}</strong> <small>· {a.business_id ? nameOf.get(a.business_id) : de ? 'alle' : 'all'}</small>
                <small className="block">{a.body}</small>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => action({ action: 'announce-delete', id: a.id })} aria-label={de ? 'Löschen' : 'Delete'}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!data.announcements.length && <p className="muted">{de ? 'Keine Mitteilungen.' : 'None.'}</p>}
        </div>
      </section>
    </div>
  );
}
type BusinessDetail = {
  business: AdminBusiness & Record<string, unknown> & { business_entitlements: { plan_id: string } | null };
  members: { user_id: string; role: string }[];
  notes: string;
  features: { flag_key: string; enabled: boolean }[];
  activity: ActivityRow[];
  conversations: { id: string; kind: string; customer_name: string; last_message_at: string }[];
  bookingCount: number;
  staff: { id: string; name: string; active: boolean }[];
  services: { id: string; name: string; active: boolean; price_cents: number; duration_minutes: number }[];
};
function BusinessDrawer({ id, data, onClose, action, emailOf, onUser }: { id: string; data: AdminData; onClose: () => void; action: ActionFn; emailOf: Map<string, string>; onUser: (id: string) => void }) {
  const { locale } = useI18n(),
    router = useRouter();
  const de = locale === 'de';
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [tab, setTab] = useState<'edit' | 'features' | 'chats' | 'activity'>('edit');
  const [chat, setChat] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const load = useCallback(
    () =>
      api<BusinessDetail>(`/api/admin?business=${id}`)
        .then((d) => {
          setDetail(d);
          setNotes(d.notes);
        })
        .catch((e) => toast.error(friendlyError(e, locale))),
    [id, locale],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const b = detail?.business;
  const run = async (p: Record<string, unknown>, s?: string) => {
    const r = await action(p, s);
    await load();
    return r;
  };
  return (
    <div className="drawer-layer">
      <button className="drawer-scrim" onClick={onClose} aria-label={de ? 'Schließen' : 'Close'} />
      <aside className="drawer">
        <header className="drawer-head">
          <div>
            <h2>{b?.name || '…'}</h2>
            {b && (
              <small className="muted">
                /b/{b.slug} · {emailOf.get(b.owner_id)} · {detail?.bookingCount} {de ? 'Termine' : 'appointments'}
              </small>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={de ? 'Schließen' : 'Close'}>
            <X size={18} />
          </button>
        </header>
        {b && detail && (
          <div className="drawer-body">
            <div className="row wrap">
              <Button
                onClick={async () => {
                  if (await action({ action: 'support', id, start: true }, de ? 'Supportmodus für 2 Std. aktiv' : 'Support mode active for 2 h')) {
                    document.cookie = `slotdove-business=${id};path=/;SameSite=Lax`;
                    router.push('/dashboard');
                  }
                }}
              >
                <UserCog size={15} /> {de ? 'Als Support öffnen & bearbeiten' : 'Open & edit as support'}
              </Button>
              <Button variant="outline" onClick={() => run({ action: 'support', id, start: false }, de ? 'Supportmodus beendet' : 'Support ended')}>
                {de ? 'Support beenden' : 'End support'}
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/b/${b.slug}`} target="_blank">
                  <Eye size={14} /> {de ? 'Buchungsseite' : 'Booking page'}
                </Link>
              </Button>
            </div>
            <div className="row wrap">
              <label className="inline-field">
                {de ? 'Tarif' : 'Plan'}
                <select value={b.business_entitlements?.plan_id || 'free'} onChange={(e) => run({ action: 'access', id, status: b.status, plan: e.target.value })}>
                  <option value="free">Starter (5 €)</option>
                  <option value="pro">Pro (15 €)</option>
                  <option value="business">Business (25 €)</option>
                </select>
              </label>
              <label className="inline-field">
                Status
                <select value={b.status} onChange={(e) => run({ action: 'access', id, status: e.target.value, plan: b.business_entitlements?.plan_id || 'free' })}>
                  <option value="active">{de ? 'aktiv' : 'active'}</option>
                  <option value="suspended">{de ? 'gesperrt' : 'suspended'}</option>
                  <option value="archived">{de ? 'archiviert' : 'archived'}</option>
                </select>
              </label>
            </div>
            <div className="tabs">
              {(
                [
                  ['edit', de ? 'Daten' : 'Details'],
                  ['features', de ? 'Funktionen' : 'Features'],
                  ['chats', de ? 'Chats' : 'Chats'],
                  ['activity', de ? 'Aktivität' : 'Activity'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
                  {l}
                </button>
              ))}
            </div>
            {tab === 'edit' && (
              <>
                <form
                  className="form-grid"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.currentTarget));
                    void run({
                      action: 'edit-business',
                      id,
                      fields: {
                        name: f.name,
                        slug: f.slug,
                        email: f.email,
                        phone: f.phone,
                        industry: f.industry,
                        locale: f.locale,
                        published: f.published === 'on',
                        min_notice_minutes: Number(f.min_notice_minutes),
                        max_advance_days: Number(f.max_advance_days),
                        slot_interval: Number(f.slot_interval),
                      },
                    });
                  }}
                >
                  {(['name', 'slug', 'email', 'phone'] as const).map((k) => (
                    <div className="field" key={k}>
                      <label htmlFor={`ab-${k}`}>{k}</label>
                      <input id={`ab-${k}`} name={k} defaultValue={String(b[k] ?? '')} />
                    </div>
                  ))}
                  <div className="field">
                    <label htmlFor="ab-ind">{de ? 'Branche' : 'Industry'}</label>
                    <select id="ab-ind" name="industry" defaultValue={industryById(b.industry).id}>
                      {industries.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.emoji} {i.de}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="ab-loc">{de ? 'Sprache' : 'Language'}</label>
                    <select id="ab-loc" name="locale" defaultValue={String(b.locale)}>
                      <option value="de">Deutsch</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  {(['min_notice_minutes', 'max_advance_days', 'slot_interval'] as const).map((k) => (
                    <div className="field" key={k}>
                      <label htmlFor={`ab-${k}`}>{k}</label>
                      <input id={`ab-${k}`} name={k} type="number" defaultValue={Number(b[k])} />
                    </div>
                  ))}
                  <label className="check-label">
                    <input type="checkbox" name="published" defaultChecked={b.published} /> {de ? 'Buchungsseite online' : 'Booking page online'}
                  </label>
                  <div className="form-actions full">
                    <Button>{de ? 'Speichern' : 'Save'}</Button>
                  </div>
                </form>
                <div className="field">
                  <label htmlFor="ab-notes">{de ? 'Interne Admin-Notizen (nur für dich sichtbar)' : 'Internal admin notes'}</label>
                  <textarea id="ab-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
                  <Button variant="outline" size="sm" onClick={() => run({ action: 'notes', id, notes })} style={{ marginTop: 8, justifySelf: 'start' }}>
                    {de ? 'Notiz speichern' : 'Save note'}
                  </Button>
                </div>
                <div className="stack">
                  <strong>{de ? 'Mitglieder' : 'Members'}</strong>
                  <button className="link" onClick={() => onUser(b.owner_id)}>
                    👑 {emailOf.get(b.owner_id)} ({de ? 'Inhaber' : 'owner'})
                  </button>
                  {detail.members.map((m) => (
                    <button className="link" key={m.user_id} onClick={() => onUser(m.user_id)}>
                      {emailOf.get(m.user_id)} ({m.role})
                    </button>
                  ))}
                  <small className="muted">
                    {de ? 'Team' : 'Staff'}: {detail.staff.map((s) => s.name).join(', ') || '—'} · {de ? 'Leistungen' : 'Services'}: {detail.services.map((s) => s.name).join(', ') || '—'}
                  </small>
                </div>
                <div className="row wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const email = prompt(de ? 'E-Mail des neuen Inhabers:' : 'New owner email:', b.email);
                      if (!email) return;
                      const r = await action({ action: 'invite-owner', id, email });
                      if (r?.url) {
                        await navigator.clipboard.writeText(String(r.url));
                        toast.success(de ? 'Einladungslink kopiert' : 'Invite link copied');
                      }
                    }}
                  >
                    <Copy size={13} /> {de ? 'Inhaber-Einladung' : 'Owner invite'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      const name = prompt(de ? `Endgültig löschen? Zur Bestätigung exakt „${b.name}“ eingeben.` : `Delete permanently? Type "${b.name}".`);
                      if (name === b.name && (await action({ action: 'delete', id, confirm_name: name }))) onClose();
                    }}
                  >
                    <Trash2 size={13} /> {de ? 'Löschen' : 'Delete'}
                  </Button>
                </div>
              </>
            )}
            {tab === 'features' && (
              <div className="stack">
                {data.flags.map((f) => {
                  const o = detail.features.find((x) => x.flag_key === f.key);
                  const value = o ? (o.enabled ? 'on' : 'off') : 'default';
                  return (
                    <div className="spread feature-row" key={f.key}>
                      <span>
                        <strong>{f.name}</strong>
                        <small className="block muted">
                          {de ? 'Standard' : 'Default'}: {f.stage === 'all' ? (de ? 'an' : 'on') : de ? 'aus' : 'off'}
                        </small>
                      </span>
                      <div className="segmented">
                        {(['default', 'on', 'off'] as const).map((v) => (
                          <button key={v} className={value === v ? 'on' : ''} onClick={() => run({ action: 'override', id, key: f.key, enabled: v === 'default' ? null : v === 'on' })}>
                            {v === 'default' ? 'Standard' : v === 'on' ? (de ? 'An' : 'On') : de ? 'Aus' : 'Off'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {tab === 'chats' && (
              <div className="stack">
                <div className="row wrap">
                  {detail.conversations.map((c) => (
                    <button key={c.id} className={`chip ${chat === c.id ? 'on' : ''}`} onClick={() => setChat(c.id)}>
                      {c.kind === 'team' ? 'Team' : c.kind === 'support' ? 'Support' : c.customer_name}
                    </button>
                  ))}
                  {!detail.conversations.length && <p className="muted">{de ? 'Keine Chats.' : 'No chats.'}</p>}
                </div>
                {chat && <ConversationView key={chat} conversationId={chat} action={action} compact />}
              </div>
            )}
            {tab === 'activity' && <ActivityFeed rows={detail.activity} emailOf={emailOf} />}
          </div>
        )}
      </aside>
    </div>
  );
}
function ActivityFeed({ rows, emailOf, nameOf }: { rows: ActivityRow[]; emailOf?: Map<string, string>; nameOf?: Map<string, string> }) {
  const { locale } = useI18n();
  return (
    <div className="feed">
      {rows.map((a) => (
        <div className="feed-row" key={a.id}>
          <span className={`feed-dot ${a.action.includes('failed') || a.action.includes('delete') ? 'red' : ''}`} />
          <span className="grow">
            {emailOf && a.user_id && <strong>{emailOf.get(a.user_id)} </strong>}
            {actionLabel(a.action)}
            {nameOf && a.business_id && <small> · {nameOf.get(a.business_id)}</small>}
            {a.user_agent && <small className="block muted">{a.user_agent.slice(0, 80)}</small>}
          </span>
          <small>{fmt(a.created_at, locale)}</small>
        </div>
      ))}
      {!rows.length && <p className="muted">—</p>}
    </div>
  );
}
type UserDetail = {
  user: { id: string; email?: string; created_at: string; last_sign_in_at?: string; confirmed: boolean; banned_until: string | null; name: string };
  activity: ActivityRow[];
  owned: { id: string; name: string; slug: string; status: string }[];
  memberships: { role: string; businesses: { id: string; name: string } | null }[];
  messages: { id: string; body: string; flagged: boolean; hidden: boolean; created_at: string }[];
};
function UserDrawer({ id, data, onClose, action, nameOf, onBusiness }: { id: string; data: AdminData; onClose: () => void; action: ActionFn; nameOf: Map<string, string>; onBusiness: (id: string) => void }) {
  const { locale } = useI18n();
  const de = locale === 'de';
  const [d, setD] = useState<UserDetail | null>(null);
  const load = useCallback(() => api<UserDetail>(`/api/admin?user=${id}`).then(setD).catch((e) => toast.error(friendlyError(e, locale))), [id, locale]);
  useEffect(() => {
    void load();
  }, [load]);
  const risk = data.risks.find((r) => r.user_id === id);
  const banned = bannedNow(d?.user.banned_until);
  const ips = new Set(d?.activity.map((a) => a.ip_hash).filter(Boolean));
  return (
    <div className="drawer-layer">
      <button className="drawer-scrim" onClick={onClose} aria-label={de ? 'Schließen' : 'Close'} />
      <aside className="drawer">
        <header className="drawer-head">
          <div>
            <h2>{d?.user.email || '…'}</h2>
            {d && (
              <small className="muted">
                {d.user.name && `${d.user.name} · `}
                {de ? 'seit' : 'since'} {fmt(d.user.created_at, locale)} · {de ? 'letzte Anmeldung' : 'last sign in'} {fmt(d.user.last_sign_in_at, locale)}
              </small>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={de ? 'Schließen' : 'Close'}>
            <X size={18} />
          </button>
        </header>
        {d && (
          <div className="drawer-body">
            <div className="kpi-row three">
              <div className="kpi">
                <small>{de ? 'Risiko' : 'Risk'}</small>
                <strong>{risk ? Math.round(risk.score * 100) : 0}</strong>
              </div>
              <div className="kpi">
                <small>{de ? 'Aktionen (protokolliert)' : 'Actions logged'}</small>
                <strong>{d.activity.length}</strong>
              </div>
              <div className="kpi">
                <small>{de ? 'Netzwerke' : 'Networks'}</small>
                <strong>{ips.size}</strong>
              </div>
            </div>
            {risk && <div className="notice notice-warn">{risk.reasons.map((x) => riskLabels[x.split(':')[0]]).join(' · ')}</div>}
            <div className="row wrap">
              {banned ? (
                <Button variant="outline" onClick={async () => (await action({ action: 'ban', user_id: id, hours: 0 }, de ? 'Entsperrt' : 'Unbanned'), load())}>
                  {de ? 'Entsperren' : 'Unban'}
                </Button>
              ) : (
                <>
                  <Button variant="danger" onClick={async () => confirm(de ? 'Benutzer 24 Stunden sperren?' : 'Ban for 24 hours?') && (await action({ action: 'ban', user_id: id, hours: 24 }, de ? 'Gesperrt' : 'Banned'), load())}>
                    <Ban size={14} /> {de ? '24 Std. sperren' : 'Ban 24 h'}
                  </Button>
                  <Button variant="outline" onClick={async () => confirm(de ? 'Benutzer dauerhaft sperren?' : 'Ban permanently?') && (await action({ action: 'ban', user_id: id, hours: 876000 }, de ? 'Gesperrt' : 'Banned'), load())}>
                    {de ? 'Dauerhaft sperren' : 'Ban permanently'}
                  </Button>
                </>
              )}
            </div>
            <div className="stack">
              <strong>{de ? 'Unternehmen' : 'Businesses'}</strong>
              {d.owned.map((b) => (
                <button key={b.id} className="link" onClick={() => onBusiness(b.id)}>
                  👑 {b.name} ({b.status})
                </button>
              ))}
              {d.memberships.map((m) =>
                m.businesses ? (
                  <button key={m.businesses.id} className="link" onClick={() => onBusiness(m.businesses!.id)}>
                    {m.businesses.name} ({m.role})
                  </button>
                ) : null,
              )}
              {!d.owned.length && !d.memberships.length && <small className="muted">—</small>}
            </div>
            {d.messages.length > 0 && (
              <div className="stack">
                <strong>{de ? 'Letzte Nachrichten' : 'Recent messages'}</strong>
                {d.messages.slice(0, 20).map((m) => (
                  <div key={m.id} className={`mini-msg ${m.flagged ? 'flagged' : ''}`}>
                    <small>{fmt(m.created_at, locale)}</small> {m.body}
                  </div>
                ))}
              </div>
            )}
            <strong>{de ? 'Aktivitätsverlauf' : 'Activity timeline'}</strong>
            <ActivityFeed rows={d.activity} nameOf={nameOf} />
          </div>
        )}
      </aside>
    </div>
  );
}
function CreateBusiness({ open, onClose, action }: { open: boolean; onClose: () => void; action: ActionFn }) {
  const { locale } = useI18n();
  const de = locale === 'de';
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()} title={de ? 'Unternehmen anlegen' : 'Create business'}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget));
          if (await action({ ...f, action: 'create', is_demo: f.is_demo === 'on', currency: 'EUR' })) onClose();
        }}
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor="cb-name">Name</label>
            <input id="cb-name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="cb-slug">Link (/b/…)</label>
            <input id="cb-slug" name="slug" required pattern="[a-z][a-z0-9-]{2,49}" />
          </div>
          <div className="field">
            <label htmlFor="cb-email">E-Mail</label>
            <input id="cb-email" name="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="cb-ind">{de ? 'Branche' : 'Industry'}</label>
            <select id="cb-ind" name="industry">
              {industries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.emoji} {i.de}
                </option>
              ))}
            </select>
          </div>
          <input type="hidden" name="timezone" value="Europe/Berlin" />
          <div className="field">
            <label htmlFor="cb-loc">{de ? 'Sprache' : 'Language'}</label>
            <select id="cb-loc" name="locale" defaultValue="de">
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="cb-plan">{de ? 'Tarif' : 'Plan'}</label>
            <select id="cb-plan" name="plan">
              <option value="free">Starter (5 €)</option>
              <option value="pro">Pro (15 €)</option>
              <option value="business">Business (25 €)</option>
            </select>
          </div>
          <label className="check-label full">
            <input type="checkbox" name="is_demo" /> Demo · 14 {de ? 'Tage' : 'days'}
          </label>
        </div>
        <div className="form-actions">
          <Button>
            <Plus size={14} /> {de ? 'Anlegen' : 'Create'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
