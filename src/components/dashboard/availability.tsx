'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { CalendarOff, Copy, Plus, Trash2, Save, PartyPopper, Coffee, X, Users } from 'lucide-react';
import { useWorkspace } from './shell';
import { useI18n } from '../providers';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Heading } from './common';
import { api, friendlyError } from '@/lib/api-client';
import { germanHolidays, germanStates } from '@/lib/holidays';
import { InfoTip } from '../tutorial';

type Period = { starts: string; ends: string };
type Week = Record<number, Period[]>;
const order = [1, 2, 3, 4, 5, 6, 0];
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
function weekFor(rules: { weekday: number; starts: string; ends: string }[]): Week {
  const week: Week = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const r of rules) week[r.weekday].push({ starts: r.starts.slice(0, 5), ends: r.ends.slice(0, 5) });
  for (const d of order) week[d].sort((a, b) => a.starts.localeCompare(b.starts));
  return week;
}
export function Availability() {
  const w = useWorkspace(),
    { locale } = useI18n(),
    router = useRouter();
  const de = locale === 'de';
  const active = w.staff.filter((s) => s.active);
  const [staffId, setStaffId] = useState(active[0]?.id || '');
  const [week, setWeek] = useState<Week>(() => weekFor(w.availability.filter((a) => a.staff_id === active[0]?.id)));
  const [dirty, setDirty] = useState(false);
  const [applyAll, setApplyAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'holidays' | 'absence' | null>(null);
  useEffect(() => {
    setWeek(weekFor(w.availability.filter((a) => a.staff_id === staffId)));
    setDirty(false);
  }, [staffId, w.availability]);
  const dayName = (d: number, style: 'long' | 'short' = 'long') => new Intl.DateTimeFormat(locale, { weekday: style }).format(new Date(2026, 10, 1 + d));
  function update(next: Week) {
    setWeek(next);
    setDirty(true);
  }
  const setDay = (d: number, periods: Period[]) => update({ ...week, [d]: periods });
  function toggle(d: number) {
    const prev = order.map((x) => week[x]).find((p) => p.length);
    setDay(d, week[d].length ? [] : prev ? prev.map((p) => ({ ...p })) : [{ starts: '09:00', ends: '18:00' }]);
  }
  function addBreak(d: number) {
    const last = week[d][week[d].length - 1];
    if (!last) return;
    const s = toMin(last.starts),
      e = toMin(last.ends);
    if (e - s < 120) return toast.error(de ? 'Der Zeitraum ist zu kurz für eine Pause.' : 'Too short for a break.');
    const mid = Math.round((s + (e - s) / 2) / 30) * 30;
    setDay(d, [...week[d].slice(0, -1), { starts: last.starts, ends: toTime(mid - 30) }, { starts: toTime(mid + 30), ends: last.ends }]);
  }
  function copyToWeekdays(from: number) {
    const next = { ...week };
    for (const d of [1, 2, 3, 4, 5]) next[d] = week[from].map((p) => ({ ...p }));
    update(next);
    toast.success(de ? 'Auf Mo–Fr übernommen' : 'Copied to Mon–Fri');
  }
  function preset(days: number[], starts: string, ends: string, pause = false) {
    const next: Week = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const d of days) next[d] = pause ? [{ starts, ends: '12:30' }, { starts: '13:30', ends }] : [{ starts, ends }];
    update(next);
  }
  const invalid = order.some((d) => week[d].some((p, i) => p.ends <= p.starts || (i > 0 && p.starts < week[d][i - 1].ends)));
  async function save() {
    if (invalid) return toast.error(de ? 'Bitte prüfe die Zeiten: Ende muss nach Beginn liegen, Zeiträume dürfen sich nicht überschneiden.' : 'Check times: end after start, no overlaps.');
    setBusy(true);
    try {
      const rules = order.flatMap((weekday) => week[weekday].map((p) => ({ weekday, ...p })));
      await api(`/api/businesses/${w.business.id}/week-plan-replace`, 'POST', { staff_ids: applyAll ? active.map((s) => s.id) : [staffId], rules });
      toast.success(de ? 'Wochenplan gespeichert ✅' : 'Week plan saved ✅');
      setDirty(false);
      router.refresh();
    } catch (e) {
      toast.error(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  async function createMe() {
    try {
      await api(`/api/businesses/${w.business.id}/staff`, 'POST', { name: de ? 'Ich' : 'Me', active: true });
      router.refresh();
    } catch (e) {
      toast.error(friendlyError(e, locale));
    }
  }
  const total = order.reduce((s, d) => s + week[d].reduce((x, p) => x + Math.max(0, toMin(p.ends) - toMin(p.starts)), 0), 0);
  const blocks = w.blocks.filter((b) => b.ends_at > new Date().toISOString()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return (
    <>
      <Heading
        title={de ? 'Arbeitszeiten & freie Tage' : 'Working hours & days off'}
        description={de ? 'Wann arbeitet wer? Daraus entstehen die freien Zeiten für Online-Buchungen.' : 'Who works when? This defines free times for online booking.'}
        action={
          <>
            <Button variant="outline" onClick={() => setDialog('holidays')} disabled={!active.length} data-tour="holidays">
              <PartyPopper size={15} /> {de ? 'Feiertage eintragen' : 'Add public holidays'}
            </Button>
            <Button variant="outline" onClick={() => setDialog('absence')} disabled={!active.length}>
              <CalendarOff size={15} /> {de ? 'Abwesenheit' : 'Time off'}
            </Button>
          </>
        }
      />
      {!active.length ? (
        <div className="panel panel-body empty-cta">
          <Users size={28} />
          <h3>{de ? 'Noch niemand im Team' : 'No one in the team yet'}</h3>
          <p>{de ? 'Arbeitszeiten gehören zu einer Person. Leg dich selbst als erstes Profil an – dauert eine Sekunde.' : 'Hours belong to a person. Add yourself as the first profile.'}</p>
          <Button onClick={createMe}>
            <Plus size={15} /> {de ? 'Mich hinzufügen' : 'Add me'}
          </Button>
        </div>
      ) : (
        <div className="avail-layout">
          <div className="panel" data-tour="week-plan">
            <div className="panel-head wrap">
              <div className="row wrap">
                {active.map((s) => (
                  <button key={s.id} className={`chip ${s.id === staffId ? 'on' : ''}`} onClick={() => (dirty && !confirm(de ? 'Ungespeicherte Änderungen verwerfen?' : 'Discard unsaved changes?') ? null : setStaffId(s.id))}>
                    <span className="avatar xs">{s.name.slice(0, 1)}</span>
                    {s.name}
                  </button>
                ))}
              </div>
              <small className="muted">
                {Math.floor(total / 60)} {de ? 'Std./Woche' : 'h/week'}
              </small>
            </div>
            <div className="panel-body">
              <div className="row wrap preset-row">
                <small className="muted">{de ? 'Schnell:' : 'Quick:'}</small>
                <button className="chip" onClick={() => preset([1, 2, 3, 4, 5], '09:00', '18:00')}>
                  {de ? 'Mo–Fr 9–18' : 'Mon–Fri 9–6'}
                </button>
                <button className="chip" onClick={() => preset([1, 2, 3, 4, 5], '09:00', '18:00', true)}>
                  {de ? 'Mo–Fr mit Mittagspause' : 'Mon–Fri with lunch'}
                </button>
                <button className="chip" onClick={() => preset([1, 2, 3, 4, 5, 6], '09:00', '18:00')}>
                  {de ? 'Mo–Sa 9–18' : 'Mon–Sat 9–6'}
                </button>
                <button className="chip" onClick={() => preset([2, 3, 4, 5, 6], '10:00', '20:00')}>
                  {de ? 'Di–Sa 10–20' : 'Tue–Sat 10–8'}
                </button>
              </div>
              <div className="week-editor">
                {order.map((d) => {
                  const on = week[d].length > 0;
                  return (
                    <div className={`week-row ${on ? 'on' : ''}`} key={d}>
                      <label className="switch">
                        <input type="checkbox" checked={on} onChange={() => toggle(d)} aria-label={dayName(d)} />
                        <span />
                      </label>
                      <strong className="week-day-name">
                        <span className="hide-sm">{dayName(d)}</span>
                        <span className="show-sm">{dayName(d, 'short')}</span>
                      </strong>
                      <div className="week-periods">
                        {!on && <span className="muted closed">{de ? 'Frei' : 'Off'}</span>}
                        {week[d].map((p, i) => (
                          <div className="period" key={i}>
                            <input type="time" step={900} value={p.starts} onChange={(e) => setDay(d, week[d].map((x, k) => (k === i ? { ...x, starts: e.target.value } : x)))} aria-label={de ? 'Beginn' : 'Start'} />
                            <span>–</span>
                            <input type="time" step={900} value={p.ends} onChange={(e) => setDay(d, week[d].map((x, k) => (k === i ? { ...x, ends: e.target.value } : x)))} aria-label={de ? 'Ende' : 'End'} />
                            {week[d].length > 1 && (
                              <button className="btn btn-ghost btn-icon xs" onClick={() => setDay(d, week[d].filter((_, k) => k !== i))} aria-label={de ? 'Zeitraum entfernen' : 'Remove period'}>
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {on && (
                        <div className="week-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => addBreak(d)} title={de ? 'Pause einfügen' : 'Add break'}>
                            <Coffee size={14} />
                            <span className="hide-sm">{de ? 'Pause' : 'Break'}</span>
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => copyToWeekdays(d)} title={de ? 'Auf Mo–Fr kopieren' : 'Copy to Mon–Fri'}>
                            <Copy size={14} />
                            <span className="hide-sm">Mo–Fr</span>
                          </button>
                        </div>
                      )}
                      <div className="week-bar" aria-hidden>
                        {week[d].map((p, i) => (
                          <span key={i} style={{ left: `${((toMin(p.starts) - 360) / 960) * 100}%`, width: `${((toMin(p.ends) - toMin(p.starts)) / 960) * 100}%` }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="save-bar">
                {active.length > 1 && (
                  <label className="check-label">
                    <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
                    {de ? 'Für das ganze Team übernehmen' : 'Apply to whole team'}
                    <InfoTip text={de ? 'Alle aktiven Teammitglieder bekommen genau diesen Wochenplan.' : 'Every active team member gets exactly this week plan.'} visual="team" />
                  </label>
                )}
                <Button onClick={save} disabled={busy || (!dirty && !applyAll)} className={dirty ? 'pulse' : ''}>
                  {busy ? <span className="spinner" /> : <Save size={15} />}
                  {dirty ? (de ? 'Wochenplan speichern' : 'Save week plan') : de ? 'Gespeichert' : 'Saved'}
                </Button>
              </div>
            </div>
          </div>
          <div className="panel" style={{ alignSelf: 'start' }}>
            <div className="panel-head">
              <h2 className="panel-title">{de ? 'Geplante freie Tage' : 'Planned days off'}</h2>
              <InfoTip visual="holiday" text={de ? 'In diesen Zeiträumen können Kunden nicht online buchen. Bestehende Termine bleiben erhalten.' : 'Customers cannot book online during these periods.'} />
            </div>
            {blocks.length ? (
              <div className="panel-body stack">
                {blocks.slice(0, 40).map((b) => (
                  <div key={b.id} className="spread block-row">
                    <div>
                      <strong>{b.reason || (de ? 'Gesperrt' : 'Blocked')}</strong>
                      <small>
                        {w.staff.find((s) => s.id === b.staff_id)?.name} · {formatInTimeZone(b.starts_at, w.business.timezone, 'dd.MM.yy HH:mm')} – {formatInTimeZone(b.ends_at, w.business.timezone, 'dd.MM.yy HH:mm')}
                      </small>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={de ? 'Löschen' : 'Delete'}
                      onClick={async () => {
                        try {
                          await api(`/api/businesses/${w.business.id}/blocks?item=${b.id}`, 'DELETE');
                          router.refresh();
                        } catch (e) {
                          toast.error(friendlyError(e, locale));
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel-body muted">{de ? 'Keine freien Tage eingetragen.' : 'No days off yet.'}</div>
            )}
          </div>
        </div>
      )}
      {dialog === 'holidays' && <HolidayDialog onClose={() => setDialog(null)} />}
      {dialog === 'absence' && <AbsenceDialog onClose={() => setDialog(null)} defaultStaff={staffId} />}
    </>
  );
}
function HolidayDialog({ onClose }: { onClose: () => void }) {
  const w = useWorkspace(),
    { locale } = useI18n(),
    router = useRouter();
  const de = locale === 'de';
  const year0 = Number(formatInTimeZone(new Date(), w.business.timezone, 'yyyy'));
  const [year, setYear] = useState(year0);
  const [state, setState] = useState('');
  const today = formatInTimeZone(new Date(), w.business.timezone, 'yyyy-MM-dd');
  const list = useMemo(() => germanHolidays(year, state || undefined).filter((h) => h.date >= today), [year, state, today]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => setPicked(new Set(list.filter((h) => !h.de.includes('(frei)')).map((h) => h.date))), [list]);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const r = await api<{ created: number; skipped: number }>(`/api/businesses/${w.business.id}/holidays`, 'POST', {
        staff_ids: w.staff.filter((s) => s.active).map((s) => s.id),
        days: list.filter((h) => picked.has(h.date)).map((h) => ({ date: h.date, reason: de ? h.de : h.en })),
      });
      toast.success(de ? `${r.created} freie Tage eingetragen${r.skipped ? `, ${r.skipped} übersprungen (Termin vorhanden)` : ''}.` : `${r.created} days added${r.skipped ? `, ${r.skipped} skipped` : ''}.`);
      onClose();
      router.refresh();
    } catch (e) {
      toast.error(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} title={de ? 'Feiertage eintragen' : 'Add public holidays'} description={de ? 'Gilt für das ganze Team. An diesen Tagen ist online nichts buchbar.' : 'Applies to the whole team.'}>
      <div className="stack">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="h-year">{de ? 'Jahr' : 'Year'}</label>
            <select id="h-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year0, year0 + 1].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="h-state">{de ? 'Bundesland' : 'State'}</label>
            <select id="h-state" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">{de ? 'Nur bundesweite' : 'National only'}</option>
              {Object.entries(germanStates).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="holiday-list">
          {list.map((h) => (
            <label key={h.date} className={`holiday ${picked.has(h.date) ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={picked.has(h.date)}
                onChange={() => {
                  const next = new Set(picked);
                  if (next.has(h.date)) next.delete(h.date);
                  else next.add(h.date);
                  setPicked(next);
                }}
              />
              <span className="date-tile sm">
                <b>{h.date.slice(8)}</b>
                <small>{new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(new Date(h.date + 'T12:00:00Z'))}</small>
              </span>
              <span>{de ? h.de : h.en}</span>
            </label>
          ))}
        </div>
        <div className="form-actions">
          <Button variant="outline" onClick={onClose}>
            {de ? 'Abbrechen' : 'Cancel'}
          </Button>
          <Button onClick={save} disabled={busy || !picked.size}>
            {busy ? <span className="spinner" /> : <PartyPopper size={15} />}
            {de ? `${picked.size} Tage eintragen` : `Add ${picked.size} days`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
function AbsenceDialog({ onClose, defaultStaff }: { onClose: () => void; defaultStaff: string }) {
  const w = useWorkspace(),
    { locale } = useI18n(),
    router = useRouter();
  const de = locale === 'de';
  const today = formatInTimeZone(new Date(), w.business.timezone, 'yyyy-MM-dd');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('14:00');
  const [who, setWho] = useState(defaultStaff);
  const [reason, setReason] = useState(de ? 'Urlaub' : 'Vacation');
  const [busy, setBusy] = useState(false);
  async function save() {
    const tz = w.business.timezone;
    const next = new Date(to + 'T12:00:00Z');
    next.setUTCDate(next.getUTCDate() + 1);
    const starts = fromZonedTime(`${from}T${allDay ? '00:00' : startTime}:00`, tz).toISOString();
    const ends = fromZonedTime(allDay ? `${next.toISOString().slice(0, 10)}T00:00:00` : `${to}T${endTime}:00`, tz).toISOString();
    if (ends <= starts) return toast.error(de ? 'Das Ende muss nach dem Beginn liegen.' : 'End must be after start.');
    setBusy(true);
    try {
      await api(`/api/businesses/${w.business.id}/blocks`, 'POST', { staff_id: who, starts_at: starts, ends_at: ends, reason });
      toast.success(de ? 'Eingetragen' : 'Added');
      onClose();
      router.refresh();
    } catch (e) {
      toast.error(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  const reasons = de ? ['Urlaub', 'Krank', 'Fortbildung', 'Geschlossen', 'Privat'] : ['Vacation', 'Sick', 'Training', 'Closed', 'Private'];
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} title={de ? 'Abwesenheit eintragen' : 'Add time off'}>
      <div className="stack">
        <div className="row wrap">
          {reasons.map((r) => (
            <button key={r} className={`chip ${reason === r ? 'on' : ''}`} onClick={() => setReason(r)}>
              {r}
            </button>
          ))}
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="a-from">{de ? 'Von' : 'From'}</label>
            <input id="a-from" type="date" value={from} onChange={(e) => (setFrom(e.target.value), e.target.value > to && setTo(e.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="a-to">{de ? 'Bis' : 'To'}</label>
            <input id="a-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <label className="check-label full">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            {de ? 'Ganztägig' : 'All day'}
          </label>
          {!allDay && (
            <>
              <div className="field">
                <label htmlFor="a-st">{de ? 'Ab Uhrzeit' : 'From time'}</label>
                <input id="a-st" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="a-et">{de ? 'Bis Uhrzeit' : 'To time'}</label>
                <input id="a-et" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </>
          )}
          <div className="field full">
            <label htmlFor="a-who">{de ? 'Für wen?' : 'For whom?'}</label>
            <select id="a-who" value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="all">{de ? 'Ganzes Team (Betrieb geschlossen)' : 'Whole team (closed)'}</option>
              {w.staff
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="form-actions">
          <Button variant="outline" onClick={onClose}>
            {de ? 'Abbrechen' : 'Cancel'}
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? <span className="spinner" /> : <CalendarOff size={15} />}
            {de ? 'Eintragen' : 'Add'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
