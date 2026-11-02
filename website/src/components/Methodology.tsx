import { References } from './References';
import { TopicIcon } from './TopicIcon';
import type { MouseEvent } from 'react';

const applications = [
  [
    'Strategiespellen (abstract strategy games)',
    'Plannen en redeneren in spellen zoals schaken en Go.',
  ],
  [
    'Realtimegames (real-time video games)',
    'Snel reageren op veranderende omstandigheden in computerspellen.',
  ],
  [
    'Beeldherkenning (image recognition)',
    'Objecten en andere informatie in afbeeldingen herkennen.',
  ],
  [
    'Vragen over beelden beantwoorden (visual question answering)',
    'Visuele informatie en taal combineren om vragen over een afbeelding te beantwoorden.',
  ],
  ['Beeldgeneratie (image generation)', 'Nieuwe afbeeldingen maken.'],
  [
    'Begrijpend lezen (reading comprehension)',
    'Geschreven teksten begrijpen en vragen over de inhoud beantwoorden.',
  ],
  [
    'Taalmodellering (language modeling)',
    'Menselijke taal modelleren, voorspellen en genereren.',
  ],
  ['Vertalen (translation)', 'Woorden en teksten tussen talen vertalen.'],
  [
    'Spraakherkenning (speech recognition)',
    'Gesproken taal herkennen en omzetten naar tekst.',
  ],
  [
    'Instrumentale muziek herkennen (instrumental track recognition)',
    'Instrumentale muziekstukken herkennen op basis van geluidsinformatie.',
  ],
];

function jumpToTopic(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById(event.currentTarget.hash.slice(1));
  if (target) {
    event.preventDefault();
    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    });
  }
}

export function Methodology() {
  return (
    <section className="container section methodology-page" id="methodologie">
      <header className="methodology-header">
        <p className="eyebrow">Over AI Index Fryslân</p>
        <h1>Wat onderzoeken we?</h1>
        <p>
          Kunstmatige intelligentie verandert de manier waarop mensen werken.
          Tegelijkertijd verandert de Friese arbeidsmarkt door vergrijzing en de
          uitstroom van werknemers. We onderzoeken wat deze ontwikkelingen samen kunnen
          betekenen voor de vraag naar kennisintensieve professionals.
        </p>
      </header>
      <div className="methodology-question">
        <p>Onze onderzoeksvraag</p>
        <p>
          Hoe veranderen de gecombineerde effecten van AI-ontwikkeling en demografie de
          vraag naar kennisintensieve professionals in Fryslân tot 2035?
        </p>
      </div>
      <p className="methodology-intro">
        Om dit in beeld te brengen, verbinden we drie onderzoeksgebieden:
      </p>
      <div className="methodology-research-grid">
        <article className="methodology-research-card">
          <TopicIcon name="ai" />
          <h2>Invloed van AI</h2>
          <p>Hoe kan AI het werk en de vaardigheden binnen beroepen veranderen?</p>
        </article>
        <article className="methodology-research-card">
          <TopicIcon name="agenda" />
          <h2>Werkgelegenheid en uitstroom</h2>
          <p>
            Hoeveel mensen werken in Fryslân en hoeveel professionals zullen naar
            verwachting uitstromen?
          </p>
        </article>
        <article className="methodology-research-card">
          <TopicIcon name="onderwijs" />
          <h2>Onderwijs en instroom</h2>
          <p>
            Hoeveel nieuwe professionals kunnen vanuit het onderwijs beschikbaar komen?
          </p>
        </article>
      </div>
      <p className="methodology-connection">
        Samen vormen deze drie thema’s de basis voor ons onderzoek naar de toekomst van
        de Friese arbeidsmarkt richting 2035.
      </p>
      <nav className="methodology-contents" aria-label="Onderwerpen methodologie">
        {[
          ['methodologie-ai', 'Invloed van AI'],
          ['methodologie-werkgelegenheid', 'Werkgelegenheid en demografie'],
          ['methodologie-onderwijs-instroom', 'Onderwijs en instroom'],
          ['methodologie-samenhang', 'Samenhang richting 2035'],
        ].map(([id, label]) => (
          <a className="button primary" key={id} onClick={jumpToTopic} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <section className="methodology-topic" id="methodologie-ai">
        <h2>Invloed van AI</h2>
        <div className="methodology-main-explanation">
          <div>
            <h3>AI-exposure</h3>
            <p>
              AI-exposure laat zien in hoeverre de vaardigheden van een beroep
              aansluiten bij wat AI kan. We gebruiken hiervoor de onderzoeksindicatoren
              van Felten, Raj en Seamans (2021, 2023), met afzonderlijke scores voor
              algemene AI, taalmodellen en beeldgeneratie.
            </p>
          </div>
          <div>
            <h3>Complementariteit</h3>
            <p>
              Complementariteit laat zien in hoeverre kenmerken van het werk menselijke
              inzet belangrijk maken naast AI. Hiervoor berekent DataFryslân een score
              op basis van zes onderdelen uit de methode van Pizzinelli et al. (2023),
              waaronder communicatie, verantwoordelijkheid, beslissingen en vereiste
              voorbereiding.
            </p>
            <p>
              Een hoge AI-exposure betekent niet automatisch dat banen verdwijnen. De
              scores beschrijven kenmerken van beroepen, geen voorspellingen over
              baanverlies of productiviteitswinst.
            </p>
          </div>
          <div>
            <h3>Van Amerikaanse beroepen naar ISCO-08</h3>
            <p>
              De oorspronkelijke onderzoeken gebruiken Amerikaanse beroepsindelingen. We
              koppelen deze aan de internationale indeling ISCO-08, die ook in Nederland
              wordt gebruikt. Wanneer meerdere Amerikaanse beroepen aan één ISCO-groep
              gekoppeld zijn, nemen we het gemiddelde van de beschikbare scores.
            </p>
            <p>
              Voor 422 van de 436 beroepsgroepen zijn scores beschikbaar. Ontbrekende
              waarden worden niet als nul behandeld.
            </p>
          </div>
        </div>
        <details className="methodology-disclosure" id="methodologie-exposure">
          <summary>Hoe wordt AI-exposure berekend?</summary>
          <div className="methodology-disclosure-content">
            <h3>AI en beroepen: wat betekent AI-exposure?</h3>
            <p>
              AI-exposure laat zien hoeveel overlap er is tussen de vaardigheden die een
              beroep vraagt en wat AI kan. Een hogere score betekent meer overlap.
            </p>
            <p>
              Daarnaast kijken we welke kenmerken van het werk menselijke inzet
              belangrijk maken, zoals persoonlijk contact, keuzes maken en
              verantwoordelijkheid dragen. Dat noemen we complementariteit.
            </p>
            <p>
              De scores helpen om beroepen te vergelijken. Ze zijn geen percentages en
              voorspellen niet of banen verdwijnen. Een hoge score betekent dus niet dat
              AI het werk overneemt. Bij een lage of negatieve score kan AI nog steeds
              invloed hebben.
            </p>
            <h4>Drie varianten</h4>
            <dl className="methodology-definitions">
              <div>
                <dt>Algemene AI</dt>
                <dd>
                  De oorspronkelijke indicator van Felten et al. (2021) combineert tien
                  AI-toepassingen met 52 menselijke vermogens uit O*NET.
                </dd>
              </div>
              <div>
                <dt>Taalmodellen</dt>
                <dd>
                  De variant van Felten et al. (2023a) richt zich op taalmodellering: AI
                  die menselijke taal verwerkt en genereert.
                </dd>
              </div>
              <div>
                <dt>Beeldgeneratie</dt>
                <dd>
                  De afzonderlijke variant richt zich op AI die afbeeldingen maakt. De
                  latere publicatie uit 2023 behandelt zowel taalmodellen als
                  beeldgeneratie.
                </dd>
              </div>
            </dl>

            <details>
              <summary>De tien AI-toepassingen en 52 menselijke vermogens</summary>
              <p>
                De oorspronkelijke indicator gebruikt de volgende tien toepassingen:
              </p>
              <ol>
                {applications.map(([name, description]) => (
                  <li key={name}>
                    <strong>{name}.</strong> {description}
                  </li>
                ))}
              </ol>
              <p>
                De onderzoekers koppelen deze toepassingen aan alle 52 menselijke
                vermogens uit O*NET. Voorbeelden zijn informatie begrijpen, logisch
                redeneren, problemen herkennen, visuele informatie verwerken en
                nauwkeurige handelingen uitvoeren. O*NET beschrijft per beroep het
                belang en het vereiste niveau. DataFryslân maakt geen eigen selectie uit
                deze 52 vermogens.
              </p>
              <p>
                De tien toepassingen weerspiegelen de selectie in het oorspronkelijke
                onderzoek. Ze vormen geen volledig overzicht van wat AI nu kan.
              </p>
            </details>
            <details>
              <summary>Hoe komt de oorspronkelijke exposure-score tot stand?</summary>
              <ol>
                <li>
                  Felten en medeauteurs gebruiken enquêtebeoordelingen om de samenhang
                  tussen iedere AI-toepassing en ieder menselijk vermogen te bepalen.
                </li>
                <li>
                  Ze combineren die beoordelingen tot een exposure-score per vermogen.
                  Voor de taalmodelvariant telt alleen de toepassing taalmodellering
                  mee.
                </li>
                <li>
                  Ze combineren de uitkomsten met O*NET: vermogens wegen mee naar hun
                  belang en het vereiste niveau binnen een beroep.
                </li>
              </ol>
            </details>
            <h4>Wat doet DataFryslân zelf?</h4>
            <p>
              We nemen de gepubliceerde beroepsscores over en koppelen ze aan ISCO-08.
              We hebben de oorspronkelijke enquête niet opnieuw uitgevoerd. Voor de
              algemene AI-variant in de perceptuele kaart reconstrueren we daarnaast de
              ongestandaardiseerde AIOE uit de oorspronkelijke invoer en
              constructiecode. Die reconstructie sluit vrijwel volledig aan op de
              gepubliceerde scores.
            </p>
            <References topic="exposure" />
          </div>
        </details>
        <details className="methodology-disclosure" id="methodologie-complementariteit">
          <summary>Hoe wordt complementariteit berekend?</summary>
          <div className="methodology-disclosure-content">
            <h3>AI-complementariteit: kenmerken van het werk</h3>
            <p>
              Een beroep kan sterk aan AI zijn blootgesteld en tegelijk veel menselijke
              inbreng vragen. Daarom berekent DataFryslân een complementariteitsscore
              volgens de componentmethode van Pizzinelli et al. (2023). We gebruiken elf
              werkcontexten en de opleidings- en ervaringseisen uit O*NET 24.3 (mei
              2020).
            </p>
            <h4>Zes onderdelen die even zwaar meetellen</h4>
            <dl className="methodology-definitions">
              <div>
                <dt>Communicatie</dt>
                <dd>Persoonlijk contact en spreken voor groepen.</dd>
              </div>
              <div>
                <dt>Verantwoordelijkheid</dt>
                <dd>
                  Verantwoordelijkheid voor resultaten en voor de gezondheid en
                  veiligheid van anderen.
                </dd>
              </div>
              <div>
                <dt>Fysieke omstandigheden</dt>
                <dd>Buiten werken en fysieke nabijheid van anderen.</dd>
              </div>
              <div>
                <dt>Kritieke beslissingen</dt>
                <dd>
                  De gevolgen van fouten, beslisvrijheid en de frequentie van
                  beslissingen.
                </dd>
              </div>
              <div>
                <dt>Niet-routinematig werk</dt>
                <dd>
                  De mate van automatisering en de vrijheid om taken, prioriteiten en
                  doelen te bepalen.
                </dd>
              </div>
              <div>
                <dt>Vereiste voorbereiding</dt>
                <dd>
                  Opleiding, ervaring en voorbereiding die voor het beroep nodig zijn,
                  uitgedrukt in O*NET Job Zones.
                </dd>
              </div>
            </dl>

            <details>
              <summary>Hoe berekenen we de complementariteitsscore?</summary>
              <ol>
                <li>We selecteren de elf werkcontexten en Job Zones uit O*NET 24.3.</li>
                <li>
                  We zetten de werkcontextwaarden van 1–5 om naar 0–100. Alleen de mate
                  van automatisering wordt omgekeerd: minder automatisering geeft een
                  hogere score. Meer vrijheid in het werk scoort al hoger en wordt niet
                  omgekeerd.
                </li>
                <li>
                  Job Zones 1, 2, 3, 4 en 5 worden respectievelijk 20, 40, 60, 80 en
                  100.
                </li>
                <li>
                  We nemen het gemiddelde van de kenmerken binnen ieder onderdeel.
                  Daarna nemen we het gemiddelde van de zes onderdelen en delen dit door
                  100. Zo ontstaat een score tussen 0 en 1.
                </li>
                <li>
                  Voor ieder detailberoep zijn alle benodigde kenmerken vereist. We
                  middelen beschikbare detailberoepen naar SOC en vervolgens naar
                  ISCO-08.
                </li>
              </ol>
              <p>
                In formulevorm: de som van de zes componentscores, elk op schaal 0–100,
                gedeeld door 600. Ieder onderdeel telt even zwaar, ook als het meer
                onderliggende kenmerken bevat.
              </p>
            </details>

            <References topic="complementarity" />
          </div>
        </details>
        <details className="methodology-disclosure" id="methodologie-basis">
          <summary>Hoe koppelen we Amerikaanse beroepen aan ISCO-08?</summary>
          <div className="methodology-disclosure-content">
            <h3>Van Amerikaanse beroepen naar ISCO-08</h3>
            <p>
              De onderzoeksgegevens gebruiken Amerikaanse beroepscodes uit SOC en O*NET.
              Voor AI Index Fryslân koppelen we die aan ISCO-08: de internationale
              beroepsindeling van de International Labour Organization (ILO). We
              gebruiken de Nederlandse codelijst van het Centraal Bureau voor de
              Statistiek (CBS), met 436 beroepsgroepen en bijbehorende Nederlandse
              namen.
            </p>
            <ol>
              <li>
                We koppelen SOC-2010-codes aan viercijferige ISCO-08-groepen met de
                officiële BLS-koppeltabel. Daarbij controleren we de versie en dubbele
                relaties.
              </li>
              <li>
                Bij meerdere gekoppelde beroepen nemen we het gemiddelde van de
                beschikbare scores. Ieder gekoppeld beroep telt even zwaar.
              </li>
              <li>
                Voor 422 van de 436 groepen zijn scores beschikbaar; voor 14 ontbreken
                ze. Bij 50 beschikbare groepen is niet voor ieder gekoppeld bronberoep
                een exposure-score beschikbaar. Ontbrekende scores worden niet als nul
                ingevuld.
              </li>
            </ol>
            <p>
              Zo kunnen we onderzoeken wat AI kan betekenen voor beroepen in Fryslân. We
              kijken daarbij naar de werkzaamheden en vaardigheden die bij een beroep
              horen, niet naar hoeveel AI er al wordt gebruikt.
            </p>
            <References topic="classification" />
          </div>
        </details>
        <details className="methodology-disclosure" id="methodologie-validatie">
          <summary>Hoe hebben we de resultaten gecontroleerd?</summary>
          <div className="methodology-disclosure-content">
            <h3>Validatie: wat hebben we gecontroleerd?</h3>
            <p>
              We hebben de bronnen, verwerking en berekeningen gecontroleerd en opnieuw
              nagerekend. Daarbij onderscheiden we overgenomen exposure-scores, zelf
              berekende complementariteit en de eigen koppeling naar ISCO-08.
            </p>
            <h4>AI-exposure</h4>
            <p>
              De verwerking van de gepubliceerde scores en de ISCO-koppeling zijn
              reproduceerbaar. Ook de 774 taalmodelscores komen op de gepubliceerde
              decimalen overeen met de aangeleverde paper.
            </p>
            <h4>AI-complementariteit</h4>
            <p>
              De kenmerken, schaalomzettingen en zescomponentenweging sluiten aan bij de
              beschreven methode van Pizzinelli et al. (2023). De eigen scores zijn
              reproduceerbaar vanuit de gebruikte O*NET-bestanden. Ze zijn echter niet
              numeriek gelijk aan de IMF-referentiewaarden.
            </p>
            <details>
              <summary>Waarom wijken de complementariteitsscores af?</summary>
              <p>
                We onderzochten bronversies, schaalverwerking, weging, ontbrekende
                gegevens, aggregatie en beroepsselectie. De precieze oorzaak is nog niet
                bewezen. De oorspronkelijke IMF-constructiecode en volledige auteursdata
                zijn in de geraadpleegde bronnen niet gevonden. Sommige technische
                keuzes worden in de paper niet volledig gespecificeerd.
              </p>
              <p>
                Daarom presenteren we de uitkomsten als een eigen berekening volgens de
                beschreven componentmethode, niet als een exacte IMF-replicatie. We
                hebben de berekening niet aangepast om alleen de gepubliceerde
                referentiewaarden beter te benaderen.
              </p>
            </details>
            <References topic="validation" />
          </div>
        </details>
      </section>
      <section className="methodology-topic" id="methodologie-werkgelegenheid">
        <h2>Werkgelegenheid en demografie</h2>
        <p>
          We onderzoeken hoeveel mensen in Fryslân werken, hoe de werkgelegenheid is
          verdeeld over beroepen en hoeveel werknemers naar verwachting uitstromen,
          bijvoorbeeld door pensionering.
        </p>
        <p>
          Er wordt nog microdata toegevoegd om de uitstroom en leeftijdsopbouw van
          werkenden in Fryslân in beeld te brengen.
        </p>
        <details className="methodology-disclosure" id="methodologie-arbeidsmarkt">
          <summary>Welke arbeidsmarktgegevens gebruiken we?</summary>
          <div className="methodology-disclosure-content">
            <h3>Werkgelegenheid en demografie</h3>
            <p>
              We willen in kaart brengen hoeveel mensen in Fryslân werken, in welke
              beroepen en hoeveel werknemers naar verwachting uitstromen.
            </p>
            <References topic="labour" />
          </div>
        </details>
      </section>
      <section className="methodology-topic" id="methodologie-onderwijs-instroom">
        <h2>Onderwijs en instroom</h2>
        <p>
          We gebruiken zes DUO-databestanden over studenten en afgestudeerden in het
          mbo, hbo en wo.
        </p>
        <p>
          Voor hbo en wo selecteren we instellingen die in de bron onder provincie
          Friesland vallen. Voor mbo gebruiken we gegevens van Firda, Aeres, SVO en ROC
          Nova College.
        </p>
        <p>
          De mbo-cijfers omvatten ook onderwijslocaties buiten Fryslân. Afstuderen
          betekent bovendien niet automatisch dat iemand in Fryslân gaat werken.
        </p>
        <p>
          De onderwijsgegevens zijn gecontroleerd, maar nog niet gekoppeld aan
          beroepsgroepen. Daarom kunnen we nog geen instroom per beroep berekenen.
        </p>
        <details className="methodology-disclosure" id="methodologie-onderwijs">
          <summary>Hoe zijn de onderwijsgegevens geselecteerd en verwerkt?</summary>
          <div className="methodology-disclosure-content">
            <h3>Onderwijs en instroom</h3>
            <p>
              We gebruiken zes bestanden van Dienst Uitvoering Onderwijs (DUO) over
              studenten en afgestudeerden in mbo, hbo en wo. Ze geven zicht op het
              onderwijsaanbod en mogelijke toekomstige instroom op de arbeidsmarkt.
            </p>
            <h4>Hoe maken we de selectie?</h4>
            <p>
              Voor hbo en wo selecteren we instellingen met provincie Friesland in de
              bron. Voor mbo selecteren we Firda, Aeres, SVO en ROC Nova College:
              instellingen met Friese onderwijslocaties. De mbo-aantallen betreffen de
              hele instelling, dus ook locaties buiten Fryslân. Het zijn geen
              uitsluitend Friese aantallen.
            </p>
            <p>
              We zetten jaar- en geslachtskolommen onder elkaar en controleren iedere
              geselecteerde cel tegen de bron. De aantallen veranderen niet: we tellen
              niet op en schatten niets bij. Afgeschermde aantallen, zoals ‘minder dan
              5’, blijven herkenbaar en worden niet als nul behandeld.
            </p>
            <p>
              De onderwijsbestanden geven nog geen instroom per beroep: een gevalideerde
              koppeling tussen opleidingen en beroepen ontbreekt. Een afgestudeerde is
              bovendien niet automatisch een nieuwe werknemer in Fryslân.
            </p>

            <References topic="education" />
          </div>
        </details>
      </section>
      <section className="methodology-topic" id="methodologie-samenhang">
        <h2>Samenhang richting 2035</h2>
        <p>
          Uiteindelijk brengen we de drie onderzoeksgebieden samen om mogelijke
          ontwikkelingen op de Friese arbeidsmarkt te verkennen.
        </p>
        <p>
          De gecombineerde scenarioberekening is nog in ontwikkeling. Er zijn nog geen
          gevalideerde voorspellingen van personeelstekorten per beroep in 2035.
        </p>
        <details className="methodology-disclosure" id="methodologie-scenario">
          <summary>Hoe verkennen we de samenhang richting 2035?</summary>
          <div className="methodology-disclosure-content">
            <h3>Scenarioberekening richting 2035</h3>
            <p>
              Uiteindelijk willen we de drie onderzoeksgebieden samenbrengen: mogelijke
              veranderingen in beroepsinhoud door AI, de ontwikkeling van
              werkgelegenheid en demografie, en instroom vanuit het onderwijs.
            </p>
            <p>
              De gecombineerde scenarioberekening is nog in ontwikkeling. Er is nog geen
              gevalideerd model voor tekorten per beroep in 2035. De huidige AI-indices
              zijn statische beroepsscores en kunnen niet rechtstreeks worden vertaald
              naar toekomstige aantallen banen of benodigde werknemers.
            </p>
          </div>
        </details>
      </section>
      <p className="methodology-data-link">
        <a href="#open-data">Bekijk Bronnen &amp; open data</a>
      </p>
    </section>
  );
}
