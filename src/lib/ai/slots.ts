import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import type { Workspace } from '../types';
/** Free-time finder with a small scoring model: prefers times that close gaps
 * next to existing appointments, then earlier times. */
export type SlotSuggestion = {
  time: string;
  staffId: string | null;
  score: number;
  reason: 'gap' | 'adjacent' | 'early' | 'free';
};
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export function suggestSlots(
  w: Pick<Workspace, 'business' | 'services' | 'staff' | 'availability' | 'bookings' | 'blocks' | 'assignments'>,
  input: { date: string; serviceId: string; staffId?: string | null; step?: number; limit?: number },
): SlotSuggestion[] {
  const service = w.services.find((s) => s.id === input.serviceId);
  if (!service) return [];
  const tz = w.business.timezone;
  const weekday = new Date(input.date + 'T12:00:00Z').getUTCDay();
  const step = input.step || Math.min(w.business.slot_interval, 15);
  const dur = service.duration_minutes + service.buffer_before + service.buffer_after;
  const now = Date.now();
  const candidates = w.staff.filter(
    (s) =>
      s.active &&
      (input.staffId ? s.id === input.staffId : true) &&
      (input.staffId || !w.assignments.length || w.assignments.some((a) => a.staff_id === s.id && a.service_id === service.id)),
  );
  const out: SlotSuggestion[] = [];
  const dayBusy = (staffId: string | null) =>
    w.bookings
      .filter(
        (b) =>
          b.staff_id === staffId &&
          ['pending', 'confirmed'].includes(b.status) &&
          formatInTimeZone(b.starts_at, tz, 'yyyy-MM-dd') === input.date,
      )
      .map((b) => {
        const svc = w.services.find((s) => s.id === b.service_id);
        const start = toMin(formatInTimeZone(b.starts_at, tz, 'HH:mm')) - (svc?.buffer_before || 0);
        const end = toMin(formatInTimeZone(b.ends_at, tz, 'HH:mm')) + (svc?.buffer_after || 0);
        return [start, end] as [number, number];
      })
      .concat(
        w.blocks
          .filter((bl) => bl.staff_id === staffId)
          .map((bl) => {
            const s = formatInTimeZone(bl.starts_at, tz, 'yyyy-MM-dd HH:mm'),
              e = formatInTimeZone(bl.ends_at, tz, 'yyyy-MM-dd HH:mm');
            const start = s.slice(0, 10) < input.date ? 0 : s.slice(0, 10) > input.date ? 1440 : toMin(s.slice(11));
            const end = e.slice(0, 10) > input.date ? 1440 : e.slice(0, 10) < input.date ? 0 : toMin(e.slice(11));
            return [start, end] as [number, number];
          })
          .filter(([s, e]) => e > s),
      );
  const consider = (staffId: string | null, windows: [number, number][]) => {
    const busy = dayBusy(staffId);
    for (const [ws, we] of windows)
      for (let t = Math.ceil(ws / step) * step; t + dur <= we; t += step) {
        const start = t - 0,
          end = t + dur;
        if (busy.some(([bs, be]) => start < be && end > bs)) continue;
        const startsAt = fromZonedTime(`${input.date}T${toTime(t + service.buffer_before)}:00`, tz).getTime();
        if (startsAt < now) continue;
        const touchesBefore = busy.some(([, be]) => be === start) || start === ws;
        const touchesAfter = busy.some(([bs]) => bs === end) || end === we;
        const reason: SlotSuggestion['reason'] =
          touchesBefore && touchesAfter ? 'gap' : touchesBefore || touchesAfter ? 'adjacent' : t < 12 * 60 ? 'early' : 'free';
        const score = (reason === 'gap' ? 3 : reason === 'adjacent' ? 2 : reason === 'early' ? 1 : 0.5) - t / 3000;
        out.push({ time: toTime(t + service.buffer_before), staffId, score, reason });
      }
  };
  for (const s of candidates) {
    const windows = w.availability
      .filter((a) => a.staff_id === s.id && a.weekday === weekday)
      .map((a) => [toMin(a.starts), toMin(a.ends)] as [number, number]);
    consider(s.id, windows);
  }
  if (!candidates.length || !out.length) {
    // No staff or no hours yet: offer a sensible business day for unassigned appointments.
    if (!input.staffId && !w.availability.length) consider(null, [[8 * 60, 20 * 60]]);
  }
  const unique = new Map<string, SlotSuggestion>();
  for (const slot of out.sort((a, b) => b.score - a.score))
    if (!unique.has(slot.time)) unique.set(slot.time, slot);
  return [...unique.values()].sort((a, b) => a.time.localeCompare(b.time)).slice(0, input.limit || 48);
}
export function bestSlots(slots: SlotSuggestion[], n = 3) {
  return [...slots].sort((a, b) => b.score - a.score).slice(0, n);
}
