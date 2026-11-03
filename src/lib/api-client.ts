'use client';
export async function api<T = Record<string, unknown>>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'REQUEST_FAILED');
  return data;
}
export function friendlyError(error: unknown, locale: string) {
  const code = error instanceof Error ? error.message : '';
  const de = locale === 'de';
  const errors: Record<string, [string, string]> = {
    STAFF_ALREADY_LINKED: [
      'This team profile is already connected to an account.',
      'Dieses Teamprofil ist bereits mit einem Konto verbunden.',
    ],
    VERIFY_EMAIL_FIRST: [
      'Please confirm your email address before continuing.',
      'Bitte bestätige zuerst deine E-Mail-Adresse.',
    ],

    SLOT_UNAVAILABLE: [
      'This time was just taken. Please choose another slot.',
      'Diese Zeit wurde gerade belegt. Bitte wähle eine andere.',
    ],
    BOOKING_NOT_CONFIGURED: [
      'Booking setup is not complete. Please contact the business.',
      'Die Buchungseinrichtung ist noch nicht vollständig. Bitte kontaktiere das Unternehmen.',
    ],
    REQUEST_FAILED: [
      'The request could not be completed. Check your connection and try again.',
      'Die Anfrage konnte nicht abgeschlossen werden. Prüfe deine Verbindung und versuche es erneut.',
    ],
    INVALID_INPUT: ['Please check the form fields.', 'Bitte prüfe deine Angaben.'],
    ALREADY_EXISTS: [
      'An entry with these details already exists.',
      'Ein Eintrag mit diesen Angaben existiert bereits.',
    ],
    OUTSIDE_WORKING_HOURS: [
      'This time is outside working hours or includes a break.',
      'Diese Zeit liegt außerhalb der Arbeitszeiten oder in einer Pause.',
    ],
    OUTSIDE_BOOKING_WINDOW: [
      'This time is outside the booking window.',
      'Diese Zeit liegt außerhalb des Buchungszeitraums.',
    ],
    INVALID_SLOT: [
      'Please choose a time that matches the booking interval.',
      'Bitte wähle eine Uhrzeit im eingestellten Terminraster.',
    ],
    COMPLETE_SETUP_FIRST: [
      'Add an active service, assign a team member and set their hours before publishing.',
      'Lege eine aktive Leistung an, ordne ein Teammitglied zu und hinterlege Arbeitszeiten.',
    ],
    RECORD_IN_USE: [
      'This record has appointment history and cannot be deleted.',
      'Dieser Eintrag wird von bestehenden Terminen verwendet und kann nicht gelöscht werden.',
    ],
    FORBIDDEN: [
      'You do not have permission for this action.',
      'Dir fehlt die Berechtigung für diese Aktion.',
    ],
    RATE_LIMITED: [
      'Too many requests. Please try again in a few minutes.',
      'Zu viele Anfragen. Bitte versuche es in einigen Minuten erneut.',
    ],
    CHANGE_DEADLINE_PASSED: [
      'The deadline for online changes has passed. Please contact the business.',
      'Die Frist für Online-Änderungen ist abgelaufen. Bitte kontaktiere das Unternehmen.',
    ],
    LINK_EXPIRED: [
      'This private link is invalid or expired.',
      'Dieser private Link ist ungültig oder abgelaufen.',
    ],
    EXISTING_BOOKING_CONFLICT: [
      'This block overlaps an existing booking. Move or cancel it first.',
      'Diese Blockzeit überschneidet sich mit einem Termin. Verschiebe oder storniere ihn zuerst.',
    ],
    INVALID_TRANSITION: [
      'This appointment status can no longer be changed.',
      'Dieser Terminstatus kann nicht mehr geändert werden.',
    ],
    APPOINTMENT_NOT_STARTED: [
      'Wait until the appointment has started.',
      'Warte, bis der Termin begonnen hat.',
    ],
    INVITATION_INVALID: [
      'This invitation is expired, used, or belongs to another email address.',
      'Diese Einladung ist abgelaufen, bereits verwendet oder für eine andere E-Mail-Adresse bestimmt.',
    ],
  };
  return (errors[code] || errors.REQUEST_FAILED)[de ? 1 : 0];
}
