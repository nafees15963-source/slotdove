# Supabase-Auth-E-Mails über Resend

Die App selbst verschickt alle anderen E-Mails direkt über Brevo (`BREVO_API_KEY`, kostenlos, ohne eigene Domain – hat Vorrang) oder Resend (`RESEND_API_KEY`, braucht verifizierte Domain), jeweils mit `EMAIL_FROM`.
Registrierung, Passwort-Reset und E-Mail-Änderung verschickt Supabase. So laufen auch diese über Resend:

1. Supabase-Dashboard → **Authentication → Emails → SMTP Settings** → „Enable custom SMTP“
   - Host: `smtp.resend.com` · Port: `465` · Benutzer: `resend`
   - Passwort: ein Resend-API-Key (am besten ein eigener nur mit „Sending access“)
   - Absender-Adresse und -Name wie `EMAIL_FROM` (Domain muss in Resend verifiziert sein)
2. **Authentication → Emails → Templates**: Betreff und HTML aus diesen Dateien einfügen
   - Confirm signup → `confirm-signup.html` – Betreff: *Bitte bestätige deine E-Mail-Adresse*
   - Reset password → `reset-password.html` – Betreff: *Neues Passwort für Slotdove*
   - Change email address → `change-email.html` – Betreff: *Neue E-Mail-Adresse bestätigen*
   - Magic link → `magic-link.html` – Betreff: *Dein Slotdove-Anmeldelink*
   - Invite user → `invite.html` – Betreff: *Du wurdest zu Slotdove eingeladen*
3. **Authentication → Rate Limits**: „Emails sent per hour“ auf z. B. 30 erhöhen (geht erst mit eigenem SMTP).
