import { formatInTimeZone } from 'date-fns-tz';
export type Span = { start: string; end: string };
export type SlotRules = {
  timezone: string;
  date: string;
  hours: { starts: string; ends: string }[];
  busy: Span[];
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  interval: number;
  minNotice: number;
  maxAdvance: number;
  now?: Date;
};
export function overlaps(a: Span, b: Span) {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);
}
/** Iterate UTC instants and project to business wall-time: DST gaps never exist,
 * and repeated wall times are deduplicated to one customer-visible choice. */
export function availableSlots(r: SlotRules): string[] {
  if (r.interval < 1 || r.duration < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return [];
  const now = (r.now ?? new Date()).getTime(),
    base = Date.parse(r.date + 'T00:00:00Z');
  const slots: string[] = [],
    seen = new Set<string>();
  for (let t = base - 14 * 3600000; t < base + 38 * 3600000; t += 60000) {
    if (t < now + r.minNotice * 60000 || t > now + r.maxAdvance * 86400000) continue;
    const local = formatInTimeZone(t, r.timezone, 'yyyy-MM-dd HH:mm');
    if (!local.startsWith(r.date)) continue;
    const hh = local.slice(11),
      minute = Number(hh.slice(0, 2)) * 60 + Number(hh.slice(3));
    if (minute % r.interval || seen.has(hh)) continue;
    const start = t - r.bufferBefore * 60000,
      end = t + (r.duration + r.bufferAfter) * 60000;
    const ls = formatInTimeZone(start, r.timezone, 'yyyy-MM-dd HH:mm'),
      le = formatInTimeZone(end, r.timezone, 'yyyy-MM-dd HH:mm');
    if (!ls.startsWith(r.date) || !le.startsWith(r.date)) continue;
    if (
      !r.hours.some(
        (h) => ls.slice(11) >= h.starts.slice(0, 5) && le.slice(11) <= h.ends.slice(0, 5),
      )
    )
      continue;
    if (
      r.busy.some((b) =>
        overlaps({ start: new Date(start).toISOString(), end: new Date(end).toISOString() }, b),
      )
    )
      continue;
    seen.add(hh);
    slots.push(new Date(t).toISOString());
  }
  return slots;
}
export function calendarFile(
  booking: { id: string; service_name: string; starts_at: string; ends_at: string },
  business: { name: string; address: string },
) {
  const escape = (s: string) =>
    s
      .replaceAll('\\', '\\\\')
      .replaceAll('\n', '\\n')
      .replaceAll(',', '\\,')
      .replaceAll(';', '\\;')
      .replaceAll('\r', '');
  const stamp = (s: string) =>
    new Date(s)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Slotdove//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@slotdove`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(booking.starts_at)}`,
    `DTEND:${stamp(booking.ends_at)}`,
    `SUMMARY:${escape(booking.service_name)} · ${escape(business.name)}`,
    `LOCATION:${escape(business.address)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // RFC 5545 limits content lines to 75 UTF-8 octets (continuations include a space).
  return (
    lines
      .map((line) => {
        const chunks: string[] = [];
        let current = '';
        for (const ch of line) {
          if (new TextEncoder().encode(current + ch).length > 75) {
            chunks.push(current);
            current = ' ' + ch;
          } else current += ch;
        }
        chunks.push(current);
        return chunks.join('\r\n');
      })
      .join('\r\n') + '\r\n'
  );
}
