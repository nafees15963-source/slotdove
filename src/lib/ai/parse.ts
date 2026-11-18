import { findBest, normalize } from './text';
/** Understands short appointment sentences such as
 *  "Morgen 14:30 Haarschnitt für Anna Müller 0171 2345678 bei Lena" or
 *  "next friday 9am consultation John". Everything runs locally. */
export type ParsedBooking = {
  date?: string;
  time?: string;
  serviceId?: string;
  staffId?: string;
  name?: string;
  phone?: string;
  email?: string;
  understood: string[];
  confidence: number;
};
const weekdays: Record<string, number> = {
  sonntag: 0, so: 0, sunday: 0, sun: 0,
  montag: 1, mo: 1, monday: 1, mon: 1,
  dienstag: 2, di: 2, tuesday: 2, tue: 2,
  mittwoch: 3, mi: 3, wednesday: 3, wed: 3,
  donnerstag: 4, do: 4, thursday: 4, thu: 4,
  freitag: 5, fr: 5, friday: 5, fri: 5,
  samstag: 6, sa: 6, sonnabend: 6, saturday: 6, sat: 6,
};
const months: Record<string, number> = {
  januar: 1, jan: 1, january: 1, februar: 2, feb: 2, february: 2, maerz: 3, marz: 3, march: 3, mar: 3, april: 4, apr: 4,
  mai: 5, may: 5, juni: 6, jun: 6, june: 6, juli: 7, jul: 7, july: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, october: 10, oct: 10, november: 11, nov: 11, dezember: 12, dez: 12, december: 12, dec: 12,
};
const pad = (n: number) => String(n).padStart(2, '0');
function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const dow = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay();
export function parseDate(input: string, today: string): { date: string; match: string } | null {
  const t = normalize(input);
  let m: RegExpMatchArray | null;
  if ((m = t.match(/\b(uebermorgen|day after tomorrow)\b/))) return { date: addDays(today, 2), match: m[0] };
  if ((m = t.match(/\b(morgen|tomorrow|tmrw)\b/)) && !/\bmorgens\b/.test(m[0])) return { date: addDays(today, 1), match: m[0] };
  if ((m = t.match(/\b(heute|today|jetzt|now)\b/))) return { date: today, match: m[0] };
  if ((m = t.match(/\bin (\d{1,3}) (tagen|tag|days|day)\b/))) return { date: addDays(today, Number(m[1])), match: m[0] };
  if ((m = t.match(/\bin (\d{1,2}) (wochen|woche|weeks|week)\b/))) return { date: addDays(today, Number(m[1]) * 7), match: m[0] };
  if ((m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) return { date: `${m[1]}-${m[2]}-${m[3]}`, match: m[0] };
  if ((m = t.match(/\b(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?\b/))) {
    const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : Number(today.slice(0, 4));
    let date = `${year}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
    if (!m[3] && date < today) date = `${year + 1}${date.slice(4)}`;
    if (Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[1]) >= 1 && Number(m[1]) <= 31) return { date, match: m[0] };
  }
  if ((m = t.match(/\b(\d{1,2})\.? ?([a-z]{3,9})\b/)) && months[m[2]]) {
    const year = Number(today.slice(0, 4));
    let date = `${year}-${pad(months[m[2]])}-${pad(Number(m[1]))}`;
    if (date < today) date = `${year + 1}${date.slice(4)}`;
    return { date, match: m[0] };
  }
  m = t.match(/\b(naechsten?|kommenden?|next|this|diesen?|am)?\s?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonnabend|sonntag|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mo|di|mi|do|fr|sa|so|mon|tue|wed|thu|fri|sat|sun)\b/);
  if (m && (m[2].length > 2 || m[1])) {
    const target = weekdays[m[2]];
    let diff = (target - dow(today) + 7) % 7;
    if (diff === 0) diff = 7;
    if (m[1] && /naechst|next/.test(m[1]) && diff < 2) diff += 7;
    return { date: addDays(today, diff), match: m[0] };
  }
  if ((m = t.match(/\b(naechste woche|next week)\b/))) return { date: addDays(today, 7 - ((dow(today) + 6) % 7)), match: m[0] };
  return null;
}
export function parseTime(input: string): { time: string; match: string } | null {
  const t = normalize(input);
  let m: RegExpMatchArray | null;
  const afternoon = /\b(nachmittags?|abends?|pm|p\.m\.)\b/.test(t);
  const fix = (h: number) => (afternoon && h < 12 ? h + 12 : !afternoon && h >= 1 && h <= 7 && !/\b(morgens|frueh|am)\b/.test(t) ? h + 12 : h);
  if ((m = t.match(/\bhalb (\d{1,2})\b/))) return { time: `${pad(fix(Number(m[1]) - 1))}:30`, match: m[0] };
  if ((m = t.match(/\bviertel nach (\d{1,2})\b/))) return { time: `${pad(fix(Number(m[1])))}:15`, match: m[0] };
  if ((m = t.match(/\bviertel vor (\d{1,2})\b/))) return { time: `${pad(fix(Number(m[1]) - 1))}:45`, match: m[0] };
  if ((m = t.match(/\b([01]?\d|2[0-3])[:.h]([0-5]\d)\s?(uhr|am|pm)?\b/)) && !/\d\.\d+\./.test(m[0] + t.slice((m.index || 0) + m[0].length, (m.index || 0) + m[0].length + 1))) {
    let h = Number(m[1]);
    if (m[3] === 'pm' && h < 12) h += 12;
    return { time: `${pad(h)}:${m[2]}`, match: m[0] };
  }
  if ((m = t.match(/\b(?:um\s)?([01]?\d|2[0-3])\s?(uhr|am|pm|h)\b/)) || (m = t.match(/\bum ([01]?\d|2[0-3])\b/)) || (m = t.match(/\bat ([01]?\d|2[0-3])\b/))) {
    let h = Number(m[1]);
    if (m[2] === 'pm' && h < 12) h += 12;
    else if (m[2] !== 'am') h = fix(h);
    return { time: `${pad(h)}:00`, match: m[0] };
  }
  if (/\bmittags?\b/.test(t)) return { time: '12:00', match: 'mittag' };
  return null;
}
const filler = new Set(
  'termin appointment fuer for mit with bei at um am uhr heute morgen uebermorgen today tomorrow naechsten naechste kommenden next neuer neu new bitte please eintragen buchen book und and frau herr mr mrs ms'.split(
    ' ',
  ),
);
export function parseBookingText(
  text: string,
  ctx: {
    today: string;
    services: { id: string; name: string }[];
    staff: { id: string; name: string }[];
  },
): ParsedBooking {
  const understood: string[] = [];
  let rest = text;
  const out: ParsedBooking = { understood, confidence: 0 };
  const email = rest.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (email) {
    out.email = email[0].toLowerCase();
    rest = rest.replace(email[0], ' ');
    understood.push('email');
  }
  const phone = rest.match(/(\+?\d[\d /-]{6,}\d)/);
  if (phone && phone[0].replace(/\D/g, '').length >= 7) {
    out.phone = phone[0].trim();
    rest = rest.replace(phone[0], ' ');
    understood.push('phone');
  }
  const date = parseDate(rest, ctx.today);
  if (date) {
    out.date = date.date;
    understood.push('date');
  }
  let n = normalize(rest);
  if (date) n = n.replace(date.match, ' ');
  const time = parseTime(n);
  if (time) {
    out.time = time.time;
    understood.push('time');
    n = n.replace(time.match, ' ');
  }
  const service = findBest(n, ctx.services, (s) => s.name, 0.7);
  if (service) {
    out.serviceId = service.item.id;
    n = n.replace(service.phrase, ' ');
    understood.push('service');
  }
  const staffMatch = n.match(/\b(bei|mit|with|by)\s+([a-z]+)/);
  const staff = staffMatch
    ? findBest(staffMatch[2], ctx.staff, (s) => s.name.split(' ')[0], 0.75)
    : findBest(n, ctx.staff, (s) => s.name, 0.9);
  if (staff) {
    out.staffId = staff.item.id;
    n = n.replace(staffMatch ? staffMatch[0] : staff.phrase, ' ');
    understood.push('staff');
  }
  // Remaining capitalised words of the original text form the customer name.
  const remaining = new Set(n.split(/[^a-z0-9-]+/).filter((w) => w.length > 1 && !filler.has(w) && !/\d/.test(w)));
  const nameWords = rest
    .split(/[\s,;]+/)
    .map((w) => w.replace(/[^\p{L}-]/gu, ''))
    .filter((w) => w.length > 1 && remaining.has(normalize(w)));
  const forMatch = rest.match(/(?:für|fuer|for)\s+([\p{Lu}][\p{L}-]+(?:\s+[\p{Lu}][\p{L}-]+)?)/u);
  if (forMatch) out.name = forMatch[1];
  else if (nameWords.length) out.name = nameWords.slice(0, 3).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  if (out.name) understood.push('name');
  out.confidence = Math.min(1, understood.length / 4);
  return out;
}
