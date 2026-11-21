import 'server-only';
import { after } from 'next/server';
import { emailConfigured, noticeEmail, sendEmail } from './email';
import { supabaseAdmin } from './supabase/admin';

/** All lifecycle e-mails in one place. Everything is sent after the response (never blocks
 * the user), best effort, and with idempotency keys so retries never send twice. */
export function siteUrl(request?: Request | null) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  return configured?.startsWith('http') ? configured.replace(/\/$/, '') : request ? new URL(request.url).origin : '';
}
function later(job: () => Promise<unknown>) {
  if (!emailConfigured()) return;
  after(async () => {
    try {
      await job();
    } catch {
      /* e-mails are best effort; failures are visible in Resend */
    }
  });
}
type Mail = { to: string; key: string; title: string; lines: string[]; cta?: { label: string; url: string }; locale?: string };
function mail(m: Mail) {
  return sendEmail({ ...noticeEmail({ locale: m.locale || 'de', title: m.title, lines: m.lines, cta: m.cta }), to: m.to, idempotencyKey: m.key.slice(0, 250) });
}

/** Internal alert to the operator (ADMIN_ALERT_EMAIL). */
export function alertAdmin(request: Request | null, title: string, lines: string[], key: string) {
  const to = process.env.ADMIN_ALERT_EMAIL?.trim();
  if (!to) return;
  later(() => mail({ to, key: `admin-${key}`, title, lines, cta: { label: 'Admin-Panel öffnen', url: `${siteUrl(request)}/admin` } }));
}

export function mailPreRegistration(request: Request, input: { email: string; name: string; company: string; locale: string }) {
  const de = input.locale !== 'en';
  later(() =>
    mail({
      to: input.email,
      locale: input.locale,
      key: `waitlist-${input.email}`,
      title: de ? 'Danke für Ihre Voranmeldung bei Slotdove' : 'Thanks for pre-registering with Slotdove',
      lines: de
        ? [
            `Hallo ${input.name},`,
            `vielen Dank für Ihre Voranmeldung für ${input.company}. Wir prüfen jede Anmeldung persönlich.`,
            'Nach der Bestätigung erhalten Sie von uns einen persönlichen Link, mit dem Sie Ihr kostenloses Konto erstellen.',
            'Slotdove ist ein privates, kostenloses Testprojekt – es entstehen keine Kosten. Sie möchten nicht mehr kontaktiert werden? Antworten Sie einfach kurz auf diese E-Mail.',
          ]
        : [`Hello ${input.name},`, `thank you for pre-registering ${input.company}. We review every request personally and will send you a personal sign-up link once approved.`, 'Slotdove is a free, private test project.'],
    }),
  );
  alertAdmin(request, `Neue Voranmeldung: ${input.company}`, [`${input.name} · ${input.email}`, 'Im Admin unter „Voranmeldungen“ bestätigen.'], `wl-${input.email}`);
}

export function mailStaffWelcome(request: Request, input: { email: string; name: string; business: string; createdBy: string }) {
  later(() =>
    mail({
      to: input.email,
      key: `staff-welcome-${input.email}-${input.business}`,
      title: `Dein Zugang zu ${input.business}`,
      lines: [
        `Hallo ${input.name},`,
        `${input.createdBy} hat für dich einen Zugang bei Slotdove für „${input.business}“ angelegt.`,
        'Dein Startpasswort bekommst du persönlich von deinem Betrieb – aus Sicherheitsgründen schicken wir es nie per E-Mail. Bei der ersten Anmeldung vergibst du ein eigenes Passwort.',
        'Du hast mit diesem Konto nichts zu tun? Dann antworte bitte kurz auf diese E-Mail.',
      ],
      cta: { label: 'Zur Anmeldung', url: `${siteUrl(request)}/login` },
    }),
  );
}

export function mailAccountCreatedByAdmin(request: Request, input: { email: string; name: string }) {
  later(() =>
    mail({
      to: input.email,
      key: `admin-created-${input.email}`,
      title: 'Dein Slotdove-Konto wurde angelegt',
      lines: [`Hallo ${input.name},`, 'das Slotdove-Team hat für dich ein Konto angelegt. Dein Startpasswort bekommst du persönlich; bei der ersten Anmeldung vergibst du ein eigenes.'],
      cta: { label: 'Zur Anmeldung', url: `${siteUrl(request)}/login` },
    }),
  );
}

export function mailAdminAccount(input: { email: string; link: string }) {
  later(() =>
    mail({
      to: input.email,
      key: `admin-account-${input.email}-${new Date().toISOString().slice(0, 13)}`,
      title: 'Dein Slotdove-Admin-Zugang',
      lines: [
        'Für diese E-Mail-Adresse wurde ein Admin-Konto bei Slotdove eingerichtet.',
        'Setze über den Button ein Passwort (der Link ist nur einmal gültig) und melde dich danach unter /admin/login an. Beim ersten Login richtest du die Zwei-Faktor-App ein.',
        'Du hast das nicht veranlasst? Dann ignoriere diese E-Mail und informiere uns.',
      ],
      cta: { label: 'Passwort setzen', url: input.link },
    }),
  );
}

export function mailAccountTrashed(request: Request | null, input: { email: string; by: 'self' | 'admin' }) {
  const until = new Intl.DateTimeFormat('de', { dateStyle: 'long' }).format(new Date(Date.now() + 14 * 86400000));
  later(() =>
    mail({
      to: input.email,
      key: `trashed-${input.email}-${new Date().toISOString().slice(0, 10)}`,
      title: 'Dein Slotdove-Konto wird gelöscht',
      lines: [
        input.by === 'self' ? 'du hast dein Slotdove-Konto gelöscht.' : 'dein Slotdove-Konto wurde vom Slotdove-Team gesperrt und zur Löschung vorgemerkt.',
        'Die Anmeldung ist ab sofort gesperrt und eine eventuelle Buchungsseite offline.',
        `Bis zum ${until} kann alles wiederhergestellt werden – antworte dazu einfach auf diese E-Mail. Danach werden Konto, Betrieb, Termine, Kunden und Bilder endgültig gelöscht.`,
      ],
    }),
  );
  alertAdmin(request, 'Konto im Papierkorb', [input.email, input.by === 'self' ? 'selbst gelöscht' : 'durch Admin'], `trash-${input.email}`);
}

export function mailAccountRestored(input: { email: string }) {
  later(() =>
    mail({
      to: input.email,
      key: `restored-${input.email}-${new Date().toISOString().slice(0, 13)}`,
      title: 'Dein Slotdove-Konto ist wieder aktiv',
      lines: ['Dein Konto wurde wiederhergestellt. Du kannst dich wie gewohnt anmelden; deine Buchungsseite ist wieder im vorherigen Zustand.'],
      cta: { label: 'Zur Anmeldung', url: `${siteUrl(null)}/login` },
    }),
  );
}

/** Sent synchronously before the account disappears (the address is gone afterwards). */
export async function mailAccountPurged(email: string) {
  if (!emailConfigured() || !email) return;
  try {
    await mail({
      to: email,
      key: `purged-${email}`,
      title: 'Dein Slotdove-Konto wurde endgültig gelöscht',
      lines: ['Dein Konto und alle zugehörigen Daten (Betrieb, Termine, Kunden, Bilder, Chats) wurden endgültig gelöscht.', 'Danke, dass du Slotdove ausprobiert hast.'],
    });
  } catch {
    /* best effort */
  }
}

export function mailSigned(request: Request, input: { email: string; name: string; version: string }) {
  later(() =>
    mail({
      to: input.email,
      key: `signed-${input.email}-${input.version}`,
      title: 'Bestätigung deiner Zustimmung',
      lines: [
        `Hallo ${input.name},`,
        `du hast den Nutzungsbedingungen, dem Auftragsverarbeitungsvertrag und der Datenschutzerklärung (Version ${input.version}) online zugestimmt und mit deinem Namen unterschrieben.`,
        'Den Nachweis kannst du jederzeit als PDF speichern. Die Texte findest du unter /agb, /avv und /datenschutz.',
      ],
      cta: { label: 'Nachweis ansehen', url: `${siteUrl(request)}/account/nachweis` },
    }),
  );
}

export function mailDsrReceived(input: { email: string; name: string; caseNumber: string; type: string }) {
  const due = new Intl.DateTimeFormat('de', { dateStyle: 'long' }).format(new Date(Date.now() + 30 * 86400000));
  later(() =>
    mail({
      to: input.email,
      key: `dsr-${input.caseNumber}`,
      title: `Ihre Datenschutzanfrage ${input.caseNumber}`,
      lines: [
        `Guten Tag${input.name ? ` ${input.name}` : ''},`,
        `wir haben Ihre Anfrage (${input.type}) unter der Fallnummer ${input.caseNumber} erhalten.`,
        `Wir beantworten sie spätestens bis zum ${due} (Art. 12 Abs. 3 DSGVO). Falls wir Ihre Identität prüfen müssen, melden wir uns vorher bei Ihnen.`,
      ],
    }),
  );
}

export function mailSupportOpened(request: Request, input: { email: string; caseNumber: string; subject: string; business: string }) {
  later(() =>
    mail({
      to: input.email,
      key: `ticket-open-${input.caseNumber}`,
      title: `Dein Support-Fall ${input.caseNumber}`,
      lines: [`Wir haben deine Anfrage „${input.subject}“ erhalten und melden uns so schnell wie möglich.`, 'Antworten siehst du im Dashboard unter „Hilfe & Support“ – wir schicken dir zusätzlich eine E-Mail.'],
      cta: { label: 'Fall ansehen', url: `${siteUrl(request)}/dashboard/support` },
    }),
  );
  alertAdmin(request, `Neuer Support-Fall ${input.caseNumber}`, [input.business, input.subject], `ticket-${input.caseNumber}`);
}

/** Tells the owner that an invited person joined the team. */
export function mailMemberJoined(request: Request, input: { businessId: string; memberEmail: string }) {
  later(async () => {
    const { data: b } = await supabaseAdmin().from('businesses').select('name,email,is_demo').eq('id', input.businessId).single();
    if (!b?.email || b.is_demo) return;
    await mail({
      to: b.email,
      key: `joined-${input.businessId}-${input.memberEmail}`,
      title: `Neues Teammitglied bei ${b.name}`,
      lines: [`${input.memberEmail} hat deine Einladung angenommen und gehört jetzt zum Team von „${b.name}“.`, 'Rolle und Zugriffe kannst du jederzeit unter „Team“ ändern.'],
      cta: { label: 'Team ansehen', url: `${siteUrl(request)}/dashboard/staff` },
    });
  });
}
