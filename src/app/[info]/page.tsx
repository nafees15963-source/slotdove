import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { MarketingNav, MarketingFooter } from '@/components/marketing';
import { Landing } from '@/components/landing';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { infoContent } from '@/lib/i18n/info';
export default async function Page({ params }: { params: Promise<{ info: string }> }) {
  const { info } = await params;
  if (info === 'de' || info === 'en') return <Landing />;
  if (info === 'pricing') redirect('/#pricing');
  if (info === 'faq') redirect('/#faq');
  const locale = await getLocale(),
    t = await getMessages();
  if (!['about', 'contact', 'privacy', 'terms', 'legal'].includes(info)) notFound();
  const c = infoContent[locale][info as keyof typeof infoContent.en];
  return (
    <>
      <MarketingNav />
      <main className="legal-content">
        <div className="eyebrow">SLOTDOVE</div>
        <h1>{c.title}</h1>
        <p>{c.intro}</p>
        {c.sections.map(([heading, body]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p style={{ marginTop: 14 }}>{body}</p>
          </section>
        ))}
        {['about', 'contact'].includes(info) && (
          <Link href="/signup" className="btn btn-primary" style={{ justifySelf: 'start' }}>
            {t.start}
          </Link>
        )}
      </main>
      <MarketingFooter />
    </>
  );
}
