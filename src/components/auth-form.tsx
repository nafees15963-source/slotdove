'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Brand } from './brand';
import { Preferences } from './preferences';
import { useI18n } from './providers';
import { Button } from './ui/button';
import { api, friendlyError } from '@/lib/api-client';
export function AuthForm({ mode }: { mode: 'login' | 'signup' | 'reset' | 'update' }) {
  const { t, locale } = useI18n(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      await api('/api/auth', 'POST', {
        action: mode,
        email: f.get('email') || undefined,
        password: f.get('password') || undefined,
        name: f.get('name') || undefined,
      });
      if (mode === 'login') {
        router.push('/dashboard');
        router.refresh();
      } else
        setSuccess(mode === 'signup' ? t.checkEmail : mode === 'reset' ? t.resetSent : t.saved);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(
        code === 'INVALID_CREDENTIALS'
          ? locale === 'de'
            ? 'E-Mail oder Passwort stimmen nicht.'
            : 'Email or password is incorrect.'
          : friendlyError(err, locale),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div>
          <h1>
            {locale === 'de' ? (
              <>
                Mehr Zeit.
                <br />
                Mehr <em>Möglichkeiten.</em>
              </>
            ) : (
              <>
                A little time.
                <br />A world of <em>possibilities.</em>
              </>
            )}
          </h1>
          <p>{t.authSub}</p>
        </div>
        <div className="row muted" style={{ fontSize: 11 }}>
          <ShieldCheck size={15} />
          {locale === 'de'
            ? 'Ein durchdachtes Zuhause für dein Unternehmen.'
            : 'A thoughtful home for your business.'}
        </div>
      </aside>
      <main className="auth-form-side">
        <div className="auth-top">
          <Preferences />
        </div>
        <div className="auth-form">
          <div style={{ marginBottom: 35 }}>
            <Brand compact />
          </div>
          <h1>
            {mode === 'login'
              ? t.loginTitle
              : mode === 'signup'
                ? t.signupTitle
                : mode === 'reset'
                  ? t.reset
                  : t.changePassword}
          </h1>
          <p>
            {mode === 'login'
              ? t.authSub
              : mode === 'signup'
                ? t.setupText
                : locale === 'de'
                  ? 'Sicher zurück in deinen Arbeitsbereich.'
                  : 'Securely return to your workspace.'}
          </p>
          {success ? (
            <div className="stack">
              <div className="notice">{success}</div>
              <Button variant="outline" asChild>
                <Link href="/login">{t.login}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {mode === 'signup' && (
                <div className="field">
                  <label htmlFor="name">{t.accountName}</label>
                  <input
                    id="name"
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                  />
                </div>
              )}
              {mode !== 'update' && (
                <div className="field">
                  <label htmlFor="email">{t.email}</label>
                  <input id="email" name="email" type="email" required autoComplete="email" />
                </div>
              )}
              {mode !== 'reset' && (
                <div className="field">
                  <div className="spread">
                    <label htmlFor="password">
                      {mode === 'update' ? t.newPassword : t.password}
                    </label>
                    {mode === 'login' && (
                      <Link href="/forgot-password" className="purple" style={{ fontSize: 11 }}>
                        {t.forgot}
                      </Link>
                    )}
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  {mode !== 'login' && (
                    <small>
                      {locale === 'de' ? 'Mindestens 12 Zeichen.' : 'At least 12 characters.'}
                    </small>
                  )}
                </div>
              )}
              {error && (
                <p className="notice notice-error" role="alert" style={{ margin: '18px 0' }}>
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy} style={{ marginTop: 15 }}>
                {busy ? (
                  <span className="spinner" />
                ) : mode === 'login' ? (
                  t.login
                ) : mode === 'signup' ? (
                  t.signUp
                ) : mode === 'reset' ? (
                  t.reset
                ) : (
                  t.changePassword
                )}
                <ArrowRight size={15} />
              </Button>
            </form>
          )}
          <div className="auth-foot">
            {mode === 'login' ? t.noAccount : t.hasAccount}{' '}
            <Link href={mode === 'login' ? '/signup' : '/login'}>
              {mode === 'login' ? t.signUp : t.login}
            </Link>
          </div>
          <div className="auth-foot" style={{ marginTop: 40, fontSize: 10 }}>
            <Link href="/privacy">{t.privacy}</Link> · <Link href="/terms">{t.terms}</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
