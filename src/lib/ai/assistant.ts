import { formatInTimeZone } from 'date-fns-tz';
import type { Workspace } from '../types';
import { faq, tutorials } from '../tutorials';
import { SearchIndex, normalize, findBest } from './text';
import { parseBookingText, parseDate } from './parse';
import { computeInsights } from './insights';
import { suggestSlots, bestSlots } from './slots';
/** Slotdove assistant: intent rules for questions about your own data, a BM25
 * index over guides and FAQ for how-to questions, and the booking parser for
 * commands. Deterministic and offline. */
export type AssistantAnswer = {
  text: string;
  links?: { label: string; href: string }[];
  booking?: ReturnType<typeof parseBookingText>;
  tutorial?: string;
};
type Doc = { title: string; body: string; href?: string; tutorial?: string };
let cached: { locale: string; index: SearchIndex<Doc> } | null = null;
function index(locale: 'de' | 'en') {
  if (cached?.locale === locale) return cached.index;
  const i = locale === 'de' ? 0 : 1;
  const docs: Doc[] = [
    ...faq.map((f) => ({ title: f.q[i], body: f.a[i], href: f.href })),
    ...Object.values(tutorials).flatMap((tut) =>
      tut.steps.map((s) => ({ title: `${tut.title[i]}: ${s.title[i]}`, body: s.text[i], href: tut.id === 'admin' ? '/admin' : `/dashboard/${tut.id === 'overview' ? '' : tut.id}`, tutorial: tut.id })),
    ),
  ];
  cached = { locale, index: new SearchIndex(docs, (d) => `${d.title} ${d.title} ${d.body}`) };
  return cached.index;
}
const has = (q: string, ...words: string[]) => words.some((w) => new RegExp(`\\b${w}`).test(q));
export function answer(question: string, w: Workspace, locale: 'de' | 'en'): AssistantAnswer {
  const de = locale === 'de';
  const q = normalize(question);
  const tz = w.business.timezone;
  const now = new Date();
  const today = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  const money = (c: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: w.business.currency }).format(c / 100);
  const time = (iso: string) => formatInTimeZone(iso, tz, 'HH:mm');
  const day = (d: string) => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z'));
  const live = w.bookings.filter((b) => ['pending', 'confirmed'].includes(b.status));
  const on = (d: string) => live.filter((b) => formatInTimeZone(b.starts_at, tz, 'yyyy-MM-dd') === d).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  if (!q.trim()) return { text: de ? 'Frag mich etwas, z. B. „Was steht heute an?“' : 'Ask me something, e.g. “What’s on today?”' };

  // 0. Small talk.
  if (/^(hallo|hi|hey|moin|servus|guten (morgen|tag|abend)|hello|good (morning|evening))\b/.test(q.trim()) || has(q, 'wie geht', 'how are you', 'wer bist du', 'who are you', 'bist du', 'danke', 'thank'))
    return {
      text: has(q, 'danke', 'thank')
        ? de ? 'Gern geschehen! 😊' : 'You are welcome! 😊'
        : de
          ? 'Mir geht’s gut, danke! Ich bin die Slotdove KI und helfe dir mit Terminen, freien Zeiten, Zahlen und Fragen zur Bedienung. Was kann ich für dich tun?'
          : 'I’m good, thanks! I’m Slotdove AI and help with appointments, free times, numbers and how-to questions. What can I do for you?',
    };
  // 1. Commands that create appointments.
  if (has(q, 'termin (fuer|eintragen|anlegen|buchen)', 'neuer termin', 'trag', 'buche', 'book ', 'new appointment', 'add appointment') || (parseBookingText(question, { today, services: w.services, staff: w.staff }).understood.length >= 3 && !q.includes('?') && !has(q, 'wann', 'was', 'wie', 'wer', 'when', 'what', 'how', 'who', 'frei', 'free'))) {
    const parsed = parseBookingText(question, { today, services: w.services.filter((s) => s.active), staff: w.staff.filter((s) => s.active) });
    const parts = [
      parsed.date && day(parsed.date),
      parsed.time && `${parsed.time}${de ? ' Uhr' : ''}`,
      parsed.serviceId && w.services.find((s) => s.id === parsed.serviceId)?.name,
      parsed.name,
      parsed.staffId && `${de ? 'bei' : 'with'} ${w.staff.find((s) => s.id === parsed.staffId)?.name}`,
    ].filter(Boolean);
    return {
      text: parts.length
        ? de ? `Verstanden: ${parts.join(' · ')}. Prüfe kurz und speichere.` : `Got it: ${parts.join(' · ')}. Check and save.`
        : de ? 'Ich öffne dir das Terminformular.' : 'Opening the appointment form.',
      booking: parsed,
    };
  }
  // 2. Questions about the schedule.
  const date = parseDate(question, today);
  if (has(q, 'frei', 'free', 'luecke', 'slot', 'wann (kann|hat|ist)', 'when can')) {
    const d = date?.date || today;
    const service = findBest(q, w.services, (s) => s.name, 0.7)?.item || w.services.find((s) => s.active);
    if (!service) return { text: de ? 'Lege zuerst eine Leistung an.' : 'Create a service first.', links: [{ label: de ? 'Leistungen' : 'Services', href: '/dashboard/services' }] };
    const staff = findBest(q, w.staff, (s) => s.name.split(' ')[0], 0.8)?.item;
    const slots = suggestSlots(w, { date: d, serviceId: service.id, staffId: staff?.id });
    if (!slots.length) return { text: de ? `Am ${day(d)} ist für „${service.name}“ nichts mehr frei.` : `Nothing free for “${service.name}” on ${day(d)}.` };
    const best = bestSlots(slots, 3).map((s) => s.time).sort();
    return {
      text: de
        ? `${day(d)}, ${service.name}: ${slots.length} freie Zeiten. Am besten passen ${best.join(', ')} Uhr (füllen Lücken). Weitere: ${slots.filter((s) => !best.includes(s.time)).slice(0, 8).map((s) => s.time).join(', ')}…`
        : `${day(d)}, ${service.name}: ${slots.length} free times. Best fit ${best.join(', ')} (fills gaps). More: ${slots.filter((s) => !best.includes(s.time)).slice(0, 8).map((s) => s.time).join(', ')}…`,
    };
  }
  if (has(q, 'heute', 'today', 'morgen', 'tomorrow', 'steht an', 'termine am', 'was ist', 'agenda', 'plan fuer') && has(q, 'termin', 'steht', 'was', 'appointment', 'agenda', 'plan', 'los', 'what')) {
    const d = date?.date || today;
    const list = on(d);
    return {
      text: list.length
        ? (de ? `${day(d)}: ${list.length} Termine. ` : `${day(d)}: ${list.length} appointments. `) + list.slice(0, 8).map((b) => `${time(b.starts_at)} ${b.customer_name} (${b.service_name}${b.staff_id ? `, ${w.staff.find((s) => s.id === b.staff_id)?.name}` : ''})`).join(' · ')
        : de ? `${day(d)} ist noch frei. 🎉` : `${day(d)} is still free. 🎉`,
      links: [{ label: de ? 'Kalender öffnen' : 'Open calendar', href: '/dashboard/calendar' }],
    };
  }
  if (has(q, 'naechste', 'next') && has(q, 'termin', 'kunde', 'appointment', 'customer')) {
    const next = live.filter((b) => b.starts_at >= now.toISOString())[0];
    return { text: next ? `${day(formatInTimeZone(next.starts_at, tz, 'yyyy-MM-dd'))}, ${time(next.starts_at)}: ${next.customer_name} – ${next.service_name}` : de ? 'Keine kommenden Termine.' : 'No upcoming appointments.' };
  }
  if (has(q, 'umsatz', 'revenue', 'verdien', 'einnahm', 'geld', 'money', 'earn')) {
    const month = today.slice(0, 7);
    const sum = w.bookings.filter((b) => b.status !== 'cancelled' && formatInTimeZone(b.starts_at, tz, 'yyyy-MM') === month).reduce((s, b) => s + b.price_cents, 0);
    const done = w.bookings.filter((b) => b.status === 'completed' && formatInTimeZone(b.starts_at, tz, 'yyyy-MM') === month).reduce((s, b) => s + b.price_cents, 0);
    return { text: de ? `Diesen Monat gebucht: ${money(sum)}. Davon erledigt: ${money(done)}.` : `Booked this month: ${money(sum)}. Completed: ${money(done)}.`, links: [{ label: de ? 'Auswertungen' : 'Analytics', href: '/dashboard/analytics' }] };
  }
  if (has(q, 'wie ?viele', 'anzahl', 'how many', 'count')) {
    if (has(q, 'kunde', 'customer')) return { text: de ? `Du hast ${w.stats?.customers ?? w.customers.length} Kunden.` : `You have ${w.stats?.customers ?? w.customers.length} customers.` };
    if (has(q, 'mitarbeit', 'team', 'staff')) return { text: de ? `${w.staff.filter((s) => s.active).length} aktive Teammitglieder.` : `${w.staff.filter((s) => s.active).length} active team members.` };
    if (has(q, 'leistung', 'service')) return { text: de ? `${w.services.filter((s) => s.active).length} aktive Leistungen.` : `${w.services.filter((s) => s.active).length} active services.` };
    const d = date?.date;
    if (d) return { text: de ? `${day(d)}: ${on(d).length} Termine.` : `${day(d)}: ${on(d).length} appointments.` };
    return { text: de ? `Diesen Monat: ${w.stats?.total ?? 0} Termine, davon ${w.stats?.confirmed ?? 0} bestätigt.` : `This month: ${w.stats?.total ?? 0} appointments, ${w.stats?.confirmed ?? 0} confirmed.` };
  }
  if (has(q, 'offen', 'unassign', 'zuordn', 'niemand', 'pending', 'bestaetig', 'anfrage')) {
    const open = live.filter((b) => !b.staff_id || b.status === 'pending');
    return { text: open.length ? (de ? `${open.length} Termine brauchen deine Aufmerksamkeit: ` : `${open.length} need attention: `) + open.slice(0, 6).map((b) => `${b.customer_name} (${formatInTimeZone(b.starts_at, tz, 'dd.MM. HH:mm')})`).join(', ') : de ? 'Alles erledigt – nichts offen. ✅' : 'All done – nothing open. ✅', links: [{ label: de ? 'Termine' : 'Appointments', href: '/dashboard/appointments' }] };
  }
  if (has(q, 'tipp', 'tip', 'verbesser', 'improve', 'analyse', 'insight', 'empfehl', 'recommend', 'wie laeuft', 'how am i doing')) {
    const insights = computeInsights(w);
    return { text: insights.length ? insights.slice(0, 4).map((i) => '• ' + (de ? i.de : i.en)).join('\n') : de ? 'Noch zu wenig Daten für Tipps – leg los mit ein paar Terminen.' : 'Not enough data yet – add a few appointments.' };
  }
  if (has(q, 'tutorial', 'anleitung', 'tour', 'erklaer', 'zeig mir', 'show me', 'explain')) {
    const hit = index(locale).search(question, 1)[0];
    return { text: de ? 'Ich starte das passende Tutorial.' : 'Starting the matching tutorial.', tutorial: hit?.item.tutorial || 'overview' };
  }
  // 3. How-to knowledge base.
  const hits = index(locale).search(question, 2);
  if (hits.length)
    return {
      text: hits[0].item.body,
      links: hits.filter((h) => h.item.href).map((h) => ({ label: h.item.title.split(':')[0].replace(/\?.*/, '?'), href: h.item.href! })).slice(0, 2),
      tutorial: hits[0].item.tutorial,
    };
  return {
    text: de
      ? 'Das habe ich nicht verstanden. Probier z. B. „Was steht morgen an?“, „Wann ist Freitag frei?“, „Umsatz diesen Monat“ oder „Wie trage ich Urlaub ein?“.'
      : 'I didn’t get that. Try “What’s on tomorrow?”, “When is Friday free?”, “Revenue this month” or “How do I add vacation?”.',
  };
}
export const assistantExamples = {
  de: ['Was steht heute an?', 'Wann ist morgen Nachmittag frei?', 'Wie lief der letzte Monat im Vergleich?', 'Welche Stammkunden waren lange nicht da?', 'Was kann ich verbessern?', 'Wie trage ich Feiertage ein?'],
  en: ['What’s on today?', 'When is tomorrow afternoon free?', 'How did last month compare?', 'Which regulars haven’t been back?', 'What can I improve?', 'How do I add holidays?'],
};
