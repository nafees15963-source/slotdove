import { describe, expect, it } from 'vitest';
import { detectLocale } from '../src/lib/i18n/detect';
describe('detectLocale', () => {
  it('uses English for the USA and the UK', () => {
    expect(detectLocale('US', 'de-DE')).toBe('en');
    expect(detectLocale('GB', null)).toBe('en');
  });
  it('uses German for German-speaking countries', () => {
    expect(detectLocale('DE', 'en-US')).toBe('de');
    expect(detectLocale('at', null)).toBe('de');
  });
  it('falls back to the browser language elsewhere', () => {
    expect(detectLocale('FR', 'fr-FR,fr;q=0.9')).toBe('en');
    expect(detectLocale('FR', 'de-DE')).toBe('de');
    expect(detectLocale(null, null)).toBe('de');
  });
});
