import { FooterBrand, BrandArtwork } from './components/BrandLogo';
import { AIInfluence } from './components/AIInfluence';
import { ResearchDownloads } from './components/ResearchDownloads';
import { ScenarioExplorer } from './components/ScenarioExplorer';
import { Education } from './components/Education';
import { Navigation } from './components/Navigation';
import { useEffect, useState } from 'react';
import { Home, Occupations, Profile, useProfiles } from './atlas/Atlas';
import { profileCode, profileOccupation } from './atlas/search';
import { navigation } from './content/nl';
import { SectionHeading } from './components/ui';
import { Methodology } from './components/Methodology';
import { repositoryUrl } from './content/nl';
function currentTab(route: string) {
  const hash = route.slice(1).split('?')[0];
  if (
    [
      'verkenner',
      'perceptuele-kaart',
      'invloed-ai',
      'invloed-ai/exposure',
      'invloed-ai/gebruik',
    ].includes(hash)
  )
    return 'invloed-ai';
  if (hash.startsWith('methodologie/')) return 'methodologie';
  if (hash.startsWith('open-data/')) return 'open-data';
  if (profileCode(route)) return 'beroep';
  if (hash.startsWith('beroep/')) return 'onbekend';
  if (hash.startsWith('opleiding/')) return 'opleidingen';
  return navigation.some((item) => item.href === `#${hash}`)
    ? hash
    : hash === 'indicatoren'
      ? 'methodologie'
      : hash === 'perceptuele-kaart'
        ? hash
        : hash === 'over'
          ? hash
          : hash
            ? 'onbekend'
            : 'home';
}
export function App() {
  const { profiles, error, loading } = useProfiles();
  const [route, setRoute] = useState(window.location.hash);
  const activeTab = currentTab(route);
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === '#main') return;
      setRoute(window.location.hash);
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const match = /^#(?:methodologie|open-data)\/([a-z0-9-]+)$/.exec(route);
      const target = match ? document.getElementById(match[1]) : null;
      document.getElementById('main')?.focus({ preventScroll: true });
      if (target) {
        if (target instanceof HTMLDetailsElement) target.open = true;
        for (let parent = target.parentElement; parent; parent = parent.parentElement) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
        }
        target.scrollIntoView({ block: 'start', behavior: 'instant' });
      } else window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [route, activeTab]);
  return (
    <>
      <a className="skip-link" href="#main">
        Direct naar inhoud
      </a>
      <Navigation
        activeTab={activeTab === 'beroep' ? 'beroepen' : activeTab}
        route={route}
      />
      <main id="main" tabIndex={-1} className="tab-main">
        {error && (
          <p className="container" role="alert">
            Beroepsgegevens konden niet worden geladen. Vernieuw de pagina.
          </p>
        )}
        {loading && ['home', 'beroepen', 'beroep'].includes(activeTab) && (
          <p className="container" role="status">
            Beroepen laden…
          </p>
        )}
        {activeTab === 'home' && <Home profiles={profiles} />}
        {activeTab === 'beroepen' && <Occupations profiles={profiles} />}
        {activeTab === 'beroep' && !loading && !error && (
          <Profile
            code={profileCode(route)!}
            profiles={profiles}
            occupationName={profileOccupation(route)}
          />
        )}
        {activeTab === 'opleidingen' && <Education route={route} />}
        {activeTab === 'toekomst' && <ScenarioExplorer profiles={profiles} />}
        {activeTab === 'onbekend' && (
          <section className="container section">
            <h1>Pagina niet gevonden</h1>
            <a href="#beroepen">Bekijk de beroepenatlas</a>
          </section>
        )}
        {activeTab === 'invloed-ai' && (
          <AIInfluence exposure={route === '#invloed-ai/exposure'} />
        )}
        {activeTab === 'methodologie' && <Methodology />}
        {activeTab === 'open-data' && <ResearchDownloads />}
        {activeTab === 'over' && (
          <>
            <section className="container section about branded-about" id="over">
              <div>
                <SectionHeading
                  eyebrow="Over AI Index Fryslân"
                  title="Onderzoek toegankelijk maken."
                >
                  Dit platform wordt ontwikkeld om de mogelijke impact van AI op de
                  Friese arbeidsmarkt begrijpelijk en controleerbaar te maken voor
                  onderzoekers, beleidsmakers en iedereen die geïnteresseerd is in de
                  toekomst van werk.
                </SectionHeading>
                <p>
                  Deze versie ontsluit de bestaande beroepsscores, eigen berekeningen en
                  DUO-onderwijsselecties. Verdere regionale koppelingen en analyses
                  worden stapsgewijs toegevoegd. AI Index Fryslân is een project van
                  DataFryslân. De licenties voor code en datasets worden nog
                  vastgesteld.
                </p>
              </div>
              <BrandArtwork />
            </section>
          </>
        )}
      </main>
      <footer>
        <div className="container footer-inner">
          <a
            className="footer-brand-link"
            href="#home"
            aria-label="DataFryslân — naar de homepage"
          >
            <FooterBrand />
          </a>
          <a href={repositoryUrl}>GitHub</a>
        </div>
      </footer>
    </>
  );
}
