'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Brand } from './brand';
import { Preferences } from './preferences';
import { useI18n } from './providers';
import { Button } from './ui/button';
import { api, friendlyError } from '@/lib/api-client';
export function AuthForm({
  mode,
  admin = false,
}: {
  mode: 'login' | 'signup' | 'reset' | 'update';
  admin?: boolean;
}) {
  const { t, locale } = useI18n(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [showPassword, setShowPassword] = useState(false),
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
        legal: mode === 'signup' ? f.get('legal') === 'on' : undefined,
        invite: mode === 'signup' ? new URLSearchParams(location.hash.slice(1)).get('invite') || undefined : undefined,
      });
      if (mode === 'update' && new URLSearchParams(location.search).get('first')) {
        router.push('/dashboard');
        router.refresh();
      } else if (mode === 'login') {
        router.push(admin ? '/admin' : '/dashboard');
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
          <p>
            {admin
              ? locale === 'de'
                ? 'Slotdove Plattformverwaltung. Unternehmen, Zugänge und Betrieb an einem Ort.'
                : 'Slotdove platform administration. Businesses, access and operations in one place.'
              : t.authSub}
          </p>
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
            {admin
              ? locale === 'de'
                ? 'Plattform-Admin anmelden'
                : 'Platform administrator sign in'
              : mode === 'login'
                ? t.loginTitle
                : mode === 'signup'
                  ? t.signupTitle
                  : mode === 'reset'
                    ? t.reset
                    : t.changePassword}
          </h1>
          <p>
            {mode === 'login'
              ? admin
                ? locale === 'de'
                  ? 'Nur für freigeschaltete Plattform-Administratoren. Kein Unternehmens-Onboarding erforderlich.'
                  : 'For authorized platform administrators. No business onboarding required.'
                : t.authSub
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
                  <div className="password-input">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      aria-label={
                        locale === 'de'
                          ? showPassword
                            ? 'Passwort verbergen'
                            : 'Passwort anzeigen'
                          : showPassword
                            ? 'Hide password'
                            : 'Show password'
                      }
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {mode !== 'login' && (
                    <small>
                      {locale === 'de' ? 'Mindestens 12 Zeichen.' : 'At least 12 characters.'}
                    </small>
                  )}
                </div>
              )}
              {mode === 'signup' && (
                <label className="check-label" style={{ marginTop: 14, fontSize: 12, lineHeight: 1.5 }}>
                  <input type="checkbox" name="legal" required />
                  <span>
                    {locale === 'de' ? (
                      <>
                        Ich handle als Unternehmer (§ 14 BGB) und akzeptiere die <Link href="/agb" target="_blank">AGB</Link> sowie den{' '}
                        <Link href="/avv" target="_blank">Auftragsverarbeitungsvertrag</Link>. Die <Link href="/datenschutz" target="_blank">Datenschutzerklärung</Link> habe ich zur Kenntnis genommen.
                      </>
                    ) : (
                      <>
                        I act as a business and accept the <Link href="/agb" target="_blank">terms</Link> and the <Link href="/avv" target="_blank">data processing agreement</Link>. I have read the{' '}
                        <Link href="/datenschutz" target="_blank">privacy policy</Link>.
                      </>
                    )}
                  </span>
                </label>
              )}
              {mode === 'update' && <FirstLoginNotice locale={locale} />}
              {mode === 'signup' && <InviteNotice locale={locale} />}
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
          {!admin && (
            <div className="auth-foot">
              {mode === 'login' ? t.noAccount : t.hasAccount}{' '}
              <Link href={mode === 'login' ? '/signup' : '/login'}>
                {mode === 'login' ? t.signUp : t.login}
              </Link>
            </div>
          )}
          <div className="auth-foot" style={{ marginTop: 40, fontSize: 10 }}>
            <Link href="/datenschutz">{t.privacy}</Link> · <Link href="/agb">{t.terms}</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function FirstLoginNotice({ locale }: { locale: string }) {
  const [first] = useState(() => typeof window !== 'undefined' && !!new URLSearchParams(window.location.search).get('first'));
  if (!first) return null;
  return (
    <p className="notice" style={{ margin: '14px 0' }}>
      {locale === 'de'
        ? 'Willkommen! Dein Zugang wurde von deinem Betrieb angelegt. Bitte vergib aus Sicherheitsgründen jetzt ein eigenes Passwort.'
        : 'Welcome! Your account was created by your business. Please choose your own password now.'}
    </p>
  );
}

function InviteNotice({ locale }: { locale: string }) {
  const [invited] = useState(() => typeof window === 'undefined' || new URLSearchParams(window.location.hash.slice(1)).has('invite'));
  if (invited) return null;
  return (
    <p className="notice" style={{ margin: '14px 0', fontSize: 12.5 }}>
      {locale === 'de' ? (
        <>
          In der Startphase ist die Registrierung nur mit einem persönlichen Link oder einer Team-Einladung möglich. Noch nichts davon? <Link href="/#warteliste">Hier kostenlos voranmelden</Link>.
        </>
      ) : (
        <>
          During the launch phase you need a personal link to sign up. <Link href="/#warteliste">Pre-register here</Link>.
        </>
      )}
    </p>
  );
}
