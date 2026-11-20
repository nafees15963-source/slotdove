import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalPage, Ph } from '@/components/legal';
export const metadata: Metadata = { title: 'Datenschutzerklärung – Slotdove', description: 'Informationen nach Art. 13 und 14 DSGVO zur Verarbeitung personenbezogener Daten bei Slotdove.' };

const toc: [string, string][] = [
  ['verantwortlicher', 'Verantwortlicher und Kontakt'],
  ['ueberblick', 'Überblick: Wer ist wofür verantwortlich?'],
  ['begriffe', 'Rechtsgrundlagen im Überblick'],
  ['hosting', 'Bereitstellung der Website und Server-Logdateien'],
  ['cookies', 'Cookies und lokale Speicherung (TDDDG)'],
  ['konto', 'Registrierung, Kundenkonto und Anmeldung'],
  ['mitarbeiter', 'Teammitglieder und Mitarbeiter-Zugänge'],
  ['uploads', 'Hochgeladene Bilder und Inhalte'],
  ['buchung', 'Online-Buchungen über Buchungsseiten der Betriebe'],
  ['emails', 'Automatische E-Mails (Bestätigungen, Erinnerungen)'],
  ['chat', 'Kunden-Chat und automatische Moderation'],
  ['ki', 'KI-Funktionen (Assistentin, Textvorschläge)'],
  ['warteliste', 'Voranmeldung und Freigabe'],
  ['support', 'Support-Anfragen und Kontakt'],
  ['adminzugriff', 'Zugriffe durch Plattform-Administratoren'],
  ['unterstuetzung', 'Freiwillige Unterstützung (PayPal)'],
  ['meldungen', 'Meldungen, Sperrlisten und Missbrauchsschutz'],
  ['sicherheit', 'Sicherheitsprotokolle, Ratenbegrenzung und Audit'],
  ['empfaenger', 'Empfänger und Auftragsverarbeiter'],
  ['drittland', 'Übermittlungen in Drittländer'],
  ['speicherdauer', 'Speicherdauer und Löschkonzept'],
  ['loeschen', 'So löschen Sie Ihre Daten'],
  ['rechte', 'Ihre Rechte'],
  ['widerspruch', 'Widerspruchsrecht nach Art. 21 DSGVO'],
  ['beschwerde', 'Beschwerderecht bei einer Aufsichtsbehörde'],
  ['pflicht', 'Pflicht zur Bereitstellung, automatisierte Entscheidungen'],
  ['minderjaehrige', 'Minderjährige'],
  ['tom', 'Datensicherheit'],
  ['panne', 'Datenschutzverletzungen'],
  ['aenderungen', 'Änderungen dieser Datenschutzerklärung'],
];

export default function Page() {
  return (
    <LegalPage title="Datenschutzerklärung" toc={toc}>
      <p>
        Der Schutz Ihrer personenbezogenen Daten ist uns sehr wichtig. Nachfolgend informieren wir Sie gemäß Art. 13 und 14 der Datenschutz-Grundverordnung (DSGVO) darüber, welche personenbezogenen Daten
        wir bei der Nutzung von Slotdove (Website, Web-App, Buchungsseiten und E-Mails) verarbeiten, zu welchen Zwecken, auf welcher Rechtsgrundlage, an wen wir sie weitergeben, wie lange wir sie speichern
        und welche Rechte Sie haben.
      </p>

      <h2 id="verantwortlicher">Verantwortlicher und Kontakt</h2>
      <p>
        Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO für die Verarbeitungen, die Slotdove als eigene Plattform betreibt:
        <br />
        <Ph>VOR- UND NACHNAME</Ph>
        <br />
        <Ph>STRASSE UND HAUSNUMMER</Ph>, <Ph>PLZ ORT</Ph>, Deutschland
        <br />
        E-Mail: <Ph>E-MAIL-ADRESSE</Ph> · Telefon: <Ph>TELEFONNUMMER</Ph>
      </p>
      <p>
        Datenschutzanfragen richten Sie bitte an <Ph>DATENSCHUTZ-E-MAIL (kann dieselbe Adresse sein)</Ph>. Ein Datenschutzbeauftragter ist nach Art. 37 DSGVO i. V. m. § 38 BDSG derzeit nicht benannt,
        da die gesetzlichen Voraussetzungen nicht vorliegen. <Ph>Falls doch benannt: Name und Kontakt des Datenschutzbeauftragten</Ph>
      </p>

      <h2 id="ueberblick">Überblick: Wer ist wofür verantwortlich?</h2>
      <p>Slotdove ist eine Software für Online-Terminbuchung, die von Unternehmen (z. B. Salons, Praxen, Studios, Dienstleistern – nachfolgend „Betriebe“) genutzt wird. Dabei gibt es zwei Rollen:</p>
      <ul>
        <li>
          <strong>Slotdove als Verantwortlicher</strong> für die eigene Website, die Registrierung und Verwaltung der Konten von Betrieben und deren Teammitgliedern, die Warteliste, Support, Abrechnung,
          Sicherheit, Missbrauchsbekämpfung sowie Meldungen nach dem Digital Services Act.
        </li>
        <li>
          <strong>Slotdove als Auftragsverarbeiter</strong> (Art. 28 DSGVO) für die Daten, die Betriebe über ihre Kundinnen und Kunden verarbeiten – also Buchungen, Kundenkartei, Notizen,
          Chatnachrichten und Terminerinnerungen. Verantwortlich für diese Daten ist der jeweilige Betrieb, bei dem Sie einen Termin buchen. Mit jedem Betrieb schließen wir einen{' '}
          <Link href="/avv">Auftragsverarbeitungsvertrag (AVV)</Link>. Wenn Sie als Kundin oder Kunde Auskunft, Löschung oder Berichtigung wünschen, wenden Sie sich bitte vorrangig an den Betrieb; wir
          unterstützen den Betrieb dabei und leiten an uns gerichtete Anfragen unverzüglich weiter.
        </li>
      </ul>

      <h2 id="begriffe">Rechtsgrundlagen im Überblick</h2>
      <ul>
        <li>Art. 6 Abs. 1 lit. a DSGVO – Einwilligung (jederzeit mit Wirkung für die Zukunft widerruflich);</li>
        <li>Art. 6 Abs. 1 lit. b DSGVO – Erfüllung eines Vertrags oder vorvertraglicher Maßnahmen;</li>
        <li>Art. 6 Abs. 1 lit. c DSGVO – Erfüllung rechtlicher Pflichten (z. B. handels- und steuerrechtliche Aufbewahrung, Pflichten aus dem DSA);</li>
        <li>Art. 6 Abs. 1 lit. f DSGVO – berechtigte Interessen (z. B. IT-Sicherheit, Missbrauchsabwehr, Verbesserung des Dienstes), soweit nicht Ihre Interessen überwiegen;</li>
        <li>§ 25 Abs. 1 und 2 TDDDG – Speicherung von und Zugriff auf Informationen in Ihrem Endgerät.</li>
      </ul>

      <h2 id="hosting">Bereitstellung der Website und Server-Logdateien</h2>
      <p>
        Beim Aufruf unserer Website verarbeitet unser Hosting-Anbieter technisch notwendige Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene URL, Referrer-URL, übertragene Datenmenge, HTTP-Statuscode,
        Browsertyp und -version sowie Betriebssystem. Diese Daten sind erforderlich, um die Website auszuliefern, die Stabilität und Sicherheit zu gewährleisten und Angriffe (z. B. DDoS) abzuwehren.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in der sicheren und fehlerfreien Bereitstellung. Hosting-Anbieter ist die Vercel Inc., 440 N Barranca Ave #4133,
        Covina, CA 91723, USA. Server-Logs werden von Vercel nur kurzzeitig vorgehalten (in der Regel wenige Tage) und danach gelöscht.
      </p>

      <h2 id="cookies">Cookies und lokale Speicherung (TDDDG)</h2>
      <p>
        Wir verwenden <strong>ausschließlich technisch notwendige</strong> Cookies und Speichermechanismen. Wir setzen <strong>keine</strong> Analyse-, Tracking-, Marketing- oder Social-Media-Cookies ein und
        binden keine Werbenetzwerke ein. Ein Cookie-Banner ist daher nicht erforderlich; die Speicherung ist nach § 25 Abs. 2 Nr. 2 TDDDG zulässig, da sie unbedingt erforderlich ist, um den von Ihnen
        ausdrücklich gewünschten Dienst bereitzustellen.
      </p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Zweck</th>
            <th>Dauer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>sb-…-auth-token</td>
            <td>Anmeldung / Sitzung (Supabase Auth), nur wenn Sie eingeloggt sind</td>
            <td>bis Abmeldung bzw. Ablauf der Sitzung</td>
          </tr>
          <tr>
            <td>slotdove-locale</td>
            <td>gewählte Sprache (Deutsch/Englisch)</td>
            <td>1 Jahr</td>
          </tr>
          <tr>
            <td>slotdove-business</td>
            <td>zuletzt gewählter Betrieb im Dashboard</td>
            <td>1 Jahr</td>
          </tr>
          <tr>
            <td>localStorage: slotdove-tours-off, slotdove-dismissed</td>
            <td>merkt sich, dass Sie Tutorials/Hinweise geschlossen haben</td>
            <td>bis Sie den Browserspeicher löschen</td>
          </tr>
        </tbody>
      </table>

      <h2 id="konto">Registrierung, Kundenkonto und Anmeldung</h2>
      <p>
        Wenn Sie als Betrieb ein Konto anlegen, verarbeiten wir E-Mail-Adresse, Passwort (ausschließlich als sicherer Hash, nie im Klartext), Name, Angaben zum Betrieb (Name, Branche, Adresse, Telefon,
        Öffnungszeiten, Leistungen, Preise, Logo, Bilder), Spracheinstellung, gewählter Tarif sowie Zeitpunkte der Zustimmung zu AGB, Datenschutzerklärung und AVV (inkl. Versionsnummer und
        pseudonymisiertem IP-Hash als Nachweis). Zweck ist die Bereitstellung des Dienstes; Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, für die Nachweise Art. 6 Abs. 1 lit. c und f DSGVO
        (Rechenschaftspflicht, Art. 5 Abs. 2 DSGVO).
      </p>
      <p>
        Zur Bestätigung der E-Mail-Adresse und zum Zurücksetzen des Passworts versenden wir Systemnachrichten. Für Administratoren der Plattform ist eine Zwei-Faktor-Authentifizierung (TOTP) vorgesehen.
      </p>

      <h2 id="mitarbeiter">Teammitglieder und Mitarbeiter-Zugänge</h2>
      <p>
        Betriebe können Teammitglieder per Einladung hinzufügen oder selbst einen Zugang anlegen. Dabei werden Name, E-Mail-Adresse, Rolle und die Zuordnung zu Leistungen und Arbeitszeiten gespeichert.
        Ein vom Betrieb vergebenes Startpasswort muss bei der ersten Anmeldung geändert werden; es wird von uns nicht im Klartext gespeichert. Der Betrieb ist verpflichtet, seine Beschäftigten über die
        Verarbeitung zu informieren (§ 26 BDSG, Art. 88 DSGVO). Rechtsgrundlage auf unserer Seite ist Art. 6 Abs. 1 lit. b und f DSGVO.
      </p>

      <h2 id="uploads">Hochgeladene Bilder und Inhalte</h2>
      <p>
        Betriebe können ein Logo und Bilder zu ihren Leistungen hochladen. Wir speichern die Dateien im Speicher unseres Datenbank-Anbieters in der EU und zeigen sie auf der öffentlichen Buchungsseite
        an. Wir akzeptieren nur PNG, JPEG und WebP bis 2 MB und prüfen den Dateityp technisch. Bitte laden Sie keine Bilder hoch, auf denen Personen ohne deren Einwilligung erkennbar sind. Wird ein Bild
        ersetzt oder entfernt oder der Betrieb gelöscht, löschen wir die Datei. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
      </p>
      <p>
        Ohne eigenes Bild erzeugt Slotdove automatisch ein Symbolbild aus dem Namen der Leistung. Das geschieht lokal auf unseren Servern; es werden dafür keine Daten an Dritte übermittelt.
      </p>

      <h2 id="buchung">Online-Buchungen über Buchungsseiten der Betriebe</h2>
      <p>
        Wenn Sie über die Buchungsseite eines Betriebs einen Termin buchen, verarbeiten wir <strong>im Auftrag des Betriebs</strong>: Name, E-Mail-Adresse, optional Telefonnummer und Anmerkungen, gewählte
        Leistung, Mitarbeiter, Datum und Uhrzeit, Buchungsnummer und Status sowie technische Daten zur Missbrauchsabwehr (pseudonymisierter IP-Hash, Ratenbegrenzung). Verantwortlich ist der Betrieb
        (Kontaktdaten auf dessen Buchungsseite). Rechtsgrundlage für den Betrieb ist in der Regel Art. 6 Abs. 1 lit. b DSGVO.
      </p>
      <p>
        Sie erhalten einen privaten Verwaltungslink, mit dem Sie den Termin ansehen, verschieben oder absagen können. Der Link enthält einen zufälligen Schlüssel, den wir nur als Hash speichern; er läuft
        sieben Tage nach dem Termin ab. Bitte geben Sie in Anmerkungen keine Gesundheitsdaten oder andere besondere Kategorien personenbezogener Daten an, sofern der Betrieb dies nicht ausdrücklich
        erfordert.
      </p>

      <h2 id="emails">Automatische E-Mails (Bestätigungen, Erinnerungen)</h2>
      <p>
        Für Buchungsbestätigungen, Erinnerungen, Änderungs- und Absagebenachrichtigungen, Einladungen und Systemnachrichten nutzen wir den Versanddienstleister Resend (Resend Inc., 2261 Market Street
        #5039, San Francisco, CA 94114, USA). Verarbeitet werden E-Mail-Adresse, Name, Inhalt der Nachricht und Zustellstatus. Wir versenden <strong>keine Werbe-Newsletter</strong>. Transaktionale
        E-Mails sind für die Vertragserfüllung erforderlich (Art. 6 Abs. 1 lit. b DSGVO). Betriebe können Erinnerungen in den Einstellungen abschalten.
      </p>

      <h2 id="chat">Kunden-Chat und automatische Moderation</h2>
      <p>
        Kundinnen und Kunden können über ihren Verwaltungslink mit dem Betrieb chatten. Nachrichten werden gespeichert, um die Kommunikation zu ermöglichen (Art. 6 Abs. 1 lit. b DSGVO, im Auftrag des
        Betriebs). Zum Schutz vor Beleidigungen, Spam und rechtswidrigen Inhalten prüft ein lokales, regelbasiertes Filtersystem eingehende Nachrichten automatisch; auffällige Nachrichten können
        markiert, zurückgehalten oder gemeldet werden. Diese Prüfung findet auf unseren Servern statt; es werden dafür keine Daten an externe KI-Anbieter übermittelt. Rechtsgrundlage ist Art. 6 Abs. 1
        lit. f DSGVO (Schutz der Nutzer und der Plattform) sowie Art. 6 Abs. 1 lit. c DSGVO i. V. m. dem DSA.
      </p>

      <h2 id="ki">KI-Funktionen (Assistentin, Textvorschläge)</h2>
      <p>
        Slotdove bietet Betrieben optionale KI-Funktionen, z. B. eine Assistentin im Dashboard und Formulierungsvorschläge für Leistungsbeschreibungen. Gemäß Art. 50 der KI-Verordnung (EU) 2024/1689
        weisen wir darauf hin: <strong>Sie interagieren dabei mit einem KI-System.</strong> KI-generierte Vorschläge sind als solche gekennzeichnet und sollten vor der Verwendung geprüft werden.
      </p>
      <p>
        Viele Funktionen (z. B. automatische Leistungsbilder, Terminvorschläge, Moderation) laufen mit einer <strong>lokalen Logik ohne externe Übermittlung</strong>. Für die Chat-Assistentin kann eine
        Anfrage an den Anbieter Groq, Inc. (USA) übermittelt werden, der ein Sprachmodell bereitstellt. Übermittelt werden die eingegebene Frage und der für die Antwort nötige Kontext aus dem Konto des
        Betriebs (z. B. Termine eines Zeitraums). Groq verarbeitet die Daten auf Grundlage eines Auftragsverarbeitungsvertrags mit EU-Standardvertragsklauseln und nutzt sie nach eigenen Angaben nicht zum
        Training seiner Modelle. Betriebe sollten keine besonderen Kategorien personenbezogener Daten (z. B. Gesundheitsdaten) in KI-Anfragen eingeben. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO; die
        Nutzung der KI ist freiwillig.
      </p>
      <p>Es findet keine automatisierte Entscheidungsfindung im Sinne des Art. 22 DSGVO statt.</p>

      <h2 id="warteliste">Voranmeldung und Freigabe</h2>
      <p>
        In der Startphase ist eine Registrierung nur nach Voranmeldung und persönlicher Freigabe möglich. Bei der Voranmeldung verarbeiten wir Name, E-Mail-Adresse, Name des Betriebs, optional
        Telefonnummer, Branche, Ort, Teamgröße, Tarifinteresse und Ihre Nachricht sowie Zeitpunkt und Wortlaut Ihrer Einwilligung und einen pseudonymisierten IP-Hash zum Schutz vor Missbrauch.
      </p>
      <p>
        Zweck ist die Prüfung Ihrer Anmeldung, die Kontaktaufnahme und – nach Freigabe – der Versand eines persönlichen Registrierungslinks. Der Link enthält einen zufälligen Schlüssel, den wir nur als
        Hash speichern; er ist 14 Tage gültig und nur mit der angemeldeten E-Mail-Adresse nutzbar. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) bzw. die Durchführung
        vorvertraglicher Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO). Sie können die Einwilligung jederzeit per E-Mail widerrufen.
      </p>
      <p>Voranmeldungen, aus denen kein Konto entsteht, löschen wir automatisch spätestens 12 Monate nach der letzten Änderung. Abgelaufene Registrierungslinks werden automatisch ungültig gemacht.</p>

      <h2 id="support">Support-Anfragen und Kontakt</h2>
      <p>
        Bei Support-Anfragen (im Dashboard oder per E-Mail) verarbeiten wir Ihre Angaben und den Verlauf, um Ihr Anliegen zu bearbeiten (Art. 6 Abs. 1 lit. b bzw. f DSGVO). Mit Ihrer ausdrücklichen
        Freigabe kann ein Plattform-Administrator für einen begrenzten Zeitraum lesend auf Ihr Konto zugreifen, um ein Problem nachzuvollziehen; jeder Zugriff wird protokolliert.
      </p>

      <h2 id="adminzugriff">Zugriffe durch Plattform-Administratoren</h2>
      <p>
        Plattform-Administratoren können zur Bearbeitung von Support-Anfragen, zur Abwehr von Missbrauch, zur Erfüllung rechtlicher Pflichten oder auf Wunsch des Betriebs Einstellungen eines Betriebs
        ändern oder befristet (maximal 2 Stunden) mit den Rechten des Inhabers im Dashboard arbeiten („Supportmodus“). Administratoren melden sich zusätzlich mit einem zweiten Faktor (Authenticator-App)
        an. Jeder solche Zugriff wird mit Zeitpunkt, Person und Art der Änderung in einem Verwaltungsprotokoll festgehalten, das 3 Jahre aufbewahrt wird. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und f
        DSGVO bzw. für Kundendaten der Betriebe der Auftragsverarbeitungsvertrag.
      </p>

      <h2 id="unterstuetzung">Freiwillige Unterstützung (PayPal)</h2>
      <p>
        Sie können Slotdove freiwillig finanziell unterstützen. Dafür verlinken wir auf eine Seite des Zahlungsdienstes PayPal (Europe) S.à r.l. et Cie, S.C.A., 22–24 Boulevard Royal, L-2449 Luxemburg.
        Erst wenn Sie den Button anklicken, verlassen Sie unsere Seite; vorher werden keine Daten an PayPal übertragen. Die Zahlung schließen Sie direkt bei PayPal ab, das insoweit als eigener
        Verantwortlicher handelt (Datenschutzhinweise: https://www.paypal.com/de/legalhub/privacy-full).
      </p>
      <p>
        Wir erhalten von PayPal die für die Zahlung üblichen Angaben (Name, E-Mail-Adresse, Betrag, Datum, ggf. Ihre Nachricht). Wir nutzen sie ausschließlich zur Zuordnung und Verbuchung der Zahlung,
        für etwaige Rückfragen und Rückerstattungen sowie zur Erfüllung gesetzlicher Aufzeichnungspflichten (Art. 6 Abs. 1 lit. b, c und f DSGVO). Es handelt sich nicht um eine Spende im steuerlichen
        Sinn; eine Spendenquittung wird nicht ausgestellt. Die Unterstützung hat keinen Einfluss auf Ihre Nutzung von Slotdove. Aufzeichnungen zu Zahlungen bewahren wir entsprechend den gesetzlichen
        Fristen (bis zu 10 Jahre) auf.
      </p>

      <h2 id="meldungen">Meldungen, Sperrlisten und Missbrauchsschutz</h2>
      <p>
        Wir betreiben ein Melde- und Abhilfeverfahren nach Art. 16 DSA. Wer einen Inhalt oder ein Verhalten meldet, gibt eine Beschreibung, optional eine URL sowie optional Name und E-Mail-Adresse an.
        Betriebe können auch Kundinnen und Kunden melden (z. B. wiederholtes Nichterscheinen, Beleidigungen, Betrug) und für ihren eigenen Betrieb von der Online-Buchung ausschließen. Wir prüfen Meldungen
        sorgfältig, entscheiden begründet (Art. 17 DSA) und informieren die Beteiligten, soweit Kontaktdaten vorliegen.
      </p>
      <p>
        Zur Abwehr von Missbrauch (Spam, Betrug, Angriffe) führen wir eine Sperrliste aus E-Mail-Adressen, Domains und pseudonymisierten IP-Hashes. Rechtsgrundlage ist Art. 6 Abs. 1 lit. c DSGVO i. V. m.
        Art. 16, 17 und 23 DSA sowie Art. 6 Abs. 1 lit. f DSGVO (Schutz der Nutzer und der Integrität der Plattform). Meldungen werden nach Abschluss drei Jahre aufbewahrt, um wiederholten Missbrauch
        erkennen und unsere Entscheidungen nachweisen zu können.
      </p>

      <h2 id="sicherheit">Sicherheitsprotokolle, Ratenbegrenzung und Audit</h2>
      <p>
        Zur Sicherheit protokollieren wir sicherheitsrelevante Ereignisse (z. B. Anmeldungen, Passwortänderungen, Rollenwechsel, administrative Eingriffe) mit Zeitpunkt, Benutzerkennung, User-Agent und
        einem <strong>pseudonymisierten IP-Hash</strong> (HMAC, kein Klartext-IP). Aktivitätsprotokolle werden nach 180 Tagen gelöscht, Zähler der Ratenbegrenzung nach einem Tag. Administrative Eingriffe
        werden in einem Audit-Protokoll revisionssicher festgehalten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO und Art. 32 DSGVO.
      </p>

      <h2 id="empfaenger">Empfänger und Auftragsverarbeiter</h2>
      <p>Wir geben Daten nur weiter, wenn dies für die genannten Zwecke erforderlich ist. Wir setzen folgende Dienstleister als Auftragsverarbeiter (Art. 28 DSGVO) ein:</p>
      <table>
        <thead>
          <tr>
            <th>Anbieter</th>
            <th>Zweck</th>
            <th>Ort / Garantien</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase Inc., 970 Toa Payoh North #07-04, Singapur 318992</td>
            <td>Datenbank, Authentifizierung, Dateispeicher</td>
            <td>Datenhaltung in der EU (Frankfurt am Main, AWS eu-central-1); AVV mit EU-Standardvertragsklauseln für etwaige Supportzugriffe</td>
          </tr>
          <tr>
            <td>Vercel Inc., USA</td>
            <td>Hosting, Auslieferung der Website, Serverfunktionen</td>
            <td>EU-U.S. Data Privacy Framework (DPF) und EU-Standardvertragsklauseln</td>
          </tr>
          <tr>
            <td>Resend Inc., USA</td>
            <td>Versand transaktionaler E-Mails</td>
            <td>EU-U.S. Data Privacy Framework und EU-Standardvertragsklauseln</td>
          </tr>
          <tr>
            <td>Groq, Inc., USA</td>
            <td>Sprachmodell für die optionale KI-Assistentin</td>
            <td>AVV mit EU-Standardvertragsklauseln (Modul 2/3)</td>
          </tr>
          <tr>
            <td>PayPal (Europe) S.à r.l. et Cie, S.C.A., Luxemburg</td>
            <td>nur bei freiwilliger Unterstützung: Zahlungsabwicklung</td>
            <td>eigener Verantwortlicher, EU</td>
          </tr>
        </tbody>
      </table>
      <p>
        Darüber hinaus können Daten an Behörden weitergegeben werden, wenn wir hierzu gesetzlich verpflichtet sind (z. B. Art. 10 DSA, Strafverfolgung), sowie an Steuerberater im Rahmen der
        gesetzlichen Pflichten. <Ph>Falls genutzt: Zahlungsdienstleister (z. B. Stripe, PayPal) mit Zweck und Sitz ergänzen</Ph>
      </p>

      <h2 id="drittland">Übermittlungen in Drittländer</h2>
      <p>
        Soweit Dienstleister ihren Sitz in den USA haben oder dort Daten verarbeiten, erfolgt die Übermittlung auf Grundlage eines Angemessenheitsbeschlusses (Art. 45 DSGVO, EU-U.S. Data Privacy
        Framework), soweit der Anbieter zertifiziert ist, und im Übrigen auf Grundlage der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO) mit ergänzenden Maßnahmen (Verschlüsselung bei der
        Übertragung und im Ruhezustand, Datenminimierung). Eine Kopie der Garantien können Sie bei uns anfordern.
      </p>

      <h2 id="speicherdauer">Speicherdauer und Löschkonzept</h2>
      <p>
        Wir speichern personenbezogene Daten nur so lange, wie es für den jeweiligen Zweck erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen (Grundsatz der Speicherbegrenzung, Art. 5
        Abs. 1 lit. e DSGVO). Die folgenden Fristen setzen wir <strong>technisch automatisch</strong> durch: Ein Löschprogramm läuft jede Nacht und entfernt abgelaufene Daten.
      </p>
      <table>
        <thead>
          <tr>
            <th>Daten</th>
            <th>Löschung</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Benutzerkonto (Betrieb oder Mitarbeiter)</td><td>sofort bei Löschung im Konto; bei Kündigung spätestens 30 Tage nach Vertragsende</td></tr>
          <tr><td>Nie bestätigte Registrierungen</td><td>automatisch nach 30 Tagen</td></tr>
          <tr><td>Buchungs-, Kunden- und Chatdaten der Betriebe</td><td>nach Weisung des Betriebs (Löschen/Anonymisieren im Dashboard); spätestens 30 Tage nach Löschung des Betriebs</td></tr>
          <tr><td>Chat-Verläufe</td><td>automatisch 24 Monate nach der letzten Nachricht; mit dem zugehörigen Termin sofort</td></tr>
          <tr><td>Verwaltungslinks für Termine</td><td>automatisch 7 Tage nach dem Termin ungültig, danach gelöscht</td></tr>
          <tr><td>Versandprotokolle von E-Mails (bei uns)</td><td>automatisch nach 90 Tagen</td></tr>
          <tr><td>Einladungen ins Team</td><td>automatisch 30 Tage nach Annahme, Widerruf oder Ablauf</td></tr>
          <tr><td>Demo-Betriebe</td><td>automatisch 30 Tage nach Ende der Demo</td></tr>
          <tr><td>Voranmeldungen ohne Konto</td><td>automatisch nach 12 Monaten; sofort bei Widerruf</td></tr>
          <tr><td>Aktivitäts- und Sicherheitsprotokolle</td><td>automatisch nach 180 Tagen</td></tr>
          <tr><td>Zähler der Ratenbegrenzung</td><td>automatisch nach 1 Tag</td></tr>
          <tr><td>Verwaltungsprotokoll der Administratoren</td><td>automatisch nach 3 Jahren</td></tr>
          <tr><td>Support-Fälle</td><td>automatisch 3 Jahre nach Abschluss</td></tr>
          <tr><td>Meldungen nach dem DSA, Datenschutzanfragen</td><td>automatisch 3 Jahre nach Abschluss (Nachweis, Verjährung nach § 195 BGB)</td></tr>
          <tr><td>Sperrlisteneinträge</td><td>zum festgelegten Ablaufdatum, sonst nach Wegfall des Grundes</td></tr>
          <tr><td>Nachweis der Zustimmung zu AGB/AVV/Datenschutz</td><td>für die Dauer des Kontos</td></tr>
          <tr><td>Zahlungs- und Buchhaltungsunterlagen</td><td>6 bzw. 10 Jahre (§ 147 AO, § 257 HGB), danach gelöscht</td></tr>
          <tr><td>Server-Logs beim Hosting-Anbieter</td><td>nach den Fristen des Anbieters, in der Regel wenige Tage</td></tr>
          <tr><td>E-Mail-Protokolle beim Versanddienst</td><td>nach den Fristen des Anbieters, in der Regel wenige Tage</td></tr>
          <tr><td>Datensicherungen (soweit vorhanden)</td><td>rollierend überschrieben, spätestens nach 30 Tagen</td></tr>
        </tbody>
      </table>
      <p>
        Soweit Daten wegen gesetzlicher Aufbewahrungspflichten nicht gelöscht werden dürfen, schränken wir ihre Verarbeitung ein (Sperrung) und nutzen sie nur noch für diesen Zweck.
      </p>

      <h2 id="loeschen">So löschen Sie Ihre Daten</h2>
      <ul>
        <li>
          <strong>Als Betrieb oder Teammitglied:</strong> Einstellungen → Konto → „Konto endgültig löschen“. Ihr Konto wird sofort gelöscht; gehört Ihnen ein Betrieb, werden dieser und alle zugehörigen
          Termine, Kunden, Bilder und Chats ebenfalls gelöscht. Vorher können Sie unter „Meine persönlichen Daten (JSON)“ und „Kunden → Export“ alles herunterladen.
        </li>
        <li>
          <strong>Als Kundin oder Kunde eines Betriebs:</strong> Wenden Sie sich an den Betrieb, bei dem Sie gebucht haben. Der Betrieb kann Ihre Daten im Dashboard exportieren und anonymisieren. Sie
          können sich auch an uns wenden; wir leiten Ihre Anfrage an den Betrieb weiter und unterstützen ihn.
        </li>
        <li>
          <strong>Voranmeldung:</strong> Eine kurze E-Mail an uns genügt.
        </li>
        <li>
          <strong>Alle anderen Fälle:</strong> Schreiben Sie an <Ph>DATENSCHUTZ-E-MAIL</Ph>. Wir beantworten Anfragen innerhalb eines Monats und bestätigen die Löschung.
        </li>
      </ul>

      <h2 id="rechte">Ihre Rechte</h2>
      <p>Sie haben jederzeit das Recht auf:</p>
      <ul>
        <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO);</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO);</li>
        <li>Löschung (Art. 17 DSGVO), soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen;</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO);</li>
        <li>Datenübertragbarkeit in einem strukturierten, gängigen, maschinenlesbaren Format (Art. 20 DSGVO) – im Konto unter „Konto → Meine Daten exportieren“;</li>
        <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO);</li>
        <li>Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO).</li>
      </ul>
      <p>
        Ihr Konto können Sie jederzeit selbst unter „Konto“ löschen. Anfragen beantworten wir innerhalb eines Monats (Art. 12 Abs. 3 DSGVO). Zum Schutz Ihrer Daten können wir einen Identitätsnachweis
        verlangen, wenn begründete Zweifel bestehen.
      </p>

      <h2 id="widerspruch">Widerspruchsrecht nach Art. 21 DSGVO</h2>
      <p>
        <strong>
          Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit gegen die Verarbeitung Sie betreffender personenbezogener Daten, die aufgrund von Art. 6 Abs. 1 lit. f
          DSGVO erfolgt, Widerspruch einzulegen. Wir verarbeiten die Daten dann nicht mehr, es sei denn, wir können zwingende schutzwürdige Gründe nachweisen, die Ihre Interessen überwiegen, oder die
          Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.
        </strong>
      </p>

      <h2 id="beschwerde">Beschwerderecht bei einer Aufsichtsbehörde</h2>
      <p>
        Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO), insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des
        mutmaßlichen Verstoßes. Für uns zuständig ist: <Ph>ZUSTÄNDIGE LANDESDATENSCHUTZBEHÖRDE des Bundeslandes Ihres Sitzes, mit Anschrift</Ph>.
      </p>

      <h2 id="pflicht">Pflicht zur Bereitstellung, automatisierte Entscheidungen</h2>
      <p>
        Die Angabe der als Pflichtfeld gekennzeichneten Daten ist für Registrierung bzw. Buchung erforderlich; ohne sie kann der Vertrag nicht geschlossen werden. Eine automatisierte Entscheidung
        einschließlich Profiling nach Art. 22 DSGVO findet nicht statt. Automatische Filter (z. B. Spam-Erkennung) führen nicht zu endgültigen Entscheidungen; über Sperrungen entscheidet ein Mensch.
      </p>

      <h2 id="minderjaehrige">Minderjährige</h2>
      <p>
        Die Registrierung als Betrieb ist nur volljährigen Personen gestattet. Buchungen für Minderjährige unter 16 Jahren sollen durch einen Erziehungsberechtigten erfolgen (Art. 8 DSGVO).
      </p>

      <h2 id="tom">Datensicherheit</h2>
      <p>
        Wir treffen technische und organisatorische Maßnahmen nach Art. 32 DSGVO, u. a.: TLS-Verschlüsselung (HSTS), Verschlüsselung der Datenbank im Ruhezustand, strikte Mandantentrennung durch
        Row-Level-Security, Passwort-Hashing, Mindestlänge für Passwörter, Ratenbegrenzung gegen Brute-Force, Content-Security-Policy gegen Cross-Site-Scripting, Prüfung hochgeladener Dateien,
        pseudonymisierte IP-Speicherung, rollenbasierte Zugriffe, Zwei-Faktor-Authentifizierung für Administratoren, Zwangsänderung vergebener Startpasswörter, Sperrlisten gegen Missbrauch, Audit-Protokolle, automatische Löschfristen und regelmäßige Sicherheitsprüfungen. Details enthält
        Anlage 1 unseres <Link href="/avv">AVV</Link>.
      </p>

      <h2 id="panne">Datenschutzverletzungen</h2>
      <p>
        Sollte es trotz aller Maßnahmen zu einer Verletzung des Schutzes personenbezogener Daten kommen, melden wir diese innerhalb von 72 Stunden der zuständigen Aufsichtsbehörde (Art. 33 DSGVO),
        sofern ein Risiko für Betroffene besteht, und benachrichtigen Betroffene bei hohem Risiko unverzüglich (Art. 34 DSGVO). Betriebe, deren Kundendaten betroffen sind, informieren wir als
        Auftragsverarbeiter möglichst innerhalb von 24 Stunden.
      </p>

      <h2 id="aenderungen">Änderungen dieser Datenschutzerklärung</h2>
      <p>
        Wir passen diese Datenschutzerklärung an, wenn sich unser Dienst oder die Rechtslage ändert. Es gilt die jeweils hier veröffentlichte Fassung. Über wesentliche Änderungen informieren wir
        registrierte Nutzer per E-Mail oder im Dashboard.
      </p>
    </LegalPage>
  );
}
