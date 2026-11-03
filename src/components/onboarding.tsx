'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2 } from 'lucide-react';
import { Brand } from './brand';
import { Button } from './ui/button';
import { useI18n } from './providers';
import { api, friendlyError } from '@/lib/api-client';
export function Onboarding({ email }: { email: string }) {
  const { t, locale } = useI18n(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await api<{ id: string }>('/api/businesses', 'POST', f);
      document.cookie = `slotdove-business=${result.id};path=/;SameSite=Lax`;
      router.push('/dashboard/services');
      router.refresh();
    } catch (e) {
      setError(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="onboarding">
      <Brand />
      <div className="eyebrow" style={{ marginTop: 40 }}>
        01 / 04
      </div>
      <h1>{t.createBusiness}</h1>
      <p>{t.setupText}</p>
      <form onSubmit={submit} className="panel panel-body">
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="name">{t.businessName}</label>
            <input id="name" name="name" required minLength={2} maxLength={100} />
          </div>
          <div className="field full">
            <label htmlFor="slug">{t.bookingUrl}</label>
            <div className="row">
              <span className="muted">/b/</span>
              <input
                id="slug"
                name="slug"
                pattern="[a-z][a-z0-9-]{2,49}"
                required
                placeholder="your-studio"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">{t.email}</label>
            <input id="email" name="email" type="email" required defaultValue={email} />
          </div>
          <div className="field">
            <label htmlFor="industry">{t.industry}</label>
            <select name="industry" id="industry">
              <option value="consulting">{locale === 'de' ? 'Beratung' : 'Consulting'}</option>
              <option value="beauty">Beauty</option>
              <option value="fitness">Fitness</option>
              <option value="education">{locale === 'de' ? 'Bildung' : 'Education'}</option>
              <option value="other">{locale === 'de' ? 'Andere' : 'Other'}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="timezone">{t.timezone}</label>
            <select
              name="timezone"
              id="timezone"
              defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}
            >
              {['UTC', ...Intl.supportedValuesOf('timeZone')].map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="currency">{t.currency}</label>
            <select name="currency" id="currency" defaultValue={locale === 'de' ? 'EUR' : 'USD'}>
              {['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'INR'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="locale">{t.language}</label>
            <select name="locale" id="locale" defaultValue={locale}>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="phone">{t.phone}</label>
            <input name="phone" id="phone" type="tel" />
          </div>
          <div className="field full">
            <label htmlFor="description">{t.description}</label>
            <textarea id="description" name="description" maxLength={1000} />
          </div>
          <input type="hidden" name="address" value="" />
        </div>
        {error && (
          <p role="alert" className="notice notice-error" style={{ marginTop: 20 }}>
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button disabled={busy}>
            <Building2 size={15} />
            {busy ? t.loading : t.create}
            <ArrowRight size={14} />
          </Button>
        </div>
      </form>
    </main>
  );
}
