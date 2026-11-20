import { MaintenanceBanner } from '@/components/maintenance-banner';
import '@fontsource-variable/inter';
import type { Metadata } from 'next';
import './globals.css';
import './redesign.css';
import './v2.css';
import './admin.css';
import { Providers } from '@/components/providers';
import { getLocale, getMessages } from '@/lib/i18n/server';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  alternates: { languages: { en: '/en', de: '/de' } },
  title: { default: 'Slotdove — Your time. Beautifully booked.', template: '%s · Slotdove' },
  description:
    'A thoughtful home for your appointments, your team, and your business. Online booking, beautifully simple.',
  robots: { index: true, follow: true },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <MaintenanceBanner />
        <Providers locale={locale} messages={await getMessages()}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
