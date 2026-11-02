import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const source = await fs.readFile(
  new URL('../src/components/perceptualSelection.ts', import.meta.url),
  'utf8',
);
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { selectMapRows, pointAppearance, mapExposureRows, interpretMapPoint } =
  await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const rows = JSON.parse(
  await fs.readFile(
    new URL('../public/data/research/occupations.json', import.meta.url),
  ),
).rows;

test('zoeken houdt alle kaartpunten en markeert alleen overeenkomende beroepen', () => {
  const original = selectMapRows(rows, '', '');
  const searched = selectMapRows(rows, '2512', '');
  assert.deepEqual(searched.visible, original.visible);
  assert.deepEqual(
    searched.highlighted.map((row) => row.code),
    ['2512'],
  );
  assert.ok(searched.searching);
  assert.ok(searched.matchedCodes.has('2512'));
});
test('zoeken op naam, geen resultaten en ontbrekende scores houden de context', () => {
  const original = selectMapRows(rows, '', '');
  for (const query of ['VERPLEEGKUND', 'geen-bestaand-beroep-xyz', '0110']) {
    assert.deepEqual(selectMapRows(rows, query, '').visible, original.visible);
  }
  assert.equal(
    selectMapRows(rows, 'geen-bestaand-beroep-xyz', '').highlighted.length,
    0,
  );
  const missing = selectMapRows(rows, '0110', '');
  assert.equal(missing.matches.length, 1);
  assert.equal(missing.highlighted.length, 0);
});
test('hoofdgroepfilter blijft werken en wissen van de zoekterm herstelt standaardweergave', () => {
  const scoped = selectMapRows(rows, '2512', '2');
  assert.ok(scoped.visible.every((row) => row.code.startsWith('2')));
  const reset = selectMapRows(rows, '  ', '2');
  assert.equal(reset.searching, false);
  assert.deepEqual(reset.highlighted, reset.visible);
});

test('gevonden, geselecteerde en aangewezen punten zijn onafhankelijk herkenbaar', () => {
  const flags = { found: false, selected: false, hovered: false, searching: true };
  const found = pointAppearance({ ...flags, found: true });
  const selected = pointAppearance({ ...flags, selected: true });
  const hovered = pointAppearance({ ...flags, hovered: true });
  assert.notEqual(found.fill, selected.fill);
  assert.notEqual(found.fill, hovered.fill);
  assert.equal(
    pointAppearance({ ...flags, found: true, hovered: true }).fill,
    found.fill,
  );
  assert.equal(
    pointAppearance({ ...flags, selected: true, hovered: true }).fill,
    selected.fill,
  );
  assert.equal(
    pointAppearance({ ...flags, found: true, selected: true }).fill,
    selected.fill,
  );
  assert.notEqual(hovered.stroke, found.stroke);
  assert.ok(hovered.strokeWidth > found.strokeWidth);
});

test('tabel volgt zoeken, hoofdgroep en beroepsselectie terwijl de kaart haar context behoudt', () => {
  const all = selectMapRows(rows, '', '');
  assert.equal(all.tableRows.length, rows.length);
  const selected = selectMapRows(rows, '', '2', '2512');
  assert.deepEqual(
    selected.tableRows.map((row) => row.code),
    ['2512'],
  );
  assert.deepEqual(selected.visible, selectMapRows(rows, '', '2').visible);
  assert.deepEqual(
    selectMapRows(rows, '2512', '').tableRows.map((row) => row.code),
    ['2512'],
  );
  assert.ok(
    selectMapRows(rows, '', '2').tableRows.every((row) => row.code.startsWith('2')),
  );
  assert.equal(selectMapRows(rows, '2512', '1').tableRows.length, 0);
  assert.equal(selectMapRows(rows, 'geen-bestaand-beroep-xyz', '').tableRows.length, 0);
  assert.equal(selectMapRows(rows, '0110', '').tableRows[0].raw, null);
});

test('kaartvarianten gebruiken de bestaande scores zonder herschalen of mutatie', () => {
  const before = JSON.stringify(rows);
  for (const variant of ['raw', 'language', 'image']) {
    const mapped = mapExposureRows(rows, variant);
    assert.equal(mapped.length, rows.length);
    for (let i = 0; i < rows.length; i++) {
      assert.equal(mapped[i].raw, rows[i][variant]);
      assert.equal(mapped[i].complementarity, rows[i].complementarity);
      assert.equal(mapped[i].code, rows[i].code);
    }
    const complete = mapped.filter(
      (row) => row.raw !== null && row.complementarity !== null,
    );
    assert.deepEqual(selectMapRows(mapped, '', '').visible, complete);
    assert.deepEqual(selectMapRows(mapped, '2512', '').visible, complete);
    assert.deepEqual(
      selectMapRows(mapped, '2512', '', '2512').tableRows.map((r) => r.raw),
      [rows.find((r) => r.code === '2512')[variant]],
    );
  }
  assert.equal(JSON.stringify(rows), before);
  assert.notDeepEqual(
    mapExposureRows(rows, 'raw').map((r) => r.raw),
    mapExposureRows(rows, 'language').map((r) => r.raw),
  );
});

test('scrollbare tabel toont zoekresultaten naast het geselecteerde beroep', () => {
  const result = selectMapRows(rows, '2221', '', '2512');
  assert.deepEqual(result.tableRows.map((row) => row.code).sort(), ['2221', '2512']);
  assert.equal(selectMapRows(rows, '2512', '', '2512').tableRows.length, 1);
  assert.deepEqual(
    selectMapRows(rows, 'onbekend-xyz', '', '2512').tableRows.map((row) => row.code),
    ['2512'],
  );
  assert.ok(
    selectMapRows(rows, '2221', '2', '2512').tableRows.every((row) =>
      row.code.startsWith('2'),
    ),
  );
});

test('de vier kwadrantnamen blijven behouden met de bestaande toegankelijke toelichting', () => {
  const cases = [
    [
      2,
      2,
      'Potentieel productiviteitswinst',
      'AI kan helpen om bepaalde werkzaamheden sneller of gemakkelijker uit te voeren.',
    ],
    [
      2,
      0,
      'Hoger substitutierisico',
      'AI kan mogelijk een groter deel van de werkzaamheden in dit beroep overnemen. Er zijn relatief minder kenmerken die erop wijzen dat AI vooral als ondersteuning wordt ingezet. Dit betekent niet automatisch dat banen verdwijnen.',
    ],
    [
      0,
      2,
      'Complementair potentieel',
      'AI kan in dit beroep veel werkzaamheden ondersteunen. Tegelijkertijd blijft de menselijke rol belangrijk, bijvoorbeeld bij het nemen van beslissingen, het dragen van verantwoordelijkheid of persoonlijk contact.',
    ],
    [
      0,
      0,
      'Beperkte directe AI-impact',
      'De werkzaamheden in dit beroep sluiten minder sterk aan bij wat AI momenteel kan. Daardoor lijkt de directe invloed van AI op dit beroep relatief beperkt.',
    ],
  ];
  for (const [raw, complementarity, title, text] of cases) {
    assert.deepEqual(interpretMapPoint({ raw, complementarity }, 1, 1), {
      title,
      text,
    });
  }
  assert.equal(interpretMapPoint(undefined, 1, 1), null);
  assert.equal(
    interpretMapPoint({ raw: 1, complementarity: 2 }, 1, 1).title,
    'Op een scheidslijn',
  );
  assert.equal(
    interpretMapPoint({ raw: 2, complementarity: 1 }, 1, 1).title,
    'Op een scheidslijn',
  );
});

test('aantallen onderscheiden getoonde punten van ontbrekende zoekresultaten voor elke variant', () => {
  for (const variant of ['raw', 'language', 'image']) {
    const mapped = mapExposureRows(rows, variant);
    const complete = mapped.filter((r) => r.raw !== null && r.complementarity !== null);
    const all = selectMapRows(mapped, '', '');
    assert.equal(all.visible.length, complete.length);
    assert.equal(
      all.matches.length - all.highlighted.length,
      mapped.length - complete.length,
    );
    const missing = selectMapRows(mapped, '0110', '');
    assert.equal(missing.visible.length, complete.length);
    assert.equal(missing.highlighted.length, 0);
    assert.equal(missing.matches.length - missing.highlighted.length, 1);
    const found = selectMapRows(mapped, '2512', '');
    assert.equal(found.highlighted.length, 1);
    assert.equal(found.matches.length - found.highlighted.length, 0);
    const group = selectMapRows(mapped, '', '2');
    assert.equal(
      group.visible.length + group.matches.length - group.highlighted.length,
      mapped.filter((r) => r.code.startsWith('2')).length,
    );
  }
});
