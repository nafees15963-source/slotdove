'use client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { createContext, useContext, type ReactNode } from 'react';
import { type Messages } from '@/lib/i18n/en';
import { de } from '@/lib/i18n/de';
export const LocaleContext = createContext<{ locale: 'de' | 'en'; t: Messages }>({
  locale: 'de',
  t: de,
});
export function useI18n() {
  return useContext(LocaleContext);
}
export function Providers({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: 'de' | 'en';
  messages: Messages;
}) {
  return (
    <LocaleContext.Provider value={{ locale, t: messages }}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <>
          {children}
          <Toaster richColors position="bottom-right" />
        </>
      </ThemeProvider>
    </LocaleContext.Provider>
  );
}
