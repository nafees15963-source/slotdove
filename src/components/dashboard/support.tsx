'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, LifeBuoy, Plus, Send, ShieldAlert, Sparkles, Lock } from 'lucide-react';
import { useWorkspace } from './shell';
import { useI18n } from '../providers';
import { Heading } from './common';
import { Button } from '../ui/button';
import { api, friendlyError } from '@/lib/api-client';
import { SearchIndex } from '@/lib/ai/text';
import { faq } from '@/lib/tutorials';

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
type Ticket = { id: string; case_number: string; subject: string; category: string; priority: string; status: TicketStatus; last_reply_by: string; created_at: string; updated_at: string };
type Message = { id: string; author_kind: 'user' | 'admin' | 'system'; author_name: string; body: string; created_at: string; internal?: boolean };
export const statusLabel: Record<TicketStatus, [string, string, string]> = {
  open: ['Offen', 'Open', 'badge-amber'],
  in_progress: ['In Bearbeitung', 'In progress', 'badge-purple'],
  waiting: ['Antwort da', 'Answered', 'badge-green'],
  resolved: ['Gelöst', 'Resolved', 'badge-green'],
  closed: ['Geschlossen', 'Closed', ''],
};
export const categories: Record<string, [string, string, string]> = {
  question: ['Frage', 'Question', '💬'],
  bug: ['Fehler / Problem', 'Bug / problem', '🐞'],
  billing: ['Tarif & Rechnung', 'Plan & billing', '💳'],
  account: ['Konto & Zugang', 'Account & access', '🔑'],
  security: ['Sicherheit / Missbrauch', 'Security / abuse', '🛡️'],
  feature: ['Wunsch / Idee', 'Wish / idea', '💡'],
  other: ['Sonstiges', 'Other', '📎'],
};
export const priorities: Record<string, [string, string]> = {
  low: ['Niedrig', 'Low'],
  normal: ['Normal', 'Normal'],
  high: ['Hoch', 'High'],
  urgent: ['Dringend', 'Urgent'],
};
const fmt = (iso: string, locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
export function SupportDesk() {
  const w = useWorkspace(),
    { locale } = useI18n();
  const de = locale === 'de';
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [open, setOpen] = useState<string | 'new' | null>(null);
  const load = useCallback(() => api<{ tickets: Ticket[] }>(`/api/support?business=${w.business.id}`).then((r) => setTickets(r.tickets)).catch(() => setTickets([])), [w.business.id]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      <Heading
        title={de ? 'Hilfe & Support' : 'Help & support'}
        description={de ? 'Jede Anfrage bekommt eine Fallnummer. Das Slotdove-Team antwortet hier.' : 'Every request gets a case number. The Slotdove team replies here.'}
        action={
          <Button onClick={() => setOpen('new')}>
            <Plus size={15} /> {de ? 'Neue Anfrage' : 'New request'}
          </Button>
        }
      />
      <div className="support-layout">
        <aside className="panel support-list">
          {tickets === null && <div className="panel-body muted">{de ? 'Wird geladen …' : 'Loading …'}</div>}
          {tickets?.length === 0 && (
            <div className="panel-body empty-cta">
              <LifeBuoy size={28} />
              <p>{de ? 'Noch keine Anfragen. Wir helfen dir gern!' : 'No requests yet. We are happy to help!'}</p>
            </div>
          )}
          {tickets?.map((t) => (
            <button key={t.id} className={`ticket-row ${open === t.id ? 'on' : ''}`} onClick={() => setOpen(t.id)}>
              <div className="spread">
                <code>{t.case_number}</code>
                <span className={`badge ${statusLabel[t.status][2]}`}>{statusLabel[t.status][de ? 0 : 1]}</span>
              </div>
              <strong>
                {categories[t.category]?.[2]} {t.subject}
              </strong>
              <small className="muted">{fmt(t.updated_at, locale)}</small>
            </button>
          ))}
        </aside>
        <section className="panel support-detail">
          {open === 'new' ? (
            <NewTicket
              onDone={(id) => {
                void load();
                setOpen(id);
              }}
              onCancel={() => setOpen(null)}
            />
          ) : open ? (
            <TicketThread id={open} onChange={load} onBack={() => setOpen(null)} />
          ) : (
            <div className="panel-body empty-cta">
              <LifeBuoy size={30} />
              <h3>{de ? 'Wie können wir helfen?' : 'How can we help?'}</h3>
              <p className="muted">{de ? 'Wähle links eine Anfrage oder starte eine neue. Viele Fragen beantwortet auch die KI sofort.' : 'Pick a request or start a new one. The AI answers many questions instantly.'}</p>
              <Button onClick={() => setOpen('new')}>
                <Plus size={15} /> {de ? 'Neue Anfrage' : 'New request'}
              </Button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
function NewTicket({ onDone, onCancel }: { onDone: (id: string) => void; onCancel: () => void }) {
  const w = useWorkspace(),
    { locale } = useI18n();
  const de = locale === 'de';
  const [category, setCategory] = useState('question');
  const [priority, setPriority] = useState('normal');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const index = useMemo(() => new SearchIndex(faq, (f) => `${f.q[de ? 0 : 1]} ${f.a[de ? 0 : 1]}`), [de]);
  const hints = subject.length > 4 ? index.search(`${subject} ${text}`, 2) : [];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ ticket: { id: string; case_number: string } }>('/api/support', 'POST', { business: w.business.id, action: 'create', subject, text, category, priority });
      toast.success(de ? `Anfrage ${r.ticket.case_number} erstellt` : `Request ${r.ticket.case_number} created`);
      onDone(r.ticket.id);
    } catch (err) {
      toast.error(friendlyError(err, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel-body stack" onSubmit={submit}>
      <h3 className="panel-title">{de ? 'Neue Anfrage' : 'New request'}</h3>
      <div>
        <div className="field-label">{de ? 'Worum geht es?' : 'What is it about?'}</div>
        <div className="row wrap">
          {Object.entries(categories).map(([k, v]) => (
            <button type="button" key={k} className={`chip ${category === k ? 'on' : ''}`} onClick={() => setCategory(k)}>
              {v[2]} {v[de ? 0 : 1]}
            </button>
          ))}
        </div>
      </div>
      {category === 'security' && (
        <div className="notice notice-warn">
          <ShieldAlert size={15} /> {de ? 'Sicherheitsmeldungen werden automatisch als dringend behandelt.' : 'Security reports are handled as urgent automatically.'}
        </div>
      )}
      <div className="field">
        <label htmlFor="t-subject">{de ? 'Betreff' : 'Subject'}</label>
        <input id="t-subject" value={subject} onChange={(e) => setSubject(e.target.value)} minLength={3} maxLength={160} required placeholder={de ? 'z. B. Kunden können nicht buchen' : 'e.g. customers cannot book'} />
      </div>
      {hints.length > 0 && (
        <div className="ai-hints">
          <strong>
            <Sparkles size={14} /> {de ? 'Vielleicht hilft das sofort:' : 'This might help right away:'}
          </strong>
          {hints.map((h) => (
            <div key={h.item.q[0]} className="ai-hint">
              <span>{h.item.a[de ? 0 : 1]}</span>
              {h.item.href && (
                <Link href={h.item.href} className="purple">
                  {de ? 'Öffnen' : 'Open'} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="field">
        <label htmlFor="t-text">{de ? 'Beschreibung' : 'Description'}</label>
        <textarea id="t-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} maxLength={8000} required placeholder={de ? 'Was ist passiert? Welche Seite? Gibt es eine Buchungsnummer (SD-…)?' : 'What happened? Which page? Is there a booking number (SD-…)?'} />
      </div>
      <div className="field">
        <label htmlFor="t-prio">{de ? 'Dringlichkeit' : 'Urgency'}</label>
        <select id="t-prio" value={priority} onChange={(e) => setPriority(e.target.value)} disabled={category === 'security'}>
          {Object.entries(priorities).map(([k, v]) => (
            <option key={k} value={k}>
              {v[de ? 0 : 1]}
            </option>
          ))}
        </select>
      </div>
      <div className="form-actions">
        <Button type="button" variant="outline" onClick={onCancel}>
          {de ? 'Abbrechen' : 'Cancel'}
        </Button>
        <Button disabled={busy || subject.trim().length < 3 || !text.trim()}>
          {busy ? <span className="spinner" /> : <Send size={15} />} {de ? 'Absenden' : 'Send'}
        </Button>
      </div>
    </form>
  );
}
function TicketThread({ id, onChange, onBack }: { id: string; onChange: () => void; onBack: () => void }) {
  const w = useWorkspace(),
    { locale } = useI18n();
  const de = locale === 'de';
  const [data, setData] = useState<{ ticket: Ticket; messages: Message[] } | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<{ ticket: Ticket; messages: Message[] }>(`/api/support?business=${w.business.id}&ticket=${id}`).then(setData).catch(() => null), [id, w.business.id]);
  useEffect(() => {
    setData(null);
    void load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 15000);
    return () => clearInterval(timer);
  }, [load]);
  async function send(action: 'reply' | 'close' | 'reopen') {
    setBusy(true);
    try {
      await api('/api/support', 'POST', { business: w.business.id, ticket: id, action, text: action === 'reply' ? text : undefined });
      if (action === 'reply') setText('');
      await load();
      onChange();
    } catch (err) {
      toast.error(friendlyError(err, locale));
    } finally {
      setBusy(false);
    }
  }
  if (!data) return <div className="panel-body muted">{de ? 'Wird geladen …' : 'Loading …'}</div>;
  const t = data.ticket;
  const closed = ['resolved', 'closed'].includes(t.status);
  return (
    <div className="ticket-thread">
      <header>
        <button className="btn btn-ghost btn-icon show-md" onClick={onBack} aria-label={de ? 'Zurück' : 'Back'}>
          <ArrowLeft size={16} />
        </button>
        <div className="grow">
          <div className="row wrap">
            <code className="case-no">{t.case_number}</code>
            <span className={`badge ${statusLabel[t.status][2]}`}>{statusLabel[t.status][de ? 0 : 1]}</span>
            <span className="badge">
              {categories[t.category]?.[2]} {categories[t.category]?.[de ? 0 : 1]}
            </span>
          </div>
          <h3>{t.subject}</h3>
        </div>
        {closed ? (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => send('reopen')}>
            {de ? 'Wieder öffnen' : 'Reopen'}
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => send('close')}>
            {de ? 'Erledigt – schließen' : 'Done – close'}
          </Button>
        )}
      </header>
      <div className="chat-messages">
        {data.messages.map((m) =>
          m.author_kind === 'system' ? (
            <div key={m.id} className="system-line">
              {m.body} · {fmt(m.created_at, locale)}
            </div>
          ) : (
            <div key={m.id} className={`bubble-row ${m.author_kind === 'user' ? 'own' : 'admin'}`}>
              <div className="bubble">
                <div className="bubble-meta">
                  <strong>{m.author_kind === 'admin' ? '🛡️ Slotdove Support' : m.author_name}</strong>
                  <time>{fmt(m.created_at, locale)}</time>
                </div>
                <p>{m.body}</p>
              </div>
            </div>
          ),
        )}
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void send('reply');
        }}
      >
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={8000} placeholder={closed ? (de ? 'Antworten öffnet den Fall wieder …' : 'Replying reopens the case …') : de ? 'Antwort schreiben …' : 'Write a reply …'} aria-label={de ? 'Antwort' : 'Reply'} />
        <button className="btn btn-primary btn-icon" disabled={busy || !text.trim()} aria-label={de ? 'Senden' : 'Send'}>
          <Send size={15} />
        </button>
      </form>
      <p className="support-privacy">
        <Lock size={12} /> {de ? 'Nur du, dein Team und das Slotdove-Team sehen diese Anfrage.' : 'Only you, your team and the Slotdove team can see this request.'}
      </p>
    </div>
  );
}
