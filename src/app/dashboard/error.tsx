'use client';
import Link from 'next/link';
import { useI18n } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="error-page">
      <AlertCircle size={35} className="purple" style={{ margin: 'auto' }} />
      <h1>{t.unavailable}</h1>
      <p>{t.setupUnavailable}</p>
      <Button onClick={reset}>{t.retry}</Button>
      <Button variant="outline" asChild>
        <Link href="/">{t.back}</Link>
      </Button>
    </div>
  );
}
