import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const { normalizeFrom } = await import('../src/lib/email');
describe('sender normalisation', () => {
  it.each([
    ['termine@slotdove.de', 'Slotdove <termine@slotdove.de>'],
    ['Slotdove <termine@slotdove.de>', 'Slotdove <termine@slotdove.de>'],
    ['"Salon Aurora <hallo@aurora.de>"', 'Salon Aurora <hallo@aurora.de>'],
    ['Slotdove termine@slotdove.de', 'Slotdove <termine@slotdove.de>'],
    ['slotdove.de', 'Slotdove <termine@slotdove.de>'],
    ['https://slotdove.de/', 'Slotdove <termine@slotdove.de>'],
    ['Slotdove', ''],
    ['', ''],
  ])('%s', (input, expected) => expect(normalizeFrom(input)).toBe(expected));
});
