import { SectionHeading } from './ui';
import { PerceptualChart } from './PerceptualChart';
export function PerceptualFramework({ home = false }: { home?: boolean }) {
  return (
    <section className="container section" id={home ? 'home' : 'perceptuele-kaart'}>
      <SectionHeading
        eyebrow={
          home
            ? 'DataFryslân | AI Index Fryslân'
            : 'AI-exposurescore × complementariteitsscore'
        }
        title="Hoe verhoudt jouw beroep zich tot AI?"
      >
        Vergelijk beroepen op AI-exposure en complementariteit: hoeveel overlap is er
        met AI en in hoeverre kan AI het werk ondersteunen?
      </SectionHeading>
      <PerceptualChart />
      <details className="framework-details">
        <summary>Uitleg en methode bij de kaart</summary>
        <p className="research-summary"></p>
        <div className="framework-scroll">
          <table className="framework-table" aria-label="Uitleg van de vier vlakken">
            <thead>
              <tr>
                <td>
                  <span>Complementariteit ↑</span>
                  <br />
                  <span>AI-exposure →</span>
                </td>
                <th scope="col">Lage AI-exposure</th>
                <th scope="col">Hoge AI-exposure</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Hoge complementariteit</th>
                <td className="framework-complementary">
                  <h3>Complementair potentieel</h3>
                  <p>
                    AI kan menselijke arbeid aanvullen, maar door de lage exposure is er
                    minder ruimte voor interactie met de vaardigheden en taken van het
                    beroep. Het effect op de arbeidsvraag is daardoor naar verwachting
                    beperkter.
                  </p>
                </td>
                <td className="framework-support">
                  <h3>Potentieel productiviteitswinst</h3>
                  <p>
                    AI kan als ondersteunende technologie functioneren. Werknemers
                    hebben meer kans op productiviteitswinst, mits de juiste
                    infrastructuur en vaardigheden beschikbaar zijn.
                  </p>
                </td>
              </tr>
              <tr>
                <th scope="row">Lage complementariteit</th>
                <td className="framework-limited">
                  <h3>Beperkte directe AI-impact</h3>
                  <p>
                    De AI-blootstelling is relatief laag. Volgens dit framework is
                    daardoor waarschijnlijk sprake van een beperkte directe invloed van
                    AI op het beroep.
                  </p>
                </td>
                <td className="framework-substitution">
                  <h3>Hoger substitutierisico</h3>
                  <p>
                    AI raakt het beroep sterk, terwijl het potentieel om menselijke
                    arbeid aan te vullen relatief laag is. Daardoor is er binnen dit
                    kader een hoger risico op vervanging van arbeid of afname van de
                    arbeidsvraag.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="research-summary">
          Bronnen: Felten et al. (2021, algemene AI; 2023, taalmodellen en
          beeldgeneratie) en Pizzinelli et al. (2023, complementariteit). Bewerking:
          DataFryslân. De complementariteitsscore is door DataFryslân zelf berekend aan
          de hand van de methode van Pizzinelli et al. (2023).
        </p>
      </details>
    </section>
  );
}
