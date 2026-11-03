import { cookies, headers } from 'next/headers';
import { en } from './en';
import { de } from './de';
export async function getLocale() {
  const language = (await headers()).get('x-slotdove-locale');
  if (language === 'de' || language === 'en') return language;
  return (await cookies()).get('slotdove-locale')?.value === 'de' ? 'de' : 'en';
}
export async function getMessages() {
  return (await getLocale()) === 'de' ? de : en;
}
