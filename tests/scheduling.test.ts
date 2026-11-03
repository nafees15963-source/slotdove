import { describe, it, expect } from 'vitest';
import {
  availableSlots,
  overlaps,
  calendarFile,
  type SlotRules,
} from '../src/lib/scheduling/engine';
import { formatInTimeZone } from 'date-fns-tz';
import { businessSchema, bookingSchema, serviceSchema } from '../src/lib/validation';
import { csv } from '../src/lib/utils';
const base: SlotRules = {
  timezone: 'Europe/Berlin',
  date: '2027-01-05',
  hours: [{ starts: '09:00', ends: '12:00' }],
  busy: [],
  duration: 30,
  bufferBefore: 0,
  bufferAfter: 0,
  interval: 15,
  minNotice: 0,
  maxAdvance: 365,
  now: new Date('2027-01-01T00:00:00Z'),
};
describe('availability engine', () => {
  it('returns the expected UTC slots for winter Berlin', () => {
    const s = availableSlots(base);
    expect(s[0]).toBe('2027-01-05T08:00:00.000Z');
    expect(s.at(-1)).toBe('2027-01-05T10:30:00.000Z');
    expect(s).toHaveLength(11);
  });
  it('preserves exact duration at closing', () => {
    expect(availableSlots({ ...base, duration: 180 })).toEqual(['2027-01-05T08:00:00.000Z']);
  });
  it('requires preparation and cleanup inside working hours', () => {
    const s = availableSlots({ ...base, bufferBefore: 15, bufferAfter: 15 });
    expect(s[0]).toBe('2027-01-05T08:15:00.000Z');
    expect(s.at(-1)).toBe('2027-01-05T10:15:00.000Z');
  });
  it('removes occupied times including buffers', () => {
    const s = availableSlots({
      ...base,
      busy: [{ start: '2027-01-05T09:00:00Z', end: '2027-01-05T10:00:00Z' }],
      bufferAfter: 15,
    });
    expect(s).not.toContain('2027-01-05T08:30:00.000Z');
    expect(s).toContain('2027-01-05T08:15:00.000Z');
    expect(s).toContain('2027-01-05T10:00:00.000Z');
  });
  it('honors multiple periods and lunch breaks', () => {
    const s = availableSlots({
      ...base,
      hours: [
        { starts: '09:00', ends: '10:00' },
        { starts: '11:00', ends: '12:00' },
      ],
    });
    expect(s).toHaveLength(6);
    expect(s).not.toContain('2027-01-05T08:45:00.000Z');
  });
  it('minimum notice excludes earlier slots', () => {
    const s = availableSlots({ ...base, now: new Date('2027-01-05T08:00:00Z'), minNotice: 60 });
    expect(s[0]).toBe('2027-01-05T09:00:00.000Z');
  });
  it('maximum advance window excludes far dates', () => {
    expect(availableSlots({ ...base, maxAdvance: 1 })).toEqual([]);
  });
  it('a fully blocked day yields no slots', () => {
    expect(
      availableSlots({
        ...base,
        busy: [{ start: '2027-01-05T00:00:00Z', end: '2027-01-06T00:00:00Z' }],
      }),
    ).toEqual([]);
  });
  it('does not invent wall times in the spring DST gap', () => {
    const s = availableSlots({
      ...base,
      date: '2027-03-28',
      hours: [{ starts: '01:00', ends: '05:00' }],
    });
    const wall = s.map((t) => formatInTimeZone(t, 'Europe/Berlin', 'HH:mm'));
    expect(wall.some((t) => t.startsWith('02:'))).toBe(false);
    expect(wall).toContain('03:00');
  });
  it('does not duplicate repeated wall times in autumn DST', () => {
    const s = availableSlots({
      ...base,
      date: '2027-10-31',
      hours: [{ starts: '01:00', ends: '05:00' }],
    });
    const wall = s.map((t) => formatInTimeZone(t, 'Europe/Berlin', 'HH:mm'));
    expect(new Set(wall).size).toBe(wall.length);
    expect(wall.filter((t) => t === '02:00')).toHaveLength(1);
  });
  it('handles half-hour UTC offsets', () => {
    const s = availableSlots({ ...base, timezone: 'Asia/Kolkata' });
    expect(s[0]).toBe('2027-01-05T03:30:00.000Z');
  });
  it('handles days on the opposite side of UTC', () => {
    const s = availableSlots({ ...base, timezone: 'Pacific/Kiritimati' });
    expect(s[0]).toBe('2027-01-04T19:00:00.000Z');
  });
  it('empty hours mean closed', () => {
    expect(availableSlots({ ...base, hours: [] })).toEqual([]);
  });
  it('rejects zero interval without looping', () => {
    expect(availableSlots({ ...base, interval: 0 })).toEqual([]);
  });
  it('adjacent half-open ranges do not overlap', () => {
    expect(
      overlaps(
        { start: '2027-01-05T08:00Z', end: '2027-01-05T09:00Z' },
        { start: '2027-01-05T09:00Z', end: '2027-01-05T10:00Z' },
      ),
    ).toBe(false);
  });
});
describe('exports and validation', () => {
  it('escapes calendar text instead of injecting properties', () => {
    const ics = calendarFile(
      {
        id: 'example',
        service_name: 'Review\nATTENDEE:evil',
        starts_at: '2027-01-05T08:00:00Z',
        ends_at: '2027-01-05T09:00:00Z',
      },
      { name: 'A, B', address: '1; Lane' },
    );
    expect(ics).toContain('SUMMARY:Review\\nATTENDEE:evil');
    expect(ics).not.toContain('\r\nATTENDEE:');
    expect(ics).toContain('DTSTART:20270105T080000Z');
  });
  it('neutralizes spreadsheet formula injection and escapes quotes', () => {
    expect(csv([{ name: '=IMPORTXML("x")', phone: '+491234' }])).toContain('"\'=IMPORTXML(""x"")"');
  });
  it('rejects unknown timezone and reserved slug', () => {
    const input = {
      name: 'My studio',
      slug: 'admin',
      email: 'owner@example.test',
      timezone: 'Invalid/Zone',
      currency: 'EUR',
      locale: 'de',
    };
    expect(businessSchema.safeParse(input).success).toBe(false);
    expect(
      businessSchema.safeParse({ ...input, slug: 'my-studio', timezone: 'Europe/Berlin' }).success,
    ).toBe(true);
  });
  it('rejects invalid durations and negative prices', () => {
    expect(
      serviceSchema.safeParse({
        name: 'Consultation',
        duration_minutes: 0,
        price_cents: -1,
        buffer_before: 0,
        buffer_after: 0,
      }).success,
    ).toBe(false);
  });
  it('requires consent and ignores client role fields', () => {
    const booking = {
      business_id: crypto.randomUUID(),
      service_id: crypto.randomUUID(),
      staff_id: crypto.randomUUID(),
      starts_at: '2027-01-05T09:00:00Z',
      name: 'Example Guest',
      email: 'guest@example.test',
      idempotency_key: crypto.randomUUID(),
      consent: true,
      role: 'owner',
    };
    const parsed = bookingSchema.parse(booking);
    expect('role' in parsed).toBe(false);
    expect(bookingSchema.safeParse({ ...booking, consent: false }).success).toBe(false);
  });
});

it('folds calendar content lines without splitting UTF-8 characters', () => {
  const text = calendarFile(
    {
      id: 'example',
      service_name: 'Übung '.repeat(40),
      starts_at: '2027-01-05T08:00:00Z',
      ends_at: '2027-01-05T09:00:00Z',
    },
    { name: 'Example', address: 'Address' },
  );
  for (const line of text.split('\r\n'))
    expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  expect(text.replaceAll('\r\n ', '')).toContain('Übung '.repeat(40));
});
