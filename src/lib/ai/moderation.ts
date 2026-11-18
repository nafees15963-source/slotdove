import { normalize } from './text';
/** Local, rule-based message screening. Flags (does not block) so a human can review. */
const insults = [
  'arschloch', 'wichser', 'hurensohn', 'fotze', 'missgeburt', 'spast', 'behindert', 'bastard', 'schlampe', 'hure', 'idiot',
  'vollidiot', 'penner', 'opfer', 'drecks', 'fick', 'ficken', 'verpiss', 'halt die fresse', 'fresse',
  'fuck', 'fucking', 'bitch', 'asshole', 'cunt', 'retard', 'moron', 'shut up', 'stupid',
];
const threats = [
  'ich bring dich um', 'ich toete', 'umbringen', 'abstechen', 'du wirst sterben', 'ich finde dich', 'ich weiss wo du wohnst',
  'kill you', 'i will kill', 'you will die', 'i know where you live', 'bombe', 'bomb',
];
const scams = [
  'bitcoin', 'krypto', 'crypto', 'gewonnen', 'gewinnspiel', 'you won', 'gift card', 'gutscheincode', 'geschenkkarte',
  'western union', 'paysafecard', 'ueberweise sofort', 'send money', 'passwort', 'password', 'tan ', 'iban', 'pin code',
  'whatsapp mich', 'telegram', 'onlyfans', 'casino', 'kredit ohne schufa',
];
const hate = ['nazi', 'heil hitler', 'sieg heil', 'kanake', 'neger', 'nigger', 'zigeuner', 'judensau'];
export type ModerationResult = { flagged: boolean; score: number; reasons: string[] };
const has = (text: string, list: string[]) =>
  list.filter((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text));
export function moderate(input: string): ModerationResult {
  const text = normalize(input).replace(/(.)\1{2,}/g, '$1$1').replace(/[0@]/g, 'o').replace(/[1!]/g, 'i').replace(/3/g, 'e');
  const reasons: string[] = [];
  let score = 0;
  const i = has(text, insults),
    t = has(text, threats),
    s = has(text, scams),
    h = has(text, hate);
  if (h.length) { score += 0.9; reasons.push('hate'); }
  if (t.length) { score += 0.9; reasons.push('threat'); }
  if (i.length) { score += 0.35 + 0.15 * Math.min(i.length, 3); reasons.push('insult'); }
  if (s.length) { score += 0.3 + 0.15 * Math.min(s.length, 3); reasons.push('scam'); }
  const links = (input.match(/https?:\/\/|www\./gi) || []).length;
  if (links >= 2) { score += 0.35; reasons.push('links'); }
  const letters = input.replace(/[^A-Za-zÄÖÜäöü]/g, '');
  if (letters.length > 15 && letters.replace(/[^A-ZÄÖÜ]/g, '').length / letters.length > 0.7) { score += 0.2; reasons.push('shouting'); }
  if (/(.{4,})\1{3,}/.test(input)) { score += 0.3; reasons.push('spam'); }
  score = Math.min(1, score);
  return { flagged: score >= 0.5, score: Math.round(score * 100) / 100, reasons };
}
export const reasonLabels: Record<string, { de: string; en: string }> = {
  hate: { de: 'Hassrede', en: 'Hate speech' },
  threat: { de: 'Drohung', en: 'Threat' },
  insult: { de: 'Beleidigung', en: 'Insult' },
  scam: { de: 'Betrugsverdacht', en: 'Possible scam' },
  links: { de: 'Viele Links', en: 'Many links' },
  shouting: { de: 'Schreien (Großbuchstaben)', en: 'Shouting' },
  spam: { de: 'Wiederholungen / Spam', en: 'Repetition / spam' },
  report: { de: 'Von Nutzer gemeldet', en: 'Reported by user' },
};
