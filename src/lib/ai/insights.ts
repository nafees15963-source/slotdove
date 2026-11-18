import { formatInTimeZone } from 'date-fns-tz';
import type { Workspace } from '../types';
/** Local analytics "brain": turns loaded bookings into plain-language findings. */
export type Insight = {
  id: string;
  tone: 'good' | 'info' | 'warn';
  de: string;
  en: string;
  href?: string;
  value?: number;
};
export function computeInsights(w: Workspace): Insight[] {
  const tz = w.business.timezone;
  const now = new Date();
  const today = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  const active = w.bookings.filter((b) => b.status !== 'cancelled');
  const past = w.bookings.filter((b) => b.starts_at < now.toISOString());
  const out: Insight[] = [];
  const unassigned = w.bookings.filter((b) => !b.staff_id && ['pending', 'confirmed'].includes(b.status) && b.starts_at >= now.toISOString());
  if (unassigned.length)
    out.push({ id: 'unassigned', tone: 'warn', value: unassigned.length, href: '/dashboard/appointments', de: unassigned.length === 1 ? 'Ein kommender Termin hat noch niemanden zugeordnet.' : `${unassigned.length} kommende Termine haben noch niemanden zugeordnet.`, en: `${unassigned.length} upcoming appointments have no one assigned yet.` });
  const pending = w.bookings.filter((b) => b.status === 'pending');
  if (pending.length)
    out.push({ id: 'pending', tone: 'warn', value: pending.length, href: '/dashboard/appointments', de: pending.length === 1 ? 'Eine Anfrage wartet auf deine Bestätigung.' : `${pending.length} Anfragen warten auf deine Bestätigung.`, en: `${pending.length} requests are waiting for confirmation.` });
  const finished = past.filter((b) => ['completed', 'no_show', 'confirmed'].includes(b.status));
  const noShows = past.filter((b) => b.status === 'no_show').length;
  if (finished.length >= 5) {
    const rate = Math.round((noShows / finished.length) * 100);
    out.push(
      rate >= 10
        ? { id: 'noshow', tone: 'warn', value: rate, href: '/dashboard/notifications', de: `No-Show-Quote ${rate} %. Erinnerungen 24 h und 2 h vorher senken das spürbar.`, en: `No-show rate ${rate}%. Reminders 24 h and 2 h before reduce this noticeably.` }
        : { id: 'noshow', tone: 'good', value: rate, de: `Sehr zuverlässige Kundschaft: nur ${rate} % No-Shows.`, en: `Reliable customers: only ${rate}% no-shows.` },
    );
  }
  // Busiest and quietest weekday.
  if (active.length >= 6) {
    const counts = Array(7).fill(0);
    for (const b of active) counts[Number(formatInTimeZone(b.starts_at, tz, 'i')) % 7]++;
    const names = { de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
    const open = [...new Set(w.availability.map((a) => a.weekday))];
    const days = open.length ? open : [1, 2, 3, 4, 5];
    const max = days.reduce((a, b) => (counts[b] > counts[a] ? b : a), days[0]);
    const min = days.reduce((a, b) => (counts[b] < counts[a] ? b : a), days[0]);
    if (counts[max] > counts[min])
      out.push({ id: 'weekday', tone: 'info', href: '/dashboard/analytics', de: `${names.de[max]} ist dein stärkster Tag, ${names.de[min]} der ruhigste – ideal für Aktionen oder kürzere Öffnungszeiten.`, en: `${names.en[max]} is your busiest day, ${names.en[min]} the quietest – good for promotions or shorter hours.` });
  }
  // Revenue this month and simple forecast.
  const month = today.slice(0, 7);
  const monthBookings = active.filter((b) => formatInTimeZone(b.starts_at, tz, 'yyyy-MM') === month);
  const revenue = monthBookings.reduce((s, b) => s + b.price_cents, 0);
  if (revenue > 0) {
    const fmt = (c: number, l: string) => new Intl.NumberFormat(l, { style: 'currency', currency: w.business.currency, maximumFractionDigits: 0 }).format(c / 100);
    const sofar = monthBookings.filter((b) => b.starts_at < now.toISOString()).reduce((s, b) => s + b.price_cents, 0);
    out.push({ id: 'revenue', tone: 'good', value: revenue, href: '/dashboard/analytics', de: `Gebuchter Umsatz diesen Monat: ${fmt(revenue, 'de')} (davon ${fmt(sofar, 'de')} bereits erledigt).`, en: `Booked revenue this month: ${fmt(revenue, 'en')} (${fmt(sofar, 'en')} already done).` });
  }
  // Utilisation of the next 7 days.
  const weekAhead = new Date(now.getTime() + 7 * 86400000).toISOString();
  const openMinutes = w.availability.reduce((s, a) => s + (Number(a.ends.slice(0, 2)) * 60 + Number(a.ends.slice(3, 5)) - Number(a.starts.slice(0, 2)) * 60 - Number(a.starts.slice(3, 5))), 0);
  if (openMinutes > 0) {
    const booked = active.filter((b) => b.starts_at >= now.toISOString() && b.starts_at < weekAhead).reduce((s, b) => s + (Date.parse(b.ends_at) - Date.parse(b.starts_at)) / 60000, 0);
    const pct = Math.min(100, Math.round((booked / openMinutes) * 100));
    out.push(
      pct < 35
        ? { id: 'load', tone: 'info', value: pct, href: '/dashboard/booking', de: `Nächste 7 Tage zu ${pct} % ausgelastet. Teile deinen Buchungslink, um Lücken zu füllen.`, en: `Next 7 days are ${pct}% booked. Share your booking link to fill gaps.` }
        : { id: 'load', tone: 'good', value: pct, de: `Nächste 7 Tage zu ${pct} % ausgelastet.`, en: `Next 7 days are ${pct}% booked.` },
    );
  }
  const noStaffService = w.services.filter((s) => s.active && !w.assignments.some((a) => a.service_id === s.id));
  if (noStaffService.length && w.staff.length)
    out.push({ id: 'assign', tone: 'info', href: '/dashboard/services', de: `${noStaffService.length} Leistungen sind online noch nicht buchbar, weil niemand zugeordnet ist.`, en: `${noStaffService.length} services cannot be booked online yet because no one is assigned.` });
  if (!w.business.published)
    out.push({ id: 'publish', tone: 'info', href: '/dashboard/booking', de: 'Deine Buchungsseite ist noch offline. Ein Klick genügt, wenn alles passt.', en: 'Your booking page is still offline. One click publishes it.' });
  const repeat = new Map<string, number>();
  for (const b of active) repeat.set(b.customer_id, (repeat.get(b.customer_id) || 0) + 1);
  const loyal = [...repeat.values()].filter((v) => v >= 3).length;
  if (loyal) out.push({ id: 'loyal', tone: 'good', value: loyal, href: '/dashboard/customers', de: `${loyal} Stammkunden mit 3+ Terminen im geladenen Zeitraum.`, en: `${loyal} regulars with 3+ appointments in the loaded period.` });
  return out;
}
/** Simple risk score 0..1 that a customer does not show up, from their history. */
export function noShowRisk(w: Workspace, customerId: string) {
  const history = w.bookings.filter((b) => b.customer_id === customerId && b.starts_at < new Date().toISOString());
  if (!history.length) return 0.1;
  const bad = history.filter((b) => b.status === 'no_show').length + 0.5 * history.filter((b) => b.status === 'cancelled').length;
  return Math.min(1, (bad + 0.2) / (history.length + 1));
}
