/** Language for visitors who have not chosen one yet: by country (from the hosting edge), then by browser. */
const ENGLISH = new Set(['US', 'GB', 'UK', 'IE', 'CA', 'AU', 'NZ', 'ZA', 'IN', 'SG', 'MT', 'JM', 'PH', 'NG', 'KE', 'GH']);
const GERMAN = new Set(['DE', 'AT', 'CH', 'LI', 'LU']);
export function detectLocale(country: string | null | undefined, acceptLanguage: string | null | undefined): 'de' | 'en' {
  const c = (country || '').toUpperCase();
  if (ENGLISH.has(c)) return 'en';
  if (GERMAN.has(c)) return 'de';
  const first = (acceptLanguage || '').split(',')[0]?.trim().toLowerCase() || '';
  if (!first) return 'de';
  return first.startsWith('de') ? 'de' : 'en';
}
