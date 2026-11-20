import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal';
import { SupportCard } from '@/components/support-card';
import { dateDe, publicSettings } from '@/lib/release';
export const metadata: Metadata = { title: 'Slotdove unterstützen', description: 'Freiwillige Unterstützung der Betriebskosten von Slotdove.' };
export default async function Page() {
  const { release, support } = await publicSettings();
  return (
    <LegalPage title="Slotdove freiwillig unterstützen">
      <p>
        Slotdove ist vom {dateDe(release.free_from)} bis {dateDe(release.free_until)} für alle Betriebe kostenlos. Damit das so bleiben kann, entstehen trotzdem laufende Kosten – etwa für Domain,
        Server, Datenbank und den Versand von Buchungsbestätigungen.
      </p>
      {support.enabled ? <SupportCard support={support} de /> : <p className="notice">Die Möglichkeit zur Unterstützung ist gerade nicht aktiv.</p>}
      <h2>Was du wissen solltest</h2>
      <ul>
        <li>
          <strong>Freiwillig:</strong> Eine Unterstützung ist komplett freiwillig. Du bekommst dafür keine Gegenleistung, keine zusätzlichen Funktionen und keine bevorzugte Behandlung. Wer nichts gibt,
          nutzt Slotdove genauso.
        </li>
        <li>
          <strong>Keine Spende im steuerlichen Sinn:</strong> Slotdove ist keine gemeinnützige Organisation. Es gibt <strong>keine Spendenquittung</strong>, und der Betrag ist nicht als Spende steuerlich
          absetzbar.
        </li>
        <li>
          <strong>Wofür:</strong> Das Geld wird ausschließlich für die laufenden Betriebskosten von Slotdove verwendet.
        </li>
        <li>
          <strong>Kein Abo:</strong> Es entsteht kein Vertrag und keine wiederkehrende Zahlung – außer du richtest selbst beim Zahlungsdienst eine wiederkehrende Zahlung ein.
        </li>
        <li>
          <strong>Zahlungsabwicklung:</strong> Die Zahlung läuft vollständig über den externen Zahlungsdienst (z. B. PayPal). Wir erhalten dabei die Angaben, die der Dienst uns übermittelt (z. B. Name,
          E-Mail, Betrag, Nachricht). Es gelten zusätzlich die Datenschutzhinweise des Zahlungsdienstes. Mehr dazu in unserer <Link href="/datenschutz#unterstuetzung">Datenschutzerklärung</Link>.
        </li>
        <li>
          <strong>Rückerstattung:</strong> Wenn du versehentlich zu viel überwiesen hast, melde dich innerhalb von 14 Tagen – wir erstatten den Betrag.
        </li>
      </ul>
    </LegalPage>
  );
}
