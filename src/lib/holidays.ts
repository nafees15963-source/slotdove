/** German public holidays, computed locally (no external service). */
export type Holiday = { date: string; de: string; en: string; states?: string[] };
function easter(year: number) {
  // Anonymous Gregorian algorithm.
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100,
    d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31),
    day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const plus = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
export const germanStates: Record<string, string> = {
  BW: 'Baden-Württemberg',
  BY: 'Bayern',
  BE: 'Berlin',
  BB: 'Brandenburg',
  HB: 'Bremen',
  HH: 'Hamburg',
  HE: 'Hessen',
  MV: 'Mecklenburg-Vorpommern',
  NI: 'Niedersachsen',
  NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz',
  SL: 'Saarland',
  SN: 'Sachsen',
  ST: 'Sachsen-Anhalt',
  SH: 'Schleswig-Holstein',
  TH: 'Thüringen',
};
export function germanHolidays(year: number, state?: string): Holiday[] {
  const e = easter(year);
  // Buß- und Bettag: Wednesday before 23 November.
  const nov23 = new Date(Date.UTC(year, 10, 23));
  const bussTag = plus(nov23, -(((nov23.getUTCDay() + 4) % 7) || 7));
  const all: Holiday[] = [
    { date: `${year}-01-01`, de: 'Neujahr', en: "New Year's Day" },
    { date: `${year}-01-06`, de: 'Heilige Drei Könige', en: 'Epiphany', states: ['BW', 'BY', 'ST'] },
    { date: `${year}-03-08`, de: 'Internationaler Frauentag', en: "Women's Day", states: ['BE', 'MV'] },
    { date: fmt(plus(e, -2)), de: 'Karfreitag', en: 'Good Friday' },
    { date: fmt(plus(e, 1)), de: 'Ostermontag', en: 'Easter Monday' },
    { date: `${year}-05-01`, de: 'Tag der Arbeit', en: 'Labour Day' },
    { date: fmt(plus(e, 39)), de: 'Christi Himmelfahrt', en: 'Ascension Day' },
    { date: fmt(plus(e, 50)), de: 'Pfingstmontag', en: 'Whit Monday' },
    { date: fmt(plus(e, 60)), de: 'Fronleichnam', en: 'Corpus Christi', states: ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'] },
    { date: `${year}-08-15`, de: 'Mariä Himmelfahrt', en: 'Assumption Day', states: ['SL'] },
    { date: `${year}-09-20`, de: 'Weltkindertag', en: "Children's Day", states: ['TH'] },
    { date: `${year}-10-03`, de: 'Tag der Deutschen Einheit', en: 'German Unity Day' },
    { date: `${year}-10-31`, de: 'Reformationstag', en: 'Reformation Day', states: ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'] },
    { date: `${year}-11-01`, de: 'Allerheiligen', en: "All Saints' Day", states: ['BW', 'BY', 'NW', 'RP', 'SL'] },
    { date: fmt(bussTag), de: 'Buß- und Bettag', en: 'Day of Repentance', states: ['SN'] },
    { date: `${year}-12-24`, de: 'Heiligabend (frei)', en: 'Christmas Eve (closed)' },
    { date: `${year}-12-25`, de: '1. Weihnachtstag', en: 'Christmas Day' },
    { date: `${year}-12-26`, de: '2. Weihnachtstag', en: 'Boxing Day' },
    { date: `${year}-12-31`, de: 'Silvester (frei)', en: "New Year's Eve (closed)" },
  ];
  return all
    .filter((h) => !h.states || (state && h.states.includes(state)))
    .sort((a, b) => a.date.localeCompare(b.date));
}
