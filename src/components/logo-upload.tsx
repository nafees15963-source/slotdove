'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useI18n } from './providers';
import { useWorkspace } from './dashboard/shell';
export function LogoUpload() {
  const { t, locale } = useI18n(),
    w = useWorkspace(),
    router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="panel panel-body" style={{ marginBottom: 24 }}>
      <div className="row wrap">
        {w.business.logo_path ? (
          <Image
            alt={w.business.name}
            width={60}
            height={60}
            unoptimized
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-logos/${w.business.logo_path}`}
            style={{ borderRadius: 12, objectFit: 'contain' }}
          />
        ) : (
          <div className="booking-business-icon" style={{ margin: 0, width: 55, height: 55 }}>
            {w.business.name.slice(0, 1)}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <label htmlFor="logo-file">
            {locale === 'de' ? 'Dein Unternehmenslogo' : 'Your business logo'}
          </label>
          <small>
            PNG, JPEG, WebP · max. 2 MB ·{' '}
            {locale === 'de' ? 'öffentlich sichtbar' : 'publicly visible'}
          </small>
        </div>
        <div style={{ maxWidth: 240 }}>
          <input
            id="logo-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            aria-label={locale === 'de' ? 'Logo hochladen' : 'Upload logo'}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2097152) {
                toast.error(locale === 'de' ? 'Maximal 2 MB.' : 'Maximum 2 MB.');
                return;
              }
              setBusy(true);
              try {
                const form = new FormData();
                form.set('file', file);
                const r = await fetch(`/api/businesses/${w.business.id}/logo`, {
                  method: 'POST',
                  body: form,
                });
                if (!r.ok) throw new Error();
                toast.success(t.saved);
                router.refresh();
              } catch {
                toast.error(
                  locale === 'de'
                    ? 'Upload fehlgeschlagen. Prüfe Dateiformat und Storage-Einrichtung.'
                    : 'Upload failed. Check the file format and Storage setup.',
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
