import { describe, expect, it } from 'vitest';
import { parseBookingText, parseTime } from '../src/lib/ai/parse';
import { moderate } from '../src/lib/ai/moderation';
import { germanHolidays } from '../src/lib/holidays';
import { SearchIndex, similarity } from '../src/lib/ai/text';
const ctx = {
  today: '2026-11-18',
  services: [
    { id: 's1', name: 'Haarschnitt Damen' },
    { id: 's2', name: 'Färben' },
  ],
  staff: [{ id: 'a', name: 'Lena Schmidt' }],
};
describe('booking sentence parser', () => {
  it('understands a full German sentence', () => {
    const r = parseBookingText('Morgen 14:30 Haarschnitt für Anna Müller 0171 2345678 bei Lena', ctx);
    expect(r).toMatchObject({ date: '2026-11-19', time: '14:30', serviceId: 's1', staffId: 'a', name: 'Anna Müller', phone: '0171 2345678' });
  });
  it('handles weekdays, typos and colloquial times', () => {
    const r = parseBookingText('nächsten Freitag halb 3 farben Jonas', ctx);
    expect(r.date).toBe('2026-11-20');
    expect(r.time).toBe('14:30');
    expect(r.serviceId).toBe('s2');
  });
  it('does not read a date as a time', () => {
    expect(parseBookingText('12.12. 10 Uhr Färben Mia', ctx)).toMatchObject({ date: '2026-12-12', time: '10:00' });
  });
  it('parses English times', () => {
    expect(parseTime('at 3pm')?.time).toBe('15:00');
  });
});
describe('moderation', () => {
  it('flags insults and scams but not normal messages', () => {
    expect(moderate('Ich komme 10 Minuten später, sorry!').flagged).toBe(false);
    expect(moderate('Du Arschloch').flagged).toBe(true);
    expect(moderate('Gewinnspiel! Bitcoin www.a.de www.b.de').reasons).toContain('scam');
  });
});
describe('holidays', () => {
  it('computes movable German holidays', () => {
    const days = germanHolidays(2027, 'BY').map((h) => h.date);
    expect(days).toContain('2027-03-26'); // Good Friday
    expect(days).toContain('2027-05-27'); // Corpus Christi (BY)
    expect(germanHolidays(2027).map((h) => h.date)).not.toContain('2027-05-27');
  });
  it('places Buß- und Bettag on the Wednesday before 23 November', () => {
    expect(germanHolidays(2026, 'SN').find((h) => h.de.startsWith('Buß'))?.date).toBe('2026-11-18');
  });
});
describe('text search', () => {
  it('is typo tolerant', () => {
    expect(similarity('harschnit', 'haarschnitt')).toBeGreaterThan(0.7);
    const index = new SearchIndex(['Feiertage eintragen und Urlaub sperren', 'Preise und Tarife'], (s) => s);
    expect(index.search('Wie trage ich Feiertage ein?')[0]?.item).toContain('Feiertage');
  });
});
import { cleanText } from '../src/lib/sanitize';
describe('form sanitising', () => {
  it('removes tags, control characters and hidden unicode', () => {
    expect(cleanText('  Salon <script>alert(1)</script>Aurora‮\u0007  ')).toBe('Salon alert(1)Aurora');
    expect(cleanText('Zeile 1\r\nZeile 2\u0000', true)).toBe('Zeile 1\nZeile 2');
    expect(cleanText('Müller &amp; Söhne')).toBe('Müller &amp; Söhne');
  });
});
