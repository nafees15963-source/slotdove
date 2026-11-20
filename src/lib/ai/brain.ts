import 'server-only';
import { formatInTimeZone } from 'date-fns-tz';
import type { Workspace } from '../types';
import { groqChat, type ChatMessage, type ToolSpec } from '../groq';
import { suggestSlots, bestSlots } from './slots';
import { findBest, SearchIndex } from './text';
import { faq, tutorials } from '../tutorials';
import { parseDate } from './parse';

/** Data the assistant may look at. Loaded with the signed-in user's permissions. */
export type BrainData = Pick<Workspace, 'business' | 'services' | 'staff' | 'availability' | 'blocks' | 'assignments' | 'bookings'> & {
  customers: { id: string; name: string; created_at: string }[];
  role: string;
};
export type BrainResult = {
  text: string;
  booking?: { serviceId?: string; staffId?: string; date?: string; time?: string; name?: string; phone?: string; notes?: string };
  tools: string[];
};
const tools: ToolSpec[] = [
  {
    type: 'function',
    function: {
      name: 'get_business_overview',
      description: 'Basisdaten: Leistungen (Dauer, Preis), Teammitglieder, Wochen-Arbeitszeiten, Buchungsregeln, ob die Buchungsseite online ist.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_appointments',
      description: 'Termine suchen. Alle Filter optional. Datum im Format YYYY-MM-DD (inklusive). Gibt max. 80 Termine mit Buchungsnummer zurück.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'active'] },
          staff: { type: 'string', description: 'Name des Teammitglieds oder "unassigned"' },
          service: { type: 'string' },
          customer: { type: 'string' },
          booking_number: { type: 'string', description: 'z. B. SD-7K3F9Q' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'appointment_stats',
      description: 'Kennzahlen für einen Zeitraum: Anzahl, Umsatz, Stornos, No-Shows, gruppiert nach service, staff, weekday, hour oder day.',
      parameters: {
        type: 'object',
        properties: { from: { type: 'string' }, to: { type: 'string' }, group_by: { type: 'string', enum: ['service', 'staff', 'weekday', 'hour', 'day', 'none'] } },
        required: ['from', 'to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_free_slots',
      description: 'Freie Zeiten an einem Tag für eine Leistung (laut Wochenplan, ohne Überschneidungen). "best" sind Zeiten, die Lücken füllen.',
      parameters: { type: 'object', properties: { date: { type: 'string' }, service: { type: 'string' }, staff: { type: 'string' } }, required: ['date'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'customer_insights',
      description: 'Kunden mit Besuchsanzahl, letztem und nächstem Termin, No-Shows. Optional Suche nach Name, nur Kunden ohne Besuch seit X Tagen, oder Top-Kunden.',
      parameters: { type: 'object', properties: { query: { type: 'string' }, inactive_days: { type: 'number' }, top: { type: 'number' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_appointment',
      description: 'Bereitet einen neuen Termin vor. Der Nutzer prüft und speichert ihn selbst im Formular. Nutze das, wenn der Nutzer einen Termin eintragen möchte.',
      parameters: {
        type: 'object',
        properties: {
          service: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          time: { type: 'string', description: 'HH:MM' },
          customer_name: { type: 'string' },
          staff: { type: 'string' },
          phone: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_help',
      description: 'Durchsucht die Slotdove-Hilfe (Anleitungen, wie Funktionen bedient werden).',
      parameters: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] },
    },
  },
];
const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export async function think(d: BrainData, history: { role: 'user' | 'assistant'; content: string }[], locale: 'de' | 'en'): Promise<BrainResult> {
  const tz = d.business.timezone;
  const now = new Date();
  const today = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  const used: string[] = [];
  let booking: BrainResult['booking'];
  const money = (c: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: d.business.currency }).format(c / 100);
  const local = (iso: string) => formatInTimeZone(iso, tz, 'yyyy-MM-dd HH:mm');
  const staffName = (id: string | null) => (id ? d.staff.find((s) => s.id === id)?.name || '?' : 'nicht zugeordnet');
  const service = (name?: string) => (name ? findBest(name, d.services, (s) => s.name, 0.55)?.item : undefined);
  const staff = (name?: string) => (name ? findBest(name, d.staff, (s) => s.name, 0.6)?.item || d.staff.find((s) => s.name.toLowerCase().startsWith(name.toLowerCase())) : undefined);
  const range = (from?: string, to?: string) => {
    const f = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : parseDate(from || '', today)?.date;
    const t = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : parseDate(to || '', today)?.date;
    return [f, t] as const;
  };
  const inRange = (iso: string, from?: string, to?: string) => {
    const day = formatInTimeZone(iso, tz, 'yyyy-MM-dd');
    return (!from || day >= from) && (!to || day <= to);
  };
  const run = (name: string, args: Record<string, unknown>): unknown => {
    used.push(name);
    const a = args as Record<string, string | number | undefined>;
    switch (name) {
      case 'get_business_overview':
        return {
          business: d.business.name,
          category: d.business.industry,
          published: d.business.published,
          booking_link: `/b/${d.business.slug}`,
          rules: { min_notice_minutes: d.business.min_notice_minutes, max_advance_days: d.business.max_advance_days, slot_interval: d.business.slot_interval, cancellation_hours: d.business.cancellation_hours, auto_confirm: d.business.auto_confirm },
          services: d.services.map((s) => ({ name: s.name, minutes: s.duration_minutes, price: money(s.price_cents), active: s.active, buffer_after: s.buffer_after, staff: d.assignments.some((x) => x.service_id === s.id) ? d.assignments.filter((x) => x.service_id === s.id).map((x) => staffName(x.staff_id)) : ['alle Teammitglieder'] })),
          team: d.staff.map((s) => ({
            name: s.name,
            active: s.active,
            hours: [1, 2, 3, 4, 5, 6, 0]
              .map((wd) => {
                const r = d.availability.filter((x) => x.staff_id === s.id && x.weekday === wd).sort((x, y) => x.starts.localeCompare(y.starts));
                return r.length ? `${dayNames[wd]} ${r.map((x) => `${x.starts.slice(0, 5)}-${x.ends.slice(0, 5)}`).join(', ')}` : null;
              })
              .filter(Boolean),
          })),
          upcoming_days_off: d.blocks.filter((b) => b.ends_at > now.toISOString()).slice(0, 15).map((b) => ({ who: staffName(b.staff_id), from: local(b.starts_at), to: local(b.ends_at), reason: b.reason })),
        };
      case 'search_appointments': {
        const [from, to] = range(a.from as string, a.to as string);
        const st = a.staff === 'unassigned' ? null : staff(a.staff as string);
        const sv = service(a.service as string);
        const list = d.bookings
          .filter((b) => inRange(b.starts_at, from, to))
          .filter((b) => !a.status || (a.status === 'active' ? ['pending', 'confirmed'].includes(b.status) : b.status === a.status))
          .filter((b) => (a.staff === 'unassigned' ? !b.staff_id : !st || b.staff_id === st.id))
          .filter((b) => !sv || b.service_id === sv.id)
          .filter((b) => !a.customer || b.customer_name.toLowerCase().includes(String(a.customer).toLowerCase()))
          .filter((b) => !a.booking_number || b.booking_number?.toUpperCase() === String(a.booking_number).toUpperCase())
          .sort((x, y) => x.starts_at.localeCompare(y.starts_at));
        return {
          total: list.length,
          appointments: list.slice(0, 80).map((b) => ({ no: b.booking_number, when: local(b.starts_at), weekday: dayNames[new Date(formatInTimeZone(b.starts_at, tz, 'yyyy-MM-dd') + 'T12:00:00Z').getUTCDay()], customer: b.customer_name, service: b.service_name, staff: staffName(b.staff_id), status: b.status, price: money(b.price_cents), note: b.notes || undefined })),
        };
      }
      case 'appointment_stats': {
        const [from, to] = range(a.from as string, a.to as string);
        const list = d.bookings.filter((b) => inRange(b.starts_at, from, to));
        const valid = list.filter((b) => b.status !== 'cancelled');
        const key = (b: (typeof list)[0]) => {
          switch (a.group_by) {
            case 'service':
              return b.service_name;
            case 'staff':
              return staffName(b.staff_id);
            case 'weekday':
              return dayNames[new Date(formatInTimeZone(b.starts_at, tz, 'yyyy-MM-dd') + 'T12:00:00Z').getUTCDay()];
            case 'hour':
              return `${formatInTimeZone(b.starts_at, tz, 'HH')}:00`;
            case 'day':
              return formatInTimeZone(b.starts_at, tz, 'yyyy-MM-dd');
            default:
              return 'gesamt';
          }
        };
        const groups: Record<string, { count: number; revenue_cents: number; no_show: number }> = {};
        for (const b of valid) {
          const k = key(b);
          groups[k] ||= { count: 0, revenue_cents: 0, no_show: 0 };
          groups[k].count++;
          if (b.status !== 'no_show') groups[k].revenue_cents += b.price_cents;
          if (b.status === 'no_show') groups[k].no_show++;
        }
        return {
          period: { from, to },
          note: 'Daten umfassen etwa die letzten 4 und nächsten 4 Monate.',
          total: valid.length,
          revenue: money(valid.filter((b) => b.status !== 'no_show').reduce((s, b) => s + b.price_cents, 0)),
          completed: list.filter((b) => b.status === 'completed').length,
          cancelled: list.filter((b) => b.status === 'cancelled').length,
          no_show: list.filter((b) => b.status === 'no_show').length,
          groups: Object.entries(groups)
            .sort((x, y) => y[1].count - x[1].count)
            .map(([k, v]) => ({ group: k, count: v.count, revenue: money(v.revenue_cents), no_show: v.no_show })),
        };
      }
      case 'find_free_slots': {
        const date = range(a.date as string)[0] || today;
        const sv = service(a.service as string) || d.services.find((s) => s.active);
        if (!sv) return { error: 'Keine Leistung vorhanden.' };
        const st = staff(a.staff as string);
        const slots = suggestSlots(d, { date, serviceId: sv.id, staffId: st?.id });
        return { date, weekday: dayNames[new Date(date + 'T12:00:00Z').getUTCDay()], service: sv.name, staff: st?.name || 'alle', free: slots.map((x) => `${x.time} (${staffName(x.staffId)})`).slice(0, 40), best: bestSlots(slots, 3).map((x) => x.time) };
      }
      case 'customer_insights': {
        const stats = d.customers.map((c) => {
          const visits = d.bookings.filter((b) => b.customer_id === c.id);
          const past = visits.filter((b) => b.starts_at < now.toISOString() && b.status !== 'cancelled').sort((x, y) => y.starts_at.localeCompare(x.starts_at));
          const next = visits.filter((b) => b.starts_at >= now.toISOString() && ['pending', 'confirmed'].includes(b.status)).sort((x, y) => x.starts_at.localeCompare(y.starts_at))[0];
          return { name: c.name, visits: past.length, last_visit: past[0] ? local(past[0].starts_at) : null, next_visit: next ? local(next.starts_at) : null, no_shows: visits.filter((b) => b.status === 'no_show').length, revenue: money(past.filter((b) => b.status !== 'no_show').reduce((s, b) => s + b.price_cents, 0)) };
        });
        let list = stats;
        if (a.query) list = list.filter((c) => c.name.toLowerCase().includes(String(a.query).toLowerCase()));
        if (a.inactive_days) {
          const limit = new Date(now.getTime() - Number(a.inactive_days) * 86400000).toISOString().slice(0, 16).replace('T', ' ');
          list = list.filter((c) => c.visits > 0 && !c.next_visit && (c.last_visit || '') < limit);
        }
        if (a.top) list = [...list].sort((x, y) => y.visits - x.visits).slice(0, Number(a.top));
        return { total_customers: d.customers.length, customers: list.slice(0, 60) };
      }
      case 'prepare_appointment': {
        const sv = service(a.service as string);
        const st = staff(a.staff as string);
        const date = range(a.date as string)[0];
        booking = { serviceId: sv?.id, staffId: st?.id, date, time: typeof a.time === 'string' && /^\d{1,2}:\d{2}$/.test(a.time) ? a.time.padStart(5, '0') : undefined, name: a.customer_name as string, phone: a.phone as string, notes: a.notes as string };
        const conflict =
          booking.date && booking.time && st
            ? d.bookings.some((b) => b.staff_id === st.id && ['pending', 'confirmed'].includes(b.status) && local(b.starts_at) === `${booking!.date} ${booking!.time}`)
            : false;
        return { prepared: true, service: sv?.name || 'unbekannt – bitte im Formular wählen', staff: st?.name || 'später zuweisen', date, time: booking.time, customer: booking.name, conflict, hint: 'Das Formular öffnet sich für den Nutzer zum Prüfen und Speichern.' };
      }
      case 'search_help': {
        const i = locale === 'de' ? 0 : 1;
        const docs = [...faq.map((f) => ({ t: f.q[i], b: f.a[i], href: f.href })), ...Object.values(tutorials).flatMap((tu) => tu.steps.map((s) => ({ t: `${tu.title[i]}: ${s.title[i]}`, b: s.text[i], href: `/dashboard/${tu.id === 'overview' ? '' : tu.id}` })))];
        return { results: new SearchIndex(docs, (x) => `${x.t} ${x.b}`).search(String(a.question || ''), 4).map((r) => r.item) };
      }
      default:
        return { error: 'unknown tool' };
    }
  };
  const calendar = Array.from({ length: 15 }, (_, n) => {
    const x = new Date(today + 'T12:00:00Z');
    x.setUTCDate(x.getUTCDate() + n - 1);
    return `${dayNames[x.getUTCDay()].slice(0, 2)} ${x.toISOString().slice(0, 10)}`;
  }).join(', ');
  const system = `Du bist „Slotdove KI“, der Assistent in der Termin-App Slotdove für das Unternehmen „${d.business.name}“ (${d.business.industry}).
Jetzt: ${dayNames[new Date(today + 'T12:00:00Z').getUTCDay()]}, ${today} ${formatInTimeZone(now, tz, 'HH:mm')} (${tz}). Rolle des Nutzers: ${d.role}.
Kalender (gestern bis +13 Tage, nutze ihn für Wochentage, rechne NICHT selbst): ${calendar}. Eine Woche läuft Montag bis Sonntag.
Regeln:
- Antworte ${locale === 'de' ? 'auf Deutsch in der Du-Form' : 'in English'}, freundlich, klar und kurz. Nutze Listen mit "- " und **fett** für Wichtiges. Keine Tabellen.
- Für Fragen zu Terminen, Kunden, Zahlen, freien Zeiten oder Einstellungen IMMER zuerst die Werkzeuge nutzen. Erfinde niemals Daten, Namen, Zeiten oder Beträge.
- Rechne Zeiträume selbst aus (z. B. „letzten Monat“, „nächste Woche“) und übergib Datumsangaben als YYYY-MM-DD.
- Denke mit: erkenne Muster, gib konkrete Empfehlungen (z. B. Lücken füllen, Erinnerungen, Öffnungszeiten, Stammkunden ansprechen) und begründe sie kurz mit den Zahlen.
- Nenne Buchungsnummern (SD-…), wenn du einzelne Termine erwähnst.
- Du kannst nichts direkt ändern. Möchte der Nutzer einen Termin eintragen, nutze prepare_appointment – das Formular öffnet sich dann zum Bestätigen. Für andere Änderungen erkläre kurz, wo das geht.
- Bei Bedienungsfragen nutze search_help.
- Wenn etwas fehlt oder unklar ist, frag kurz nach.
- Nenne niemals interne Werkzeug- oder Funktionsnamen. Slotdove verschickt Erinnerungen per E-Mail (24 h / 2 h vorher), keine SMS. Schlage nur Funktionen vor, die es gibt: Kalender, Buchungsseite, Wochenplan, Feiertage/Abwesenheiten, Kunden, Chat, Erinnerungen, Auswertungen.
- Maximal ca. 150 Wörter, außer der Nutzer will Details.`;
  const messages: ChatMessage[] = [{ role: 'system', content: system }, ...history.slice(-12)];
  for (let round = 0; round < 6; round++) {
    const reply = await groqChat({ messages, tools, temperature: 0.3 });
    if (reply.tool_calls?.length) {
      messages.push({ role: 'assistant', content: reply.content || null, tool_calls: reply.tool_calls });
      for (const call of reply.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {
          /* keep empty */
        }
        let result: unknown;
        try {
          result = run(call.function.name, args);
        } catch {
          result = { error: 'Werkzeug fehlgeschlagen' };
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 14000) });
      }
      continue;
    }
    return { text: (reply.content || '').trim(), booking, tools: used };
  }
  return { text: locale === 'de' ? 'Das war zu komplex für einen Durchgang. Kannst du die Frage etwas genauer stellen?' : 'That was too complex. Could you narrow the question?', booking, tools: used };
}
