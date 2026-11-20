import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalPage, Ph } from '@/components/legal';
export const metadata: Metadata = { title: 'AGB – Slotdove', description: 'Allgemeine Geschäftsbedingungen für die Nutzung der Terminbuchungssoftware Slotdove durch Unternehmer.' };

const toc: [string, string][] = [
  ['geltung', 'Geltungsbereich, Unternehmereigenschaft'],
  ['leistung', 'Leistungsbeschreibung'],
  ['vertrag', 'Registrierung und Vertragsschluss'],
  ['test', 'Testphase und Demo-Zugänge'],
  ['preise', 'Tarife, Preise und Zahlung'],
  ['pflichten', 'Pflichten des Kunden'],
  ['endkunden', 'Verhältnis zu Endkunden des Kunden'],
  ['inhalte', 'Inhalte des Kunden, Nutzungsrechte'],
  ['verboten', 'Verbotene Nutzung'],
  ['moderation', 'Meldeverfahren, Moderation und Sperrung (DSA)'],
  ['ki', 'KI-Funktionen'],
  ['verfuegbarkeit', 'Verfügbarkeit, Wartung, Änderungen'],
  ['datenschutz', 'Datenschutz und Auftragsverarbeitung'],
  ['sicherheit', 'Zugangsdaten und Sicherheit'],
  ['haftung', 'Haftung'],
  ['freistellung', 'Freistellung'],
  ['laufzeit', 'Laufzeit und Kündigung'],
  ['datenende', 'Datenexport und Löschung bei Vertragsende'],
  ['aenderung', 'Änderungen der AGB'],
  ['schluss', 'Schlussbestimmungen'],
];

export default function Page() {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen (AGB)" toc={toc}>
      <p>
        Diese Allgemeinen Geschäftsbedingungen regeln die Nutzung der Software „Slotdove“ (nachfolgend „Dienst“), angeboten von <Ph>VOR- UND NACHNAME / FIRMA</Ph>, <Ph>ANSCHRIFT</Ph> (nachfolgend
        „Anbieter“, „wir“).
      </p>

      <h2 id="geltung">§ 1 Geltungsbereich, Unternehmereigenschaft</h2>
      <ol>
        <li>
          Diese AGB gelten für alle Verträge über die Nutzung des Dienstes zwischen dem Anbieter und seinen Kunden. Der Dienst richtet sich <strong>ausschließlich an Unternehmer</strong> im Sinne des
          § 14 BGB, juristische Personen des öffentlichen Rechts und öffentlich-rechtliche Sondervermögen (nachfolgend „Kunde“). Mit der Registrierung bestätigt der Kunde, in Ausübung seiner gewerblichen
          oder selbständigen beruflichen Tätigkeit zu handeln.
        </li>
        <li>Abweichende, entgegenstehende oder ergänzende Bedingungen des Kunden werden nicht Vertragsbestandteil, auch wenn wir ihnen nicht ausdrücklich widersprechen.</li>
        <li>Individuelle Vereinbarungen in Textform haben Vorrang vor diesen AGB.</li>
        <li>Endkunden des Kunden, die über eine Buchungsseite einen Termin buchen, werden nicht Vertragspartner des Anbieters; für sie gelten die Bedingungen des jeweiligen Kunden.</li>
      </ol>

      <h2 id="leistung">§ 2 Leistungsbeschreibung</h2>
      <ol>
        <li>
          Slotdove ist eine webbasierte Software-as-a-Service-Lösung für Online-Terminbuchung. Der Funktionsumfang umfasst je nach Tarif insbesondere: öffentliche Buchungsseite, Kalender und
          Terminverwaltung, Verwaltung von Leistungen, Mitarbeitern, Arbeitszeiten, Pausen und Feiertagen, Kundenkartei, automatische E-Mail-Bestätigungen und -Erinnerungen, Kunden-Chat, Auswertungen,
          Teamzugänge sowie optionale KI-Funktionen.
        </li>
        <li>Der konkrete Leistungsumfang ergibt sich aus der bei Vertragsschluss gültigen Tarifbeschreibung auf der Website.</li>
        <li>
          Der Anbieter schuldet die Bereitstellung der Software über das Internet, nicht deren Überlassung. Die Internetverbindung bis zum Rechenzentrum sowie geeignete Endgeräte und aktuelle Browser
          stellt der Kunde.
        </li>
        <li>
          Der Anbieter ist nicht Partei der zwischen Kunde und Endkunden geschlossenen Verträge über Dienstleistungen und übernimmt keine Gewähr für deren Durchführung, Bezahlung oder für das Erscheinen von
          Endkunden.
        </li>
        <li>Funktionen, die als „Beta“ gekennzeichnet sind, werden ohne Verfügbarkeitszusage zur Erprobung bereitgestellt und können geändert oder eingestellt werden.</li>
      </ol>

      <h2 id="vertrag">§ 3 Registrierung und Vertragsschluss</h2>
      <ol>
        <li>Die Darstellung der Tarife auf der Website stellt kein bindendes Angebot dar.</li>
        <li>
          Mit Abschluss der Registrierung und Bestätigung dieser AGB, der Datenschutzerklärung und des Auftragsverarbeitungsvertrags gibt der Kunde ein Angebot auf Abschluss eines Nutzungsvertrags ab. Der
          Vertrag kommt mit Freischaltung des Kontos zustande.
        </li>
        <li>Der Kunde ist verpflichtet, wahrheitsgemäße und vollständige Angaben zu machen und diese aktuell zu halten. Ein Anspruch auf Vertragsschluss besteht nicht.</li>
        <li>Die für den Kunden handelnde Person versichert, zur Vertretung berechtigt und volljährig zu sein.</li>
      </ol>

      <h2 id="test">§ 4 Testphase und Demo-Zugänge</h2>
      <ol>
        <li>Wir können eine kostenlose Testphase (in der Regel 14 Tage) anbieten. Während der Testphase entstehen keine Kosten.</li>
        <li>
          Die Testphase endet automatisch. Sie geht nur dann in einen kostenpflichtigen Tarif über, wenn der Kunde ausdrücklich einen kostenpflichtigen Tarif bucht. Ohne Buchung wird der Zugang nach Ablauf
          eingeschränkt; Daten werden nach weiteren 30 Tagen gelöscht, sofern der Kunde keinen Tarif wählt.
        </li>
        <li>Demo-Zugänge enthalten Beispieldaten; E-Mails an Dritte werden aus Demo-Konten nicht versendet.</li>
      </ol>

      <h2 id="preise">§ 5 Tarife, Preise und Zahlung</h2>
      <ol>
        <li>
          Es gelten die zum Zeitpunkt der Buchung auf der Website angegebenen Preise (derzeit ab 5 €, 15 € bzw. 25 € pro Monat je nach Tarif). Alle Preise verstehen sich{' '}
          <Ph>zzgl. der gesetzlichen Umsatzsteuer – ODER bei Kleinunternehmerregelung: „ohne Ausweis der Umsatzsteuer gemäß § 19 UStG“</Ph>.
        </li>
        <li>Die Vergütung ist monatlich bzw. jährlich im Voraus fällig. Rechnungen werden elektronisch gestellt; der Kunde stimmt der elektronischen Rechnungsstellung zu.</li>
        <li>
          Gerät der Kunde mit der Zahlung mehr als 14 Tage in Verzug, können wir den Zugang nach vorheriger Ankündigung in Textform vorübergehend sperren. Die Pflicht zur Zahlung bleibt bestehen. Gesetzliche
          Verzugszinsen (§ 288 Abs. 2 BGB) bleiben vorbehalten.
        </li>
        <li>
          Preisänderungen kündigen wir mindestens sechs Wochen vor Inkrafttreten in Textform an. Der Kunde kann zum Zeitpunkt des Inkrafttretens außerordentlich kündigen. Auf dieses Recht weisen wir in der
          Ankündigung hin.
        </li>
        <li>Wir erheben keine Provision auf Buchungen des Kunden.</li>
      </ol>

      <h2 id="pflichten">§ 6 Pflichten des Kunden</h2>
      <ol>
        <li>Der Kunde ist für die Inhalte seiner Buchungsseite, Leistungsbeschreibungen, Preise, Bilder, Chatnachrichten und alle sonstigen von ihm eingestellten Daten allein verantwortlich.</li>
        <li>
          Der Kunde erfüllt die ihn treffenden rechtlichen Pflichten selbst, insbesondere: eigenes Impressum und eigene Datenschutzinformationen gegenüber seinen Endkunden, Preisangabenverordnung,
          berufsrechtliche Vorgaben (z. B. für Heilberufe), Informationspflichten gegenüber Verbrauchern, ggf. Widerrufsbelehrungen für außerhalb von Geschäftsräumen bzw. im Fernabsatz geschlossene
          Verträge, Stornoregelungen sowie steuerliche Pflichten.
        </li>
        <li>
          Der Kunde verarbeitet über den Dienst keine besonderen Kategorien personenbezogener Daten (Art. 9 DSGVO, z. B. Diagnosen), es sei denn, dies ist für seinen Betrieb erforderlich, rechtlich
          zulässig und er hat geeignete Schutzmaßnahmen getroffen. Freitextfelder sind hierfür grundsätzlich nicht vorgesehen.
        </li>
        <li>Der Kunde informiert seine Beschäftigten, für die er Zugänge anlegt, über die Datenverarbeitung und stellt sicher, dass sie diese AGB und die Sicherheitsvorgaben einhalten.</li>
        <li>Der Kunde sichert eigene wichtige Daten regelmäßig über die bereitgestellten Exportfunktionen.</li>
        <li>Der Kunde meldet erkannte Sicherheitslücken, Störungen oder Missbrauch unverzüglich an uns.</li>
      </ol>

      <h2 id="endkunden">§ 7 Verhältnis zu Endkunden des Kunden</h2>
      <ol>
        <li>Buchungen kommen ausschließlich zwischen dem Kunden und seinen Endkunden zustande. Der Kunde ist für Bestätigung, Durchführung, Absage und Abrechnung verantwortlich.</li>
        <li>Wir versenden in seinem Auftrag transaktionale E-Mails (Bestätigung, Erinnerung, Änderung). Werbliche E-Mails an Endkunden sind über den Dienst nicht zulässig.</li>
        <li>
          Der Kunde kann Endkunden bei sachlichem Grund (z. B. wiederholtes Nichterscheinen, Beleidigungen, Betrug) von der Online-Buchung in seinem Betrieb ausschließen. Er darf dabei nicht gegen das
          Allgemeine Gleichbehandlungsgesetz (AGG) verstoßen; Benachteiligungen etwa wegen der ethnischen Herkunft, des Geschlechts, der Religion, einer Behinderung, des Alters oder der sexuellen Identität
          sind untersagt.
        </li>
      </ol>

      <h2 id="inhalte">§ 8 Inhalte des Kunden, Nutzungsrechte</h2>
      <ol>
        <li>Alle Rechte an den Inhalten des Kunden verbleiben beim Kunden.</li>
        <li>
          Der Kunde räumt uns ein einfaches, auf die Vertragslaufzeit beschränktes Recht ein, seine Inhalte (z. B. Logo, Bilder, Texte) zu speichern, zu vervielfältigen, technisch zu bearbeiten (z. B.
          Größenanpassung) und öffentlich zugänglich zu machen, soweit dies zur Erbringung des Dienstes erforderlich ist.
        </li>
        <li>Der Kunde versichert, über alle erforderlichen Rechte an hochgeladenen Inhalten zu verfügen (insbesondere Urheber-, Marken- und Persönlichkeitsrechte abgebildeter Personen).</li>
        <li>
          An der Software, dem Design, dem Logo und der Dokumentation von Slotdove erhält der Kunde ein einfaches, nicht übertragbares, nicht unterlizenzierbares Nutzungsrecht für die Vertragslaufzeit.
          Reverse Engineering, automatisiertes Auslesen (Scraping) und das Umgehen technischer Schutzmaßnahmen sind untersagt, soweit nicht gesetzlich zwingend erlaubt (§§ 69d, 69e UrhG).
        </li>
      </ol>

      <h2 id="verboten">§ 9 Verbotene Nutzung</h2>
      <p>Der Kunde darf den Dienst nicht nutzen, um</p>
      <ul>
        <li>rechtswidrige Inhalte zu veröffentlichen oder rechtswidrige Leistungen anzubieten (z. B. Prostitution ohne Erlaubnis, verschreibungspflichtige Arzneimittel, Waffen, Glücksspiel ohne Lizenz);</li>
        <li>beleidigende, diskriminierende, volksverhetzende, gewaltverherrlichende, pornografische oder jugendgefährdende Inhalte zu verbreiten;</li>
        <li>Rechte Dritter zu verletzen (Urheber-, Marken-, Persönlichkeits- und Datenschutzrechte);</li>
        <li>Spam, unerlaubte Werbung (§ 7 UWG), Phishing oder Schadsoftware zu verbreiten;</li>
        <li>Fake-Buchungen, Scheinbewertungen oder irreführende Angaben zu erzeugen;</li>
        <li>die Sicherheit oder Stabilität des Dienstes zu gefährden (z. B. Lasttests, Penetrationstests ohne schriftliche Erlaubnis, Umgehen von Ratenbegrenzungen, Zugriff auf fremde Konten);</li>
        <li>den Dienst an Dritte weiterzuvermieten oder als eigenes Produkt weiterzuverkaufen.</li>
      </ul>

      <h2 id="moderation">§ 10 Meldeverfahren, Moderation und Sperrung (DSA)</h2>
      <ol>
        <li>
          Wir sind Anbieter eines Hostingdienstes im Sinne des Digital Services Act (Verordnung (EU) 2022/2065). Jede Person kann rechtswidrige Inhalte über unser <Link href="/melden">Meldeformular</Link>{' '}
          melden (Art. 16 DSA). Wir bestätigen den Eingang, prüfen Meldungen zeitnah, sorgfältig, frei von Willkür und objektiv und teilen unsere Entscheidung mit.
        </li>
        <li>
          Bei Anhaltspunkten für rechtswidrige Inhalte oder Verstöße gegen § 9 können wir – abgestuft und verhältnismäßig – Inhalte entfernen oder sperren, die Sichtbarkeit einschränken, die
          Buchungsseite vorübergehend deaktivieren, Funktionen einschränken oder das Konto sperren. Bei der Wahl der Maßnahme berücksichtigen wir die Schwere, Häufigkeit und Folgen des Verstoßes sowie die
          berechtigten Interessen aller Beteiligten und die Grundrechte, insbesondere die Meinungs- und Berufsfreiheit.
        </li>
        <li>
          Über jede Beschränkung erhält der betroffene Kunde eine klare und spezifische Begründung (Art. 17 DSA), mit Angabe der Maßnahme, der Tatsachen, ob automatisierte Mittel eingesetzt wurden, der
          Rechtsgrundlage bzw. der verletzten Vertragsbestimmung und der Rechtsbehelfe. Der Kunde kann innerhalb von sechs Monaten Einwände erheben; wir prüfen diese durch eine andere Person als die, die
          entschieden hat.
        </li>
        <li>
          Wer offensichtlich rechtswidrige Inhalte häufig bereitstellt oder offensichtlich unbegründete Meldungen häufig einreicht, kann nach vorheriger Warnung für einen angemessenen Zeitraum gesperrt
          werden (Art. 23 DSA). Bei Verdacht auf Straftaten, die eine Gefahr für Leben oder Sicherheit von Personen darstellen, informieren wir die zuständigen Behörden (Art. 18 DSA).
        </li>
        <li>Wir setzen automatische Filter nur unterstützend ein (z. B. Spam- und Beleidigungserkennung im Chat); Sperrungen von Konten entscheidet ein Mensch.</li>
        <li>Der Rechtsweg zu den ordentlichen Gerichten bleibt unberührt.</li>
      </ol>

      <h2 id="ki">§ 11 KI-Funktionen</h2>
      <ol>
        <li>
          Der Dienst enthält optionale KI-Funktionen. KI-Ergebnisse können fehlerhaft, unvollständig oder unpassend sein. Sie sind als Vorschlag gekennzeichnet und vom Kunden vor Verwendung zu prüfen.
          Der Kunde bleibt für veröffentlichte Inhalte verantwortlich.
        </li>
        <li>
          Der Kunde gibt in KI-Anfragen keine besonderen Kategorien personenbezogener Daten und keine Geschäftsgeheimnisse Dritter ein. Der Kunde ist dafür verantwortlich, seine Endkunden gemäß Art. 50
          KI-Verordnung zu informieren, wenn er KI-erzeugte Inhalte an sie weitergibt, soweit eine solche Pflicht besteht.
        </li>
      </ol>

      <h2 id="verfuegbarkeit">§ 12 Verfügbarkeit, Wartung, Änderungen</h2>
      <ol>
        <li>
          Wir bemühen uns um eine Verfügbarkeit von 99 % im Monatsmittel. Hiervon ausgenommen sind angekündigte Wartungsarbeiten, Störungen außerhalb unseres Einflussbereichs (z. B. höhere Gewalt,
          Ausfälle von Internet- und Cloud-Anbietern, Angriffe Dritter) sowie Beta-Funktionen.
        </li>
        <li>Wartungsarbeiten führen wir möglichst außerhalb üblicher Geschäftszeiten durch und kündigen größere Arbeiten im Dashboard an.</li>
        <li>
          Wir dürfen den Dienst weiterentwickeln und ändern, soweit dies für den Kunden zumutbar ist und der wesentliche Leistungsumfang erhalten bleibt (z. B. Sicherheitsupdates, Anpassung an Rechtslage,
          neue Funktionen). Wesentliche Einschränkungen kündigen wir mindestens sechs Wochen vorher an; der Kunde kann in diesem Fall außerordentlich kündigen.
        </li>
      </ol>

      <h2 id="datenschutz">§ 13 Datenschutz und Auftragsverarbeitung</h2>
      <ol>
        <li>
          Soweit wir personenbezogene Daten der Endkunden und Beschäftigten des Kunden verarbeiten, handeln wir als Auftragsverarbeiter. Es gilt der <Link href="/avv">Auftragsverarbeitungsvertrag (AVV)</Link>,
          der mit Annahme dieser AGB geschlossen wird und Vorrang vor diesen AGB hat, soweit er Datenschutzfragen regelt.
        </li>
        <li>Im Übrigen gilt unsere <Link href="/datenschutz">Datenschutzerklärung</Link>.</li>
      </ol>

      <h2 id="sicherheit">§ 14 Zugangsdaten und Sicherheit</h2>
      <ol>
        <li>
          Zugangsdaten sind geheim zu halten und dürfen nicht an Unbefugte weitergegeben werden. Jede Person erhält einen eigenen Zugang; geteilte Konten sind nicht erlaubt. Passwörter müssen mindestens
          12 Zeichen lang sein.
        </li>
        <li>Besteht der Verdacht, dass Unbefugte Kenntnis von Zugangsdaten erlangt haben, ändert der Kunde das Passwort unverzüglich und informiert uns.</li>
        <li>Wir dürfen Zugänge vorübergehend sperren, wenn konkrete Anhaltspunkte für einen Missbrauch oder eine Kompromittierung bestehen; wir informieren den Kunden unverzüglich.</li>
      </ol>

      <h2 id="haftung">§ 15 Haftung</h2>
      <ol>
        <li>
          Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit, nach dem Produkthaftungsgesetz sowie im Umfang einer übernommenen Garantie.
        </li>
        <li>
          Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten (Kardinalpflichten – Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf
          deren Einhaltung der Kunde regelmäßig vertrauen darf) ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt, höchstens jedoch auf die vom Kunden in den zwölf Monaten vor dem
          Schadensereignis gezahlte Vergütung.
        </li>
        <li>Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.</li>
        <li>
          Die verschuldensunabhängige Haftung für bei Vertragsschluss vorhandene Mängel (§ 536a Abs. 1 Alt. 1 BGB) ist ausgeschlossen. Für Datenverlust haften wir nur in Höhe des Aufwands, der bei
          ordnungsgemäßer Datensicherung durch den Kunden (§ 6 Abs. 5) zur Wiederherstellung erforderlich gewesen wäre.
        </li>
        <li>Wir haften nicht für entgangene Umsätze aus nicht wahrgenommenen Terminen von Endkunden oder für Inhalte und Handlungen des Kunden oder seiner Endkunden.</li>
        <li>Die vorstehenden Beschränkungen gelten auch zugunsten unserer gesetzlichen Vertreter, Mitarbeiter und Erfüllungsgehilfen. Die Haftung nach Art. 82 DSGVO bleibt unberührt.</li>
      </ol>

      <h2 id="freistellung">§ 16 Freistellung</h2>
      <p>
        Der Kunde stellt uns von allen Ansprüchen Dritter (einschließlich Behörden und Endkunden) frei, die auf einer schuldhaften Verletzung dieser AGB oder geltenden Rechts durch den Kunden,
        insbesondere durch von ihm eingestellte Inhalte, beruhen, einschließlich der angemessenen Kosten der Rechtsverteidigung. Wir informieren den Kunden unverzüglich über geltend gemachte Ansprüche
        und geben ihm Gelegenheit zur Stellungnahme.
      </p>

      <h2 id="laufzeit">§ 17 Laufzeit und Kündigung</h2>
      <ol>
        <li>
          Monatliche Tarife laufen auf unbestimmte Zeit und können von beiden Seiten mit einer Frist von 14 Tagen zum Ende des jeweiligen Abrechnungsmonats gekündigt werden. Jahrestarife verlängern sich
          nach Ablauf auf unbestimmte Zeit und sind dann mit einer Frist von einem Monat kündbar.
        </li>
        <li>
          Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Ein wichtiger Grund liegt für uns insbesondere vor bei erheblichen oder wiederholten Verstößen gegen § 9, einem
          Zahlungsverzug von mehr als zwei Monatsbeträgen oder bei Verwendung des Dienstes für Straftaten.
        </li>
        <li>Die Kündigung ist in Textform (z. B. E-Mail) oder über die Kündigungsfunktion im Konto möglich.</li>
      </ol>

      <h2 id="datenende">§ 18 Datenexport und Löschung bei Vertragsende</h2>
      <ol>
        <li>Der Kunde kann seine Daten jederzeit über die Exportfunktionen (CSV/JSON) herunterladen.</li>
        <li>
          Nach Vertragsende stellen wir den Export noch 30 Tage zur Verfügung und löschen die Daten danach, soweit keine gesetzlichen Aufbewahrungspflichten bestehen. Backups werden im regulären Zyklus
          überschrieben.
        </li>
      </ol>

      <h2 id="aenderung">§ 19 Änderungen der AGB</h2>
      <p>
        Wir können diese AGB mit Wirkung für die Zukunft ändern, wenn ein triftiger Grund besteht (z. B. Änderung der Rechtslage oder Rechtsprechung, neue Funktionen, Schließen von Regelungslücken) und
        der Kunde nicht unangemessen benachteiligt wird. Wir teilen Änderungen mindestens sechs Wochen vor Inkrafttreten in Textform mit. Widerspricht der Kunde nicht innerhalb dieser Frist, gelten die
        Änderungen als angenommen; auf diese Folge, das Widerspruchsrecht und die Frist weisen wir in der Mitteilung gesondert hin. Im Fall des Widerspruchs können beide Seiten zum Inkrafttreten
        kündigen. Änderungen der Hauptleistungspflichten und der Preise erfolgen nicht über diese Klausel.
      </p>

      <h2 id="schluss">§ 20 Schlussbestimmungen</h2>
      <ol>
        <li>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG).</li>
        <li>
          Ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist, soweit gesetzlich zulässig, der Sitz des Anbieters (<Ph>ORT</Ph>), sofern der Kunde Kaufmann, juristische Person
          des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist.
        </li>
        <li>Wir nehmen nicht an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teil (§ 36 VSBG).</li>
        <li>Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Anstelle der unwirksamen Bestimmung gelten die gesetzlichen Vorschriften (§ 306 BGB).</li>
        <li>Vertragssprache ist Deutsch. Übersetzungen dienen nur der Information.</li>
      </ol>
    </LegalPage>
  );
}
