import { lazy, Suspense } from 'react';
import { PerceptualFramework } from './PerceptualFramework';

const ExposureChart = lazy(() =>
  import('./ExposureChart').then((module) => ({ default: module.ExposureChart })),
);
export function AIInfluence({ exposure = false }: { exposure?: boolean }) {
  return (
    <div className="ai-influence-page">
      <section
        className="influence-detail"
        id="influence-detail"
        tabIndex={-1}
        aria-label="Verdieping bij de perceptuele kaart"
      >
        <div hidden={exposure}>
          <PerceptualFramework />
        </div>
        <div hidden={!exposure}>
          <section
            className="explorer-section section influence-exposure"
            id="exposure"
            aria-labelledby="exposure-heading"
          >
            <div className="container">
              <div className="section-heading exposure-heading">
                <p className="eyebrow">AI-exposure score</p>
                <h2 id="exposure-heading">AI-exposure per beroep</h2>
                <p>
                  AI-exposure geeft aan in hoeverre de vaardigheden van een beroep
                  overlappen met de mogelijkheden van AI: hoe hoger de score, hoe groter
                  de overlap. De scores zijn relatieve indices, geen percentages, en
                  zeggen niet of AI het werk ondersteunt of vervangt.
                </p>
              </div>
              <Suspense fallback={<p role="status">AI-exposuregrafiek laden…</p>}>
                <ExposureChart />
              </Suspense>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
