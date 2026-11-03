import Link from 'next/link';
import { Brand } from '@/components/brand';
import { getLocale } from '@/lib/i18n/server';
export default async function NotFound() {
  const de = (await getLocale()) === 'de';
  return (
    <main className="error-page">
      <div style={{ margin: 'auto' }}>
        <Brand />
      </div>
      <div className="eyebrow">404</div>
      <h1>{de ? 'Hier ist gerade Freiraum.' : 'A little unplanned space.'}</h1>
      <p>{de ? 'Diese Seite wurde nicht gefunden.' : 'We couldn’t find that page.'}</p>
      <Link href="/" className="btn btn-primary">
        {de ? 'Zur Startseite' : 'Back home'}
      </Link>
    </main>
  );
}
