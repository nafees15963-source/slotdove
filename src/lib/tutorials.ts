/** Step-by-step guides for every screen. Used by the tutorial player and as the
 * knowledge base of the local assistant. `target` points to a data-tour attribute. */
export type Visual =
  | 'welcome' | 'quick-add' | 'calendar' | 'booking-form' | 'week-plan' | 'buffer' | 'slot-grid' | 'share-link'
  | 'chat' | 'customers' | 'team' | 'stats' | 'bell' | 'settings' | 'plans' | 'holiday' | 'assign' | 'ai' | 'report' | 'support';
export type TutorialStep = { title: [string, string]; text: [string, string]; visual: Visual; target?: string };
export type Tutorial = { id: string; title: [string, string]; steps: TutorialStep[] };
const t = (de: string, en: string): [string, string] => [de, en];
export const tutorials: Record<string, Tutorial> = {
  overview: {
    id: 'overview',
    title: t('Deine Startseite', 'Your home screen'),
    steps: [
      { visual: 'welcome', title: t('Willkommen bei Slotdove 👋', 'Welcome to Slotdove 👋'), text: t('Hier siehst du jeden Morgen auf einen Blick, was heute ansteht. Diese kurze Tour zeigt dir alles in unter einer Minute.', 'Every morning you see at a glance what is happening today. This short tour takes less than a minute.') },
      { visual: 'quick-add', target: 'quick-add', title: t('Termin in einem Satz', 'Book in one sentence'), text: t('Tippe einfach „Morgen 14 Uhr Haarschnitt Anna“. Die Slotdove-KI erkennt Datum, Uhrzeit, Leistung und Namen und füllt alles für dich aus.', 'Just type “tomorrow 2pm haircut Anna”. Slotdove AI detects date, time, service and name and fills in the form.') },
      { visual: 'calendar', target: 'today', title: t('Dein Tag als Zeitleiste', 'Your day as a timeline'), text: t('Alle heutigen Termine in Reihenfolge. Klick auf einen Termin, um ihn zu bestätigen, zu verschieben oder jemandem zuzuordnen.', 'All of today’s appointments in order. Click one to confirm, move or assign it.') },
      { visual: 'ai', target: 'insights', title: t('Tipps von der KI', 'Tips from the AI'), text: t('Slotdove rechnet lokal mit deinen Daten: Auslastung, Umsatz, No-Shows und offene Aufgaben. Ohne externe Server.', 'Slotdove computes locally from your data: utilisation, revenue, no-shows and open tasks. No external servers.') },
      { visual: 'support', target: 'help', title: t('Hilfe ist immer da', 'Help is always here'), text: t('Oben rechts startest du auf jeder Seite das passende Tutorial (?) oder fragst die KI (✨). Fertig – leg los!', 'Top right: start the tutorial for any page (?) or ask the AI (✨). That’s it – let’s go!') },
    ],
  },
  calendar: {
    id: 'calendar',
    title: t('Kalender', 'Calendar'),
    steps: [
      { visual: 'calendar', title: t('Monat, Woche, Tag oder Liste', 'Month, week, day or list'), text: t('Oben wechselst du die Ansicht. Pfeile blättern, „Heute“ springt zurück.', 'Switch views at the top. Arrows page through time, “Today” jumps back.'), target: 'views' },
      { visual: 'booking-form', title: t('Neuer Termin', 'New appointment'), text: t('Klick auf „Neuer Termin“ oder direkt auf einen Tag. Du brauchst nur Leistung, Zeit und einen Namen – E-Mail und Mitarbeiter sind optional.', 'Click “New appointment” or a day. You only need a service, a time and a name – email and staff are optional.'), target: 'new-booking' },
      { visual: 'assign', title: t('Später zuordnen', 'Assign later'), text: t('Termine ohne Mitarbeiter erscheinen gestrichelt. Öffne sie und wähle jemanden, sobald es feststeht.', 'Appointments without staff appear dashed. Open one and choose someone when it is decided.') },
      { visual: 'slot-grid', title: t('Filter', 'Filters'), text: t('Filtere nach Mitarbeiter, Leistung oder Status, um z. B. nur offene Anfragen zu sehen.', 'Filter by staff, service or status, e.g. to see only open requests.'), target: 'filters' },
    ],
  },
  appointments: {
    id: 'appointments',
    title: t('Terminliste', 'Appointment list'),
    steps: [
      { visual: 'calendar', title: t('Alle Termine als Liste', 'All appointments as a list'), text: t('Praktisch zum Abarbeiten: Bestätigen, Absagen, als erledigt oder nicht erschienen markieren.', 'Handy for working through: confirm, cancel, mark done or no-show.') },
      { visual: 'booking-form', title: t('Status-Farben', 'Status colours'), text: t('Gelb = wartet auf Bestätigung, Grün = bestätigt/erledigt, Rot = storniert/nicht erschienen.', 'Yellow = waiting, green = confirmed/done, red = cancelled/no-show.') },
    ],
  },
  customers: {
    id: 'customers',
    title: t('Kunden', 'Customers'),
    steps: [
      { visual: 'customers', title: t('Deine Kundenkartei', 'Your customer file'), text: t('Jeder, der bucht, landet automatisch hier. Du kannst Kunden auch selbst anlegen – nur der Name ist Pflicht.', 'Everyone who books appears here automatically. You can add customers yourself – only the name is required.') },
      { visual: 'report', title: t('Datenschutz eingebaut', 'Privacy built in'), text: t('Export als Datei oder Anonymisieren auf Wunsch eines Kunden (DSGVO) mit einem Klick.', 'Export a file or anonymise on request (GDPR) with one click.') },
    ],
  },
  services: {
    id: 'services',
    title: t('Leistungen', 'Services'),
    steps: [
      { visual: 'booking-form', title: t('Was bietest du an?', 'What do you offer?'), text: t('Eine Leistung hat Name, Dauer und Preis. Beispiel: „Haarschnitt, 45 Min, 35 €“.', 'A service has a name, duration and price. Example: “Haircut, 45 min, €35”.') },
      { visual: 'buffer', title: t('Puffer = Luft zwischen Terminen', 'Buffers = breathing room'), text: t('Vorbereitung und Nachbereitung blockieren Zeit vor oder nach dem Termin, z. B. zum Aufräumen. Kunden sehen das nicht.', 'Preparation and follow-up block time before or after, e.g. for cleaning. Customers don’t see it.') },
      { visual: 'assign', title: t('Wer macht das?', 'Who does it?'), text: t('Haken bei den Teammitgliedern setzen. Nur so können Kunden die Leistung online buchen.', 'Tick the team members. Only then can customers book the service online.') },
    ],
  },
  staff: {
    id: 'staff',
    title: t('Team', 'Team'),
    steps: [
      { visual: 'team', title: t('Teamprofile', 'Team profiles'), text: t('Ein Profil ist einfach ein Name im Kalender. Die Person braucht kein eigenes Konto.', 'A profile is simply a name in the calendar. The person does not need an account.') },
      { visual: 'support', title: t('Optional: Zugang einladen', 'Optional: invite access'), text: t('Mit „Einladen“ bekommt die Person einen Login und sieht nur ihre eigenen Termine.', 'With “Invite” the person gets a login and only sees their own appointments.') },
    ],
  },
  availability: {
    id: 'availability',
    title: t('Arbeitszeiten & freie Tage', 'Hours & days off'),
    steps: [
      { visual: 'week-plan', title: t('Wochenplan zum Anklicken', 'Click-through week plan'), text: t('Schalte Tage ein oder aus und stelle Beginn und Ende ein. Pause? Einfach „+ Pause“.', 'Toggle days on or off and set start and end. A break? Just “+ break”.'), target: 'week-plan' },
      { visual: 'week-plan', title: t('Für alle Tage übernehmen', 'Copy to all days'), text: t('Stell Montag ein und klicke „Auf alle Werktage kopieren“. Fertig in 10 Sekunden.', 'Set Monday and click “Copy to all weekdays”. Done in 10 seconds.') },
      { visual: 'holiday', title: t('Feiertage & Urlaub', 'Holidays & vacation'), text: t('„Feiertage eintragen“ blockt alle gesetzlichen Feiertage deines Bundeslandes. Urlaub trägst du unter „Abwesenheit“ ein.', '“Add public holidays” blocks all holidays of your state. Add vacation under “Time off”.'), target: 'holidays' },
    ],
  },
  booking: {
    id: 'booking',
    title: t('Buchungsseite', 'Booking page'),
    steps: [
      { visual: 'share-link', title: t('Deine eigene Buchungsseite', 'Your own booking page'), text: t('Kunden wählen dort Leistung und freie Zeit. Teile den Link auf Instagram, Google oder WhatsApp.', 'Customers pick a service and free time. Share the link on Instagram, Google or WhatsApp.') },
      { visual: 'slot-grid', title: t('Buchungsregeln', 'Booking rules'), text: t('Vorlauf = wie kurzfristig gebucht werden darf. Raster = in welchen Abständen Zeiten angeboten werden (z. B. alle 15 Min).', 'Notice = how short-notice bookings may be. Interval = the spacing of offered times (e.g. every 15 min).') },
      { visual: 'share-link', title: t('Veröffentlichen', 'Publish'), text: t('Schalter „Veröffentlicht“ an – ab dann ist die Seite live.', 'Switch “Published” on – the page is live.') },
    ],
  },
  analytics: {
    id: 'analytics',
    title: t('Auswertungen', 'Analytics'),
    steps: [
      { visual: 'stats', title: t('Zahlen, die helfen', 'Numbers that help'), text: t('Termine, Umsatz, beliebte Leistungen und No-Shows für einen Zeitraum deiner Wahl.', 'Appointments, revenue, popular services and no-shows for any period.') },
      { visual: 'ai', title: t('KI-Einschätzung', 'AI assessment'), text: t('Die KI erklärt, was die Zahlen bedeuten, und schlägt nächste Schritte vor.', 'The AI explains what the numbers mean and suggests next steps.') },
    ],
  },
  notifications: {
    id: 'notifications',
    title: t('Benachrichtigungen', 'Notifications'),
    steps: [
      { visual: 'bell', title: t('Automatische E-Mails', 'Automatic emails'), text: t('Bestätigung, Absage, Verschiebung und Erinnerungen 24 h / 2 h vorher gehen automatisch raus.', 'Confirmation, cancellation, reschedule and reminders 24 h / 2 h before go out automatically.') },
    ],
  },
  integrations: {
    id: 'integrations',
    title: t('Integrationen', 'Integrations'),
    steps: [
      { visual: 'share-link', title: t('Auf deiner Website', 'On your website'), text: t('Kopiere den fertigen Button-Code und füge ihn in deine Website ein.', 'Copy the button code and paste it into your website.') },
      { visual: 'calendar', title: t('Kalenderdatei', 'Calendar file'), text: t('Jeder Termin lässt sich als .ics in Google, Apple oder Outlook übernehmen.', 'Every appointment can be added to Google, Apple or Outlook as .ics.') },
    ],
  },
  settings: {
    id: 'settings',
    title: t('Einstellungen', 'Settings'),
    steps: [
      { visual: 'settings', title: t('Dein Unternehmen', 'Your business'), text: t('Name, Kontakt, Adresse, Logo, Sprache und Zeitzone. Alles jederzeit änderbar.', 'Name, contact, address, logo, language and time zone. Change anytime.') },
      { visual: 'team', title: t('Kategorie', 'Category'), text: t('Wähle deine Branche – Texte und Vorschläge passen sich an.', 'Choose your industry – texts and suggestions adapt.') },
    ],
  },
  billing: {
    id: 'billing',
    title: t('Tarife', 'Plans'),
    steps: [
      { visual: 'plans', title: t('Drei einfache Tarife', 'Three simple plans'), text: t('Starter 5 €, Pro 15 €, Business 25 € pro Monat. Wechseln geht jederzeit über den Support.', 'Starter €5, Pro €15, Business €25 per month. Switch anytime via support.') },
    ],
  },
  chat: {
    id: 'chat',
    title: t('Nachrichten', 'Messages'),
    steps: [
      { visual: 'chat', title: t('Team und Kunden', 'Team and customers'), text: t('Links wählst du den Chat: Team-Chat für Absprachen und Kunden-Chats zu Terminen. Kunden schreiben dir über ihren privaten Terminlink.', 'Choose a chat on the left: team chat and customer chats per appointment. Customers write via their private appointment link.') },
      { visual: 'report', title: t('Melden & Sicherheit', 'Report & safety'), text: t('Unangebrachte Nachrichten kannst du melden (⚑). Die KI markiert Beleidigungen und Betrugsversuche automatisch zur Prüfung.', 'Report inappropriate messages (⚑). The AI flags insults and scam attempts automatically for review.') },
    ],
  },
  support: {
    id: 'support',
    title: t('Hilfe & Support', 'Help & support'),
    steps: [
      { visual: 'support', title: t('Anfrage mit Fallnummer', 'Requests with case numbers'), text: t('Klick auf „Neue Anfrage“, wähle das Thema und beschreibe kurz das Problem. Du bekommst sofort eine Fallnummer wie F-2026-00012.', 'Click “New request”, pick a topic and describe the problem. You instantly get a case number like F-2026-00012.') },
      { visual: 'ai', title: t('Sofort-Hilfe', 'Instant help'), text: t('Schon beim Tippen schlägt die KI passende Antworten vor – oft ist das Problem damit direkt gelöst.', 'While you type, the AI suggests matching answers – often solving it right away.') },
      { visual: 'chat', title: t('Antworten im Verlauf', 'Replies in the thread'), text: t('Das Slotdove-Team antwortet im Verlauf. „Antwort da“ zeigt, dass etwas Neues auf dich wartet.', 'The Slotdove team replies in the thread. “Answered” means something new is waiting for you.') },
    ],
  },
  admin: {
    id: 'admin',
    title: t('Plattformverwaltung', 'Platform admin'),
    steps: [
      { visual: 'stats', title: t('Alles im Blick', 'Everything at a glance'), text: t('Konten, Benutzer, Meldungen und Auffälligkeiten. Die KI sortiert verdächtige Aktivitäten nach Risiko.', 'Accounts, users, reports and anomalies. The AI ranks suspicious activity by risk.') },
      { visual: 'support', title: t('Support-Panel & Fallnummern', 'Support panel & case numbers'), text: t('Alle Anfragen mit Fallnummer, Status und Priorität. Antworte, schreibe interne Notizen oder lass dir von der KI eine Antwort vorschlagen.', 'All requests with case number, status and priority. Reply, add internal notes or let the AI draft a reply.') },
      { visual: 'calendar', title: t('Ansehen oder alles bearbeiten', 'View or edit everything'), text: t('Im Unternehmen siehst du Termine, Kunden, Chats und Aktivität sofort. „Alles bearbeiten“ öffnet das Konto 2 Stunden mit vollen Rechten – protokolliert.', 'In a business you see appointments, customers, chats and activity instantly. “Edit everything” opens the account for 2 hours with full rights – logged.') },
      { visual: 'ai', title: t('Beta-Funktionen verteilen', 'Roll out beta features'), text: t('Unter „Beta & Funktionen“ schaltest du neue Funktionen für einzelne Konten oder alle frei.', 'Under “Beta & features” enable new features for single accounts or everyone.') },
    ],
  },
};
/** Extra FAQ entries for the assistant's knowledge base. */
export const faq: { q: [string, string]; a: [string, string]; href?: string }[] = [
  { q: t('Wie lege ich einen Termin an? Termin erstellen neu buchen eintragen', 'How do I create an appointment? new booking'), a: t('Klicke auf „Neuer Termin“ oder tippe einen Satz wie „Morgen 10 Uhr Haarschnitt Anna“ in die Schnelleingabe auf der Startseite.', 'Click “New appointment” or type a sentence like “tomorrow 10am haircut Anna” into quick add on the home screen.'), href: '/dashboard/calendar' },
  { q: t('Wie ändere ich Arbeitszeiten Öffnungszeiten Wochenplan?', 'How do I change working hours opening hours?'), a: t('Unter „Arbeitszeiten“ im Wochenplan Tage anklicken, Zeiten setzen und speichern.', 'Under “Hours” toggle days in the week plan, set times and save.'), href: '/dashboard/availability' },
  { q: t('Feiertage Urlaub Abwesenheit sperren geschlossen', 'Holidays vacation block time closed'), a: t('Unter „Arbeitszeiten“ gibt es „Feiertage eintragen“ und „Abwesenheit“. Beides blockiert die Zeit für Online-Buchungen.', 'Under “Hours” use “Add public holidays” and “Time off”. Both block online bookings.'), href: '/dashboard/availability' },
  { q: t('Termin verschieben umbuchen absagen stornieren', 'Move reschedule cancel appointment'), a: t('Termin anklicken → „Verschieben“ oder „Stornieren“. Der Kunde wird automatisch benachrichtigt.', 'Click the appointment → “Reschedule” or “Cancel”. The customer is notified automatically.'), href: '/dashboard/appointments' },
  { q: t('Mitarbeiter hinzufügen Team Kollegen', 'Add staff team colleague'), a: t('Unter „Team“ → „Teammitglied“. Ein Konto ist nicht nötig; per „Einladen“ bekommt die Person optional einen Login.', 'Under “Team” → “Team member”. No account needed; “Invite” optionally gives them a login.'), href: '/dashboard/staff' },
  { q: t('Buchungslink teilen Website Instagram online buchen veröffentlichen', 'Share booking link website publish'), a: t('Unter „Buchungsseite“ veröffentlichen und den Link kopieren. Für Websites gibt es unter „Integrationen“ einen fertigen Button.', 'Publish under “Booking page” and copy the link. Websites: ready-made button under “Integrations”.'), href: '/dashboard/booking' },
  { q: t('Preis Tarif Kosten Abo bezahlen', 'Price plan cost subscription'), a: t('Starter 5 €, Pro 15 €, Business 25 € im Monat.', 'Starter €5, Pro €15, Business €25 per month.'), href: '/dashboard/billing' },
  { q: t('Sprache ändern Deutsch Englisch', 'Change language German English'), a: t('Oben rechts auf „DE/EN“ klicken. Die Sprache deiner Buchungsseite stellst du in den Einstellungen ein.', 'Click “DE/EN” at the top right. The booking page language is in Settings.'), href: '/dashboard/settings' },
  { q: t('Erinnerung E-Mail Benachrichtigung SMS', 'Reminder email notification'), a: t('Erinnerungen 24 h und 2 h vorher stellst du unter „Benachrichtigungen“ ein.', 'Set reminders 24 h and 2 h before under “Notifications”.'), href: '/dashboard/notifications' },
  { q: t('Kunde löschen Daten DSGVO anonymisieren export', 'Delete customer GDPR anonymise export'), a: t('Kunde öffnen → „Exportieren“ oder „Anonymisieren“.', 'Open the customer → “Export” or “Anonymise”.'), href: '/dashboard/customers' },
  { q: t('Puffer Pause zwischen Terminen', 'Buffer break between appointments'), a: t('Puffer stellst du pro Leistung ein: Minuten vorher und nachher werden automatisch freigehalten.', 'Buffers are set per service: minutes before and after are kept free automatically.'), href: '/dashboard/services' },
  { q: t('Support Hilfe Kontakt Problem Fehler', 'Support help contact problem bug'), a: t('Öffne „Hilfe & Support“ und starte eine neue Anfrage. Du bekommst eine Fallnummer, und das Slotdove-Team antwortet dort.', 'Open “Help & support” and start a new request. You get a case number and the Slotdove team replies there.'), href: '/dashboard/support' },
  { q: t('Chat melden Beleidigung Spam', 'Report chat insult spam'), a: t('Fahre über die Nachricht und klicke ⚑ „Melden“. Unser Team prüft das.', 'Hover the message and click ⚑ “Report”. Our team reviews it.'), href: '/dashboard/chat' },
];
