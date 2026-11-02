import { FooterBrand, BrandArtwork } from './components/BrandLogo';
import { AIInfluence } from './components/AIInfluence';
import { ResearchDownloads } from './components/ResearchDownloads';
import { Navigation } from './components/Navigation';
import { useEffect, useState } from 'react';
import { Home, Occupations, Profile, Future, useProfiles } from './atlas/Atlas';
import { profileCode } from './atlas/search';
import { navigation } from './content/nl';
import { SectionHeading } from './components/ui';
import { Methodology } from './components/Methodology';
import { repositoryUrl } from './content/nl';
function currentTab() {
  const hash = window.location.hash.slice(1);
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
  if (profileCode(window.location.hash)) return 'beroep';
  if (hash.startsWith('beroep/')) return 'onbekend';
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
  const [activeTab, setActiveTab] = useState(currentTab);
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === '#main') return;
      setActiveTab(currentTab());
      setRoute(window.location.hash);
      // Move to the top of the selected view without smooth scrolling.
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.getElementById('main')?.focus({ preventScroll: true });
      });
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
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
          <Profile code={profileCode(route)!} profiles={profiles} />
        )}
        {activeTab === 'toekomst' && <Future />}
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
