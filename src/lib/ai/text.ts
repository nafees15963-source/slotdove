/** Small text toolkit used by the local assistant. Runs in the browser and on the
 * server; no network calls and no external model. */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');
}
const stop = new Set(
  'der die das ein eine einen einem einer und oder aber ich du er sie es wir ihr mein dein sein ist sind bin bist wie was wo wer wann warum kann konnen koennen muss mussen muessen soll mit fur fuer von zu zum zur im in am an auf bei the a an and or is are to of for in on at my your how what where who when why can do does i you it this that me mir mich dir dich bitte please'.split(
    ' ',
  ),
);
/** Very light German/English stemmer: strips common inflection suffixes. */
export function stem(word: string) {
  let w = word;
  for (const suffix of ['ungen', 'ung', 'heiten', 'heit', 'keit', 'en', 'er', 'es', 'em', 'e', 'n', 's', 'ing', 'ed']) {
    if (w.length > suffix.length + 3 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w;
}
export function tokens(text: string, keepStopwords = false) {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t && (keepStopwords || !stop.has(t)))
    .map(stem);
}
export function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
/** 0..1 similarity, tolerant to typos ("harschnit" ≈ "haarschnitt"). */
export function similarity(a: string, b: string) {
  const x = normalize(a),
    y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (y.includes(x) || x.includes(y)) return 0.85 * (Math.min(x.length, y.length) / Math.max(x.length, y.length)) + 0.15;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}
/** Best fuzzy match of any word-window in `text` against the candidate names. */
export function findBest<T>(text: string, items: T[], name: (t: T) => string, threshold = 0.72) {
  const words = normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
  let best: { item: T; score: number; phrase: string } | null = null;
  for (const item of items) {
    const target = normalize(name(item));
    const size = Math.max(1, target.split(/\s+/).length);
    for (let n = Math.max(1, size - 1); n <= size + 1; n++)
      for (let i = 0; i + n <= words.length; i++) {
        const phrase = words.slice(i, i + n).join(' ');
        if (phrase.length < 3) continue;
        const score = similarity(phrase, target);
        if (score >= threshold && (!best || score > best.score)) best = { item, score, phrase };
      }
  }
  return best;
}
/** Tiny BM25 index for help articles. */
export class SearchIndex<T> {
  private docs: { item: T; terms: Map<string, number>; length: number }[] = [];
  private df = new Map<string, number>();
  constructor(items: T[], text: (t: T) => string) {
    for (const item of items) {
      const terms = new Map<string, number>();
      const list = tokens(text(item));
      for (const t of list) terms.set(t, (terms.get(t) || 0) + 1);
      for (const t of terms.keys()) this.df.set(t, (this.df.get(t) || 0) + 1);
      this.docs.push({ item, terms, length: list.length });
    }
  }
  search(query: string, limit = 3) {
    const q = tokens(query);
    if (!q.length || !this.docs.length) return [];
    const avg = this.docs.reduce((s, d) => s + d.length, 0) / this.docs.length;
    const n = this.docs.length;
    return this.docs
      .map((d) => {
        let score = 0;
        for (const term of q) {
          // Fuzzy term lookup so small typos still match.
          let tf = d.terms.get(term) || 0,
            df = this.df.get(term) || 0;
          if (!tf && term.length > 4)
            for (const [k, v] of d.terms)
              if (k.length > 4 && levenshtein(k, term) <= 1) {
                tf = v * 0.7;
                df = this.df.get(k) || 1;
                break;
              }
          if (!tf) continue;
          const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
          score += (idf * tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (d.length / avg)));
        }
        return { item: d.item, score };
      })
      .filter((r) => r.score > 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
