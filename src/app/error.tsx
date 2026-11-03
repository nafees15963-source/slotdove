'use client';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/providers';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="error-page">
      <h1>{t.unavailable}</h1>
      <p>{t.error}</p>
      <Button onClick={reset}>{t.retry}</Button>
    </main>
  );
}
