import { EducationSourceList } from './EducationSources';

export function EducationAccountability() {
  return (
    <details className="methodology-disclosure" id="opleiding-beroep-verantwoording">
      <summary>Hoe koppelen wij opleidingen aan beroepen?</summary>
      <div className="methodology-disclosure-content">
        <h3>Hbo en wo · koppeling aan ISCO-08</h3>
        <p>
          Om inzicht te geven in de relatie tussen opleidingen en beroepen, koppelen wij
          Nederlandse hbo- en wo-opleidingen aan beroepsgroepen volgens de
          internationale ISCO-08-classificatie.
        </p>
        <p>
          Hiervoor gebruiken wij opleidings- en beroepsgegevens uit de
          Studiekeuzedatabase van Landelijk Centrum Studiekeuze.
        </p>
        <h4>Hoe werkt de koppeling?</h4>
        <p>Wij gebruiken twee onderwijsclassificaties:</p>
        <ul>
          <li>
            <strong>SOI:</strong> de Standaard Onderwijsindeling.
          </li>
          <li>
            <strong>ISCED:</strong> de internationale classificatie van onderwijs.
          </li>
        </ul>
        <p>
          Via deze classificaties zoeken wij naar beroepsgroepen die aan een opleiding
          gekoppeld kunnen worden.
        </p>
        <p>We onderscheiden twee soorten koppelingen:</p>
        <ul>
          <li>
            <strong>Directe koppelingen:</strong> beroepsgroepen die via SOI of ISCED
            overeenkomen met de opleiding, inclusief het opleidingsniveau.
          </li>
          <li>
            <strong>Afgeleide koppelingen:</strong> mogelijke beroepsgroepen die worden
            gevonden via een ander opleidingsniveau binnen dezelfde onderwijsrichting.
            Deze beschouwen wij als kandidaten en niet als directe koppelingen.
          </li>
        </ul>
        <p>Eén opleiding kan aan meerdere beroepsgroepen gekoppeld zijn.</p>
        <h4>Wat betekenen deze koppelingen?</h4>
        <p>
          De koppelingen geven een indicatie van de relatie tussen opleidingen en
          beroepsgroepen. Ze betekenen niet dat afgestudeerden automatisch voor ieder
          gekoppeld beroep gekwalificeerd zijn of daarin terechtkomen.
        </p>
        <p>
          Sommige koppelingen zijn breed of onzeker. Ook kan het voorkomen dat voor een
          opleiding geen geschikte beroepskoppeling beschikbaar is. Dit betekent niet
          dat de opleiding geen arbeidsmarktperspectief biedt.
        </p>
        <h3>Mbo · kwalificaties en geschatte beroepskoppelingen</h3>
        <p>
          Voor mbo koppelen we de officiële SBB-kwalificatienaam via de erkende
          opleidingscode (CREBO) en het schooljaar. Een kwalificatienaam is niet
          automatisch een ISCO-beroepsgroep.
        </p>
        <p>
          Aanvullende beroepskoppelingen gebruiken CompetentNL en ESCO. Dit zijn
          schattingen en onderzoeksvoorstellen van DataFryslân. Deze moeten nog worden
          gevalideerd.
        </p>
        <aside
          className="methodology-references"
          aria-labelledby="references-education-mappings"
        >
          <h3 id="references-education-mappings">Literatuurlijst</h3>
          <EducationSourceList />
          <p>
            De volledige technische verantwoording van de gebruikte classificaties,
            koppelregels en controles is op verzoek beschikbaar.
          </p>
          <p>
            De opleidingskoppelingen met ISCO voor hbo en wo en met CompetentNL-beroepen
            voor mbo worden uitsluitend op de website weergegeven en niet als CSV
            beschikbaar gesteld.
          </p>
        </aside>
      </div>
    </details>
  );
}
