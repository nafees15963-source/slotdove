import { cookies, headers } from 'next/headers';
import { en } from './en';
import { de } from './de';
import { detectLocale } from './detect';
export async function getLocale() {
  const h = await headers();
  const language = h.get('x-slotdove-locale');
  if (language === 'de' || language === 'en') return language;
  // An explicit choice (language switch) always wins.
  const chosen = (await cookies()).get('slotdove-locale')?.value;
  if (chosen === 'de' || chosen === 'en') return chosen;
  // Otherwise: visitors from the USA, the UK etc. get English automatically.
  return detectLocale(h.get('x-vercel-ip-country'), h.get('accept-language'));
}
export async function getMessages() {
  return (await getLocale()) === 'de' ? de : en;
}
