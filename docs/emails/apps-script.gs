/**
 * Slotdove – E-Mail-Versand über Gmail (Google Apps Script)
 * 1. In SECRET ein langes, zufälliges Geheimwort eintragen (mind. 24 Zeichen).
 * 2. Bereitstellen → Neue Bereitstellung → Typ „Web-App“
 *    Ausführen als: Ich   ·   Zugriff: Jeder
 * 3. Die Web-App-URL (endet auf /exec) und das Geheimwort in Vercel eintragen:
 *    GMAIL_SCRIPT_URL und GMAIL_SCRIPT_SECRET
 */
const SECRET = 'HIER_DEIN_GEHEIMWORT_EINTRAGEN';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (SECRET.length < 24 || SECRET.indexOf('HIER_') === 0) return out({ ok: false, error: 'SECRET im Script noch nicht gesetzt' });
    if (d.secret !== SECRET) return out({ ok: false, error: 'Falsches Geheimwort' });
    const to = String(d.to || '').trim();
    if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(to)) return out({ ok: false, error: 'Ungültige Empfängeradresse' });
    // Doppelte Zustellung verhindern (gleicher Schlüssel innerhalb von 6 Stunden).
    const cache = CacheService.getScriptCache();
    const key = d.key ? 'k' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(d.key))) : null;
    if (key && cache.get(key)) return out({ ok: true, id: 'duplicate' });
    if (MailApp.getRemainingDailyQuota() < 1) return out({ ok: false, error: 'Tageslimit von Gmail erreicht' });
    MailApp.sendEmail({
      to: to,
      subject: String(d.subject || '').replace(/[\r\n]+/g, ' ').slice(0, 200),
      htmlBody: String(d.html || ''),
      name: String(d.name || 'Slotdove').replace(/[\r\n<>"]+/g, '').slice(0, 60),
    });
    if (key) cache.put(key, '1', 21600);
    return out({ ok: true, id: key || 'sent' });
  } catch (err) {
    return out({ ok: false, error: String(err).slice(0, 200) });
  }
}

/** Einmal im Editor ausführen, um die Berechtigung zu erteilen und eine Test-Mail an dich zu schicken. */
function test() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), 'Slotdove Test', 'Der Versand funktioniert.');
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
