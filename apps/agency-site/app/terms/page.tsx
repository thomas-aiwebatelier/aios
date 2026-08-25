import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Algemene voorwaarden — AI Web Atelier",
  description:
    "Algemene voorwaarden van AI Web Atelier. Tarieven, eigendom, annulering en toepasselijk Belgisch recht.",
  alternates: { canonical: "/terms" },
};

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function TermsPage() {
  const lastUpdated = dateFormatter.format(new Date());

  return (
    <>
      <main className="legal-page">
        <div className="container">
          <div className="legal-page__content">
            <a href="/" className="legal-page__back">
              ← Terug naar home
            </a>
            <h1 className="legal-page__title">Algemene voorwaarden</h1>
            <p className="legal-page__updated">Laatste update: {lastUpdated}</p>

            <div className="legal-page__body">
              <h2>1. De dienst</h2>
              <p>
                <strong>AI Web Atelier</strong> is een eenmanszaak van Thomas
                Cortebeeck (hierna: &quot;wij&quot;, &quot;ons&quot; of{" "}
                &quot;AI Web Atelier&quot;), gevestigd in België. Wij leveren{" "}
                <strong>maatwerk websites voor Belgische KMO&apos;s</strong>:
                van onderzoek en ontwerp tot oplevering en domeinverbinding.
                Deze voorwaarden zijn van toepassing op alle offertes,
                bestellingen en overeenkomsten die wij met u sluiten.
              </p>

              <h2>2. Werkwijze en doorlooptijd</h2>
              <p>Onze standaardwerkwijze verloopt in vijf stappen:</p>
              <ol>
                <li>
                  <strong>Onderzoek:</strong> wij analyseren uw huidige online
                  aanwezigheid, sector en concurrenten.
                </li>
                <li>
                  <strong>AI-generatie:</strong> op basis van dat onderzoek
                  bouwen wij een gepersonaliseerde voorstel-website.
                </li>
                <li>
                  <strong>Review (MVP):</strong> u bekijkt de eerste versie op
                  een live preview-URL. Dit is uw MVP-moment.
                </li>
                <li>
                  <strong>Herziening (optioneel):</strong> wenst u aanpassingen,
                  dan stuurt u uw feedback in één keer en verwerken wij alles in
                  één herzieningsronde van €100. Daarna is de website af.
                </li>
                <li>
                  <strong>Lancering:</strong> na uw goedkeuring koppelen wij het
                  domein en gaan we live.
                </li>
              </ol>
              <p>
                De typische doorlooptijd bedraagt <strong>7 werkdagen</strong>{" "}
                na uw akkoord op de offerte, afhankelijk van de beschikbaarheid
                van uw materiaal en de snelheid van domeinpropagatie.
              </p>

              <h2>3. Tarief</h2>
              <p>
                Alle bedragen in deze voorwaarden zijn <strong>exclusief btw</strong>.
                Het tarief is opgebouwd uit drie delen — eerlijk en zonder
                verrassingen:
              </p>
              <ul>
                <li>
                  <strong>€249 eenmalig — voor het ontwerp.</strong> Dit dekt de
                  eerste versie van de website. Na oplevering krijgt u de
                  volledige broncode en gaat het eigendom over naar u (zie §6).
                </li>
                <li>
                  <strong>€100 per herzieningsronde — optioneel.</strong> Wenst u
                  na uw review aanpassingen, dan voeren wij die uit in één
                  herzieningsronde tegen €100. Ontwerp plus één herzieningsronde
                  komt zo op €349. Elke bijkomende ronde wordt apart aangerekend
                  aan hetzelfde tarief.
                </li>
                <li>
                  <strong>
                    €9,99 per maand of €99,99 per jaar — optioneel — voor hosting
                    en onderhoud.
                  </strong>{" "}
                  Wij hosten uw site op Cloudflare&apos;s wereldwijde CDN,
                  beheren het SSL-certificaat, voeren beveiligings- en
                  software-updates uit, monitoren de uptime 24/7, behandelen
                  één kleine inhoudswijziging per maand en bieden e-mailsupport
                  binnen 24 uur. <strong>Opzegbaar per maand</strong>, geen
                  contractduur. U kunt er ook voor kiezen om zelf te hosten — u
                  bezit immers de volledige broncode.
                </li>
              </ul>
              <p>
                Er zijn geen verborgen kosten. Meerwerk buiten een betaalde
                herzieningsronde of het maandabonnement wordt vooraf apart
                geoffreerd en uitgevoerd alleen na uw expliciete schriftelijke
                akkoord.
              </p>
              <p>
                Betaling van het eenmalige bedrag vindt plaats per factuur met
                een betaaltermijn van <strong>30 kalenderdagen</strong>,
                gestuurd nadat u de live preview heeft goedgekeurd. Er is{" "}
                <strong>geen vooruitbetaling</strong> vereist vóór uw
                expliciete goedkeuring van het voorstel. Het maandabonnement
                wordt maandelijks vooruitgefactureerd, ingaand op de
                lanceringsdatum.
              </p>

              <h2>4. Wat is inbegrepen in het eenmalige ontwerp</h2>
              <ul>
                <li>
                  <strong>Domeinverbinding:</strong> koppeling van uw bestaand
                  domein <em>of</em> eenmalige registratie van één{" "}
                  <code>.be</code>- of <code>.com</code>-domein voor het
                  eerste jaar.
                </li>
                <li>
                  <strong>SSL-certificaat</strong> (HTTPS) — automatisch via
                  Cloudflare ingesteld bij lancering.
                </li>
                <li>
                  <strong>Volledige overdracht van de broncode:</strong> u
                  ontvangt alle bestanden van de website en mag deze onbeperkt
                  elders hosten of aanpassen.
                </li>
                <li>
                  <strong>Herzieningsronde — apart aan te rekenen.</strong> Een
                  herzieningsronde na uw MVP-review kost €100. Alle aanpassingen
                  aan inhoud, stijl of structuur die u binnen die ronde
                  aanlevert, worden voor dat bedrag uitgevoerd.
                </li>
              </ul>

              <h2>
                4b. Wat is inbegrepen in het maandabonnement (€9,99/maand of
                €99,99/jaar, optioneel)
              </h2>
              <ul>
                <li>
                  <strong>Hosting</strong> op Cloudflare&apos;s wereldwijde
                  CDN.
                </li>
                <li>
                  <strong>SSL-certificaat automatisch verlengd</strong> voor
                  de looptijd van het abonnement.
                </li>
                <li>
                  <strong>Beveiligings- en software-updates</strong> wanneer
                  nodig.
                </li>
                <li>
                  <strong>Uptime monitoring 24/7</strong> — wij merken eerder
                  dan u dat er iets niet werkt.
                </li>
                <li>
                  <strong>Tot 1 kleine inhoudswijziging per maand</strong>{" "}
                  (openingsuren, telefoonnummer, een korte nieuwsupdate).
                </li>
                <li>
                  <strong>E-mailsupport</strong> binnen 24 uur op werkdagen.
                </li>
              </ul>

              <h2>5. Wat is niet inbegrepen</h2>
              <ul>
                <li>
                  <strong>Domeinverlenging na jaar 1:</strong> domeinregistratie
                  na het eerste jaar is uw verantwoordelijkheid en valt buiten
                  het vaste tarief.
                </li>
                <li>
                  <strong>Contentverzameling (tekst en foto&apos;s):</strong>{" "}
                  wij werken met uw bestaand materiaal of materiaal dat u
                  aanlevert. Professionele tekstschrijverij of fotografie valt
                  buiten de scope.
                </li>
                <li>
                  <strong>E-mailhosting:</strong> een zakelijk e-mailadres
                  (bijv. <code>info@uwbedrijf.be</code>) maakt geen deel uit
                  van het pakket. Wij adviseren Google Workspace of Microsoft
                  365 als losse dienst.
                </li>
                <li>
                  <strong>
                    Uitbreidingen buiten het oorspronkelijke voorstel:
                  </strong>{" "}
                  nieuwe secties, functionaliteit of pagina&apos;s die na
                  goedkeuring worden aangevraagd, worden afzonderlijk
                  geoffreerd.
                </li>
              </ul>

              <h2>6. Eigendom en auteursrecht</h2>
              <p>
                Na volledige betaling van het factuurbedrag gaat{" "}
                <strong>alle eigendom van de website</strong> — inclusief de
                gegenereerde code, het ontwerp en alle aanpassingen — volledig
                over naar u. AI Web Atelier behoudt na eigendomsoverdracht
                geen enkele aanspraak op de code, het ontwerp of de inhoud.
              </p>
              <p>
                De website mag door u worden gehost bij een andere aanbieder,
                worden aangepast door derden of worden doorverkocht, zonder
                enige beperking of toestemming van AI Web Atelier.
              </p>
              <p>
                Teksten, afbeeldingen en handelsmerken die u aanlevert of die
                van uw bestaande website worden gebruikt, blijven eigendom van
                u of de respectievelijke rechthebbenden. AI Web Atelier maakt
                hierop geen aanspraak.
              </p>

              <h2>7. Annulering</h2>
              <ul>
                <li>
                  <strong>Vóór akkoord op het voorstel:</strong> u kunt op elk
                  moment en zonder kosten afzien van een voorstel. Er is geen
                  factuur, geen verplichting.
                </li>
                <li>
                  <strong>Na akkoord, binnen 7 werkdagen:</strong> bij
                  annulering binnen 7 werkdagen na uw schriftelijk akkoord
                  bedragen de kosten{" "}
                  <strong>50% van het factuurbedrag</strong> van de betreffende
                  opdracht, ter dekking van reeds geleverd werk. Bij een
                  webontwerp van €249 is dat €124,50.
                </li>
                <li>
                  <strong>Na akkoord, na 7 werkdagen:</strong> bij annulering
                  na 7 werkdagen is het volledige bedrag (
                  <strong>100%</strong>) van de betreffende opdracht
                  verschuldigd.
                </li>
              </ul>

              <h2>8. Aansprakelijkheid</h2>
              <p>
                De aansprakelijkheid van AI Web Atelier is in alle gevallen
                beperkt tot{" "}
                <strong>
                  tweemaal het factuurbedrag van de betreffende opdracht
                </strong>{" "}
                . AI Web Atelier is niet aansprakelijk voor indirecte schade,
                gevolgschade, gederfde winst of verlies van gegevens.
              </p>
              <p>
                AI Web Atelier is niet aansprakelijk voor inhoud die u
                aanlevert (teksten, afbeeldingen, handelsmerken). U garandeert
                dat u de rechten bezit of de toestemming heeft om dit materiaal
                te gebruiken.
              </p>

              <h2>9. Toepasselijk recht en bevoegde rechter</h2>
              <p>
                Op alle overeenkomsten met AI Web Atelier is uitsluitend het{" "}
                <strong>Belgisch recht</strong> van toepassing. Bij geschillen
                die niet in der minne kunnen worden opgelost, zijn de
                rechtbanken van het{" "}
                <strong>arrondissement Antwerpen</strong> exclusief bevoegd.
              </p>

              <h2>10. Wijzigingen</h2>
              <p>
                Wij behouden het recht om deze voorwaarden te wijzigen. De
                meest recente versie is altijd raadpleegbaar via{" "}
                <a href="/terms">aiwebatelier.com/terms</a>. Bij ingrijpende
                wijzigingen informeren wij actieve klanten per e-mail.
                Wijzigingen hebben geen terugwerkende kracht op lopende
                overeenkomsten.
              </p>
              <p>
                Vragen over deze voorwaarden? Stuur een e-mail naar{" "}
                <a href="mailto:thomas@aiwebatelier.com">
                  thomas@aiwebatelier.com
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
