'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Check, ChevronDown, Sparkles, Star, Wand2, AlertTriangle } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { useI18n } from '../providers';
import { useWorkspace } from './shell';
import { api, friendlyError } from '@/lib/api-client';
import { parseBookingText, type ParsedBooking } from '@/lib/ai/parse';
import { suggestSlots, bestSlots } from '@/lib/ai/slots';
import { InfoTip } from '../tutorial';

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export type BookingPrefill = Partial<ParsedBooking> & { text?: string; smart?: boolean };
const vague = /naechst|nächst|irgendwann|nachmittag|vormittag|abends|frueh|früh|spaet|spät|woche|bald|lieber|am liebsten|egal|next|afternoon|morning|evening|soon|whenever|prefer/i;
/** Simple appointment dialog: service → day → time → name. Everything else optional. */
export function BookingDialog({ open, onClose, prefill }: { open: boolean; onClose: () => void; prefill?: BookingPrefill }) {
  const w = useWorkspace(),
    { locale } = useI18n(),
    router = useRouter();
  const de = locale === 'de';
  const tz = w.business.timezone;
  const today = formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
  const services = w.services.filter((s) => s.active);
  const staff = w.staff.filter((s) => s.active);
  const [text, setText] = useState(prefill?.text || '');
  const [serviceId, setServiceId] = useState(prefill?.serviceId || services[0]?.id || '');
  const [date, setDate] = useState(prefill?.date || today);
  const [time, setTime] = useState(prefill?.time || '');
  const [staffId, setStaffId] = useState<string>(prefill?.staffId || '');
  const [name, setName] = useState(prefill?.name || '');
  const [phone, setPhone] = useState(prefill?.phone || '');
  const [email, setEmail] = useState(prefill?.email || '');
  const [notes, setNotes] = useState('');
  const [more, setMore] = useState(!!(prefill?.email || prefill?.phone));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [idempotency] = useState(() => crypto.randomUUID());
  const smart = w.features.includes('smart_slots');
  const slots = useMemo(
    () => (serviceId ? suggestSlots(w, { date, serviceId, staffId: staffId || null }) : []),
    [w, date, serviceId, staffId],
  );
  const best = new Set(smart ? bestSlots(slots, 3).map((s) => s.time) : []);
  const service = services.find((s) => s.id === serviceId);
  const customerMatches = name.length >= 2 ? w.customers.filter((c) => c.name.toLowerCase().includes(name.toLowerCase())).slice(0, 4) : [];
  const [customerId, setCustomerId] = useState<string | null>(null);
  function applyText(value: string) {
    const parsed = parseBookingText(value, { today, services, staff });
    if (parsed.serviceId) setServiceId(parsed.serviceId);
    if (parsed.date) setDate(parsed.date);
    if (parsed.time) setTime(parsed.time);
    if (parsed.staffId) setStaffId(parsed.staffId);
    if (parsed.name) {
      setName(parsed.name);
      setCustomerId(null);
    }
    if (parsed.phone) {
      setPhone(parsed.phone);
      setMore(true);
    }
    if (parsed.email) {
      setEmail(parsed.email);
      setMore(true);
    }
    return parsed;
  }
  const [smartBusy, setSmartBusy] = useState(false);
  const [smartNote, setSmartNote] = useState('');
  /** Local parser first (instant); Groq resolves vague or incomplete sentences. */
  async function smartFill(value: string) {
    if (!value.trim()) return;
    const local = applyText(value);
    setSmartNote('');
    const complete = local.serviceId && local.time && local.name && local.date;
    if (complete && !vague.test(value)) {
      toast.message(de ? `Erkannt: ${local.understood.length} Angaben` : `Understood ${local.understood.length} details`);
      return;
    }
    setSmartBusy(true);
    try {
      const r = await api<{ text?: string; fallback?: boolean; booking?: { serviceId?: string; staffId?: string; date?: string; time?: string; name?: string; phone?: string; notes?: string } }>('/api/ai', 'POST', {
        business: w.business.id,
        locale,
        mode: 'booking',
        messages: [{ role: 'user', content: value }],
      });
      if (r.fallback || !r.booking) {
        if (r.text) setSmartNote(r.text);
        return;
      }
      const b = r.booking;
      if (b.serviceId && services.some((x) => x.id === b.serviceId)) setServiceId(b.serviceId);
      if (b.date) setDate(b.date);
      if (b.time) setTime(b.time);
      if (b.staffId && staff.some((x) => x.id === b.staffId)) {
        setStaffId(b.staffId);
        setMore(true);
      }
      if (b.name) {
        setName(b.name);
        const known = w.customers.find((c) => c.name.toLowerCase() === b.name!.toLowerCase());
        setCustomerId(known ? known.id : null);
        if (known) {
          setPhone(known.phone);
          setEmail(known.email || '');
        }
      }
      if (b.phone) {
        setPhone(b.phone);
        setMore(true);
      }
      if (b.notes) setNotes(b.notes);
      setSmartNote(r.text || '');
    } catch {
      /* the local result stays */
    } finally {
      setSmartBusy(false);
    }
  }
  const autoRan = useRef(false);
  useEffect(() => {
    if (prefill?.smart && prefill.text && !autoRan.current) {
      autoRan.current = true;
      void smartFill(prefill.text);
    }
    // Runs once when opened from the quick-add field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Non-blocking hints. The team may book outside hours on purpose.
  const warnings: string[] = [];
  if (time && service) {
    const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
    const start = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    const end = start + service.duration_minutes;
    if (staffId) {
      const rules = w.availability.filter((a) => a.staff_id === staffId && a.weekday === weekday);
      const inside = rules.some((r) => {
        const rs = Number(r.starts.slice(0, 2)) * 60 + Number(r.starts.slice(3, 5)),
          re = Number(r.ends.slice(0, 2)) * 60 + Number(r.ends.slice(3, 5));
        return rs <= start && re >= end;
      });
      if (!inside) warnings.push(de ? 'Außerhalb der Arbeitszeit dieser Person – du kannst trotzdem speichern.' : 'Outside this person’s working hours – you can still save.');
    }
    const startIso = fromZonedTime(`${date}T${time}:00`, tz).toISOString();
    if (startIso < new Date().toISOString()) warnings.push(de ? 'Dieser Zeitpunkt liegt in der Vergangenheit (Nachtrag).' : 'This time is in the past (back-dated entry).');
  }
  async function save() {
    setError('');
    if (!serviceId) return setError(de ? 'Bitte wähle eine Leistung.' : 'Please choose a service.');
    if (!time) return setError(de ? 'Bitte wähle eine Uhrzeit.' : 'Please choose a time.');
    if (name.trim().length < 2) return setError(de ? 'Bitte gib einen Namen ein.' : 'Please enter a name.');
    setBusy(true);
    try {
      await api(`/api/businesses/${w.business.id}/bookings`, 'POST', {
        service_id: serviceId,
        staff_id: staffId || null,
        customer_id: customerId || undefined,
        starts_at: fromZonedTime(`${date}T${time}:00`, tz).toISOString(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes,
        idempotency_key: idempotency,
      });
      toast.success(de ? 'Termin gespeichert 🎉' : 'Appointment saved 🎉');
      onClose();
      router.refresh();
    } catch (e) {
      setError(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  const dayChips = [0, 1, 2].map((n) => addDays(today, n));
  const fmtDay = (d: string, n: number) =>
    n === 0 ? (de ? 'Heute' : 'Today') : n === 1 ? (de ? 'Morgen' : 'Tomorrow') : new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z'));
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()} title={de ? 'Neuer Termin' : 'New appointment'} description={de ? 'Nur Leistung, Zeit und Name sind nötig.' : 'Only service, time and name are required.'}>
      <div className="booking-dialog">
        {w.features.includes('assistant') && (
          <div className="ai-input">
            <Sparkles size={16} />
            <input
              value={text}
              placeholder={de ? 'KI-Schnelleingabe: „Morgen 14 Uhr Haarschnitt Anna“' : 'AI quick add: “tomorrow 2pm haircut Anna”'}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void smartFill(text);
                }
              }}
              aria-label={de ? 'Termin in einem Satz beschreiben' : 'Describe the appointment in one sentence'}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => smartFill(text)} disabled={!text.trim() || smartBusy}>
              {smartBusy ? <span className="spinner" /> : <Wand2 size={14} />}
              {smartBusy ? (de ? 'KI denkt …' : 'Thinking …') : de ? 'Ausfüllen' : 'Fill in'}
            </button>
          </div>
        )}
        {smartNote && (
          <div className="ai-note fade-in">
            <Sparkles size={14} /> {smartNote}
          </div>
        )}
        <div className="step-block">
          <div className="step-label">
            <span>1</span>
            {de ? 'Leistung' : 'Service'}
          </div>
          {services.length ? (
            <div className="choice-grid">
              {services.map((s) => (
                <button type="button" key={s.id} className={`choice ${serviceId === s.id ? 'on' : ''}`} onClick={() => setServiceId(s.id)}>
                  <span className="choice-dot" style={{ background: s.color }} />
                  <strong>{s.name}</strong>
                  <small>
                    {s.duration_minutes} Min · {new Intl.NumberFormat(locale, { style: 'currency', currency: w.business.currency }).format(s.price_cents / 100)}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <div className="notice">{de ? 'Lege zuerst unter „Leistungen“ eine Leistung an.' : 'Create a service under “Services” first.'}</div>
          )}
        </div>
        <div className="step-block">
          <div className="step-label">
            <span>2</span>
            {de ? 'Tag' : 'Day'}
          </div>
          <div className="row wrap">
            {dayChips.map((d, n) => (
              <button type="button" key={d} className={`chip ${date === d ? 'on' : ''}`} onClick={() => setDate(d)}>
                {fmtDay(d, n)}
              </button>
            ))}
            <input type="date" className="chip-input" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label={de ? 'Anderes Datum' : 'Other date'} />
          </div>
        </div>
        <div className="step-block">
          <div className="step-label">
            <span>3</span>
            {de ? 'Uhrzeit' : 'Time'}
            <InfoTip
              visual="slot-grid"
              text={
                de
                  ? 'Vorschläge sind freie Zeiten laut Wochenplan. ★ = füllt eine Lücke im Kalender (KI-Empfehlung). Du kannst jede beliebige Uhrzeit eingeben – auch außerhalb der Arbeitszeit.'
                  : 'Suggestions are free times from the week plan. ★ = fills a gap (AI pick). You can enter any time, even outside working hours.'
              }
            />
          </div>
          <div className="slot-row">
            {slots.slice(0, 18).map((s) => (
              <button type="button" key={s.time} className={`chip slot ${time === s.time ? 'on' : ''} ${best.has(s.time) ? 'best' : ''}`} onClick={() => setTime(s.time)}>
                {best.has(s.time) && <Star size={11} />}
                {s.time}
              </button>
            ))}
            {!slots.length && <small className="muted">{de ? 'Keine Vorschläge – gib einfach eine Uhrzeit ein.' : 'No suggestions – just type a time.'}</small>}
            <input type="time" step={300} className="chip-input" value={time} onChange={(e) => setTime(e.target.value)} aria-label={de ? 'Eigene Uhrzeit' : 'Custom time'} />
          </div>
        </div>
        <div className="step-block">
          <div className="step-label">
            <span>4</span>
            {de ? 'Kunde' : 'Customer'}
          </div>
          <input
            className="big-input"
            value={name}
            placeholder={de ? 'Name, z. B. Anna Müller' : 'Name, e.g. Anna Miller'}
            onChange={(e) => {
              setName(e.target.value);
              setCustomerId(null);
            }}
            aria-label={de ? 'Name' : 'Name'}
          />
          {!customerId && customerMatches.length > 0 && (
            <div className="row wrap" style={{ marginTop: 8 }}>
              <small className="muted">{de ? 'Bestehende Kunden:' : 'Existing customers:'}</small>
              {customerMatches.map((c) => (
                <button
                  type="button"
                  className="chip"
                  key={c.id}
                  onClick={() => {
                    setCustomerId(c.id);
                    setName(c.name);
                    setPhone(c.phone);
                    setEmail(c.email || '');
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {customerId && <small className="purple">✓ {de ? 'Bestehender Kunde ausgewählt' : 'Existing customer selected'}</small>}
        </div>
        <button type="button" className="more-toggle" onClick={() => setMore(!more)} aria-expanded={more}>
          <ChevronDown size={14} style={{ transform: more ? 'rotate(180deg)' : undefined }} />
          {de ? 'Mitarbeiter, Telefon, E-Mail, Notiz (optional)' : 'Staff, phone, email, note (optional)'}
        </button>
        {more && (
          <div className="stack fade-in">
            <div>
              <div className="field-label">{de ? 'Wer übernimmt?' : 'Who takes it?'}</div>
              <div className="row wrap">
                <button type="button" className={`chip ${!staffId ? 'on' : ''}`} onClick={() => setStaffId('')}>
                  {de ? 'Später zuweisen' : 'Assign later'}
                </button>
                {staff.map((s) => (
                  <button type="button" key={s.id} className={`chip ${staffId === s.id ? 'on' : ''}`} onClick={() => setStaffId(s.id)}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="bd-phone">{de ? 'Telefon' : 'Phone'}</label>
                <input id="bd-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="bd-email">
                  {de ? 'E-Mail' : 'Email'}
                  <InfoTip text={de ? 'Mit E-Mail bekommt der Kunde automatisch Bestätigung und Erinnerung.' : 'With an email the customer automatically gets confirmations and reminders.'} visual="bell" />
                </label>
                <input id="bd-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field full">
                <label htmlFor="bd-notes">{de ? 'Notiz' : 'Note'}</label>
                <textarea id="bd-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </div>
        )}
        {warnings.map((wn) => (
          <div className="notice notice-warn" key={wn}>
            <AlertTriangle size={14} /> {wn}
          </div>
        ))}
        {error && (
          <div role="alert" className="notice notice-error">
            {error}
          </div>
        )}
        <div className="booking-summary">
          <span>
            {service?.name || '—'} · {fmtDay(date, dayChips.indexOf(date) >= 0 ? dayChips.indexOf(date) : 9)}
            {dayChips.indexOf(date) < 0 && ` ${new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'))}`} · {time || '--:--'}
            {name && ` · ${name}`}
          </span>
          <div className="row">
            <Button type="button" variant="outline" onClick={onClose}>
              {de ? 'Abbrechen' : 'Cancel'}
            </Button>
            <Button type="button" onClick={save} disabled={busy || !services.length}>
              {busy ? <span className="spinner" /> : <Check size={15} />}
              {de ? 'Termin speichern' : 'Save appointment'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
