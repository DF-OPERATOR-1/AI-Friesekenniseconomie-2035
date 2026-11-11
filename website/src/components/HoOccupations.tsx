export function HoSource() {
  return (
    <p className="source-caption">
      Bron:{' '}
      <a href="https://lcsk.nl/over-ons/studiekeuzedata-raadplegen/">
        Landelijk Centrum Studiekeuze — Studiekeuzedatabase, versie 26.6
      </a>
      . De koppelingen tussen opleidingen en ISCO-beroepen zijn door DataFryslân
      samengesteld.{' '}
      <a href="#methodologie/opleiding-beroep-verantwoording">Lees de verantwoording</a>
      .
    </p>
  );
}
export function HoOccupations({
  occupations,
  levels,
}: {
  occupations: { code: string; name: string; kind: string; degree: string }[];
  levels: string[];
}) {
  const matches = occupations.filter((o) =>
    levels.some((level) => level.toLowerCase() === o.degree),
  );
  const direct = new Set(matches.filter((o) => o.kind === 'DIRECT').map((o) => o.code));
  return (
    <>
      {matches.length === 0 && (
        <p>
          Voor deze opleiding is geen geschikte beroepskoppeling beschikbaar. Dit
          betekent niet dat de opleiding geen arbeidsmarktperspectief biedt.
        </p>
      )}
      {['DIRECT', 'KANDIDAAT'].map((kind) => {
        const rows = [
          ...new Map(
            matches
              .filter(
                (o) => o.kind === kind && (kind === 'DIRECT' || !direct.has(o.code)),
              )
              .map((o) => [o.code, o]),
          ).values(),
        ];
        return (
          rows.length > 0 && (
            <div key={kind}>
              <h3>
                {kind === 'DIRECT'
                  ? 'Directe koppelingen'
                  : 'Afgeleide koppelingen · kandidaten'}
              </h3>
              <ul className="education-occupation-list">
                {rows.map((o) => (
                  <li key={o.code}>
                    <a href={`#beroep/${o.code}`}>{o.name}</a>{' '}
                    <small>ISCO-08 {o.code}</small>
                  </li>
                ))}
              </ul>
            </div>
          )
        );
      })}
      <p>
        De koppelingen geven een indicatie. Afgestudeerden zijn niet automatisch voor
        ieder gekoppeld beroep gekwalificeerd en komen daar niet automatisch terecht.
        Afgeleide koppelingen zijn kandidaten via een ander opleidingsniveau binnen
        dezelfde onderwijsrichting.
      </p>
      <HoSource />
    </>
  );
}
