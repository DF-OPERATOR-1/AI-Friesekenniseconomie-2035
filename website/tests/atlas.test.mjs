import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const cache = new URL('../node_modules/.cache/atlas-tests/', import.meta.url);
await fs.mkdir(cache, { recursive: true });
for (const name of ['search', 'Atlas', 'TopicIcon', 'perceptualSelection']) {
  const component = ['TopicIcon', 'perceptualSelection'].includes(name);
  const source = await fs.readFile(
    new URL(
      `../src/${component ? 'components' : 'atlas'}/${name}.${['search', 'perceptualSelection'].includes(name) ? 'ts' : 'tsx'}`,
      import.meta.url,
    ),
    'utf8',
  );
  const output = ts
    .transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    })
    .outputText.replace("'./search'", "'./search.mjs'")
    .replace("'../components/TopicIcon'", "'./TopicIcon.mjs'")
    .replace("'../components/perceptualSelection'", "'./perceptualSelection.mjs'")
    .replace(
      /import (\w+) from '(.*?\.svg)';/g,
      (_, name, path) => `const ${name} = ${JSON.stringify(path)};`,
    );
  await fs.writeFile(new URL(`${name}.mjs`, cache), output);
}
const { searchProfiles, profileCode } = await import(new URL('search.mjs', cache));
const {
  Home,
  Occupations,
  Profile,
  Future,
  SpecificOccupationDetails,
  OccupationCategory,
} = await import(new URL('Atlas.mjs', cache));
const profiles = JSON.parse(
  await fs.readFile(new URL('../public/data/atlas/profiles.json', import.meta.url)),
);
const render = (component, props) =>
  renderToStaticMarkup(React.createElement(component, props));
test('zoeken op naam, ISCO en indicatorstatus', () => {
  const p = profiles.find((p) => p.ai_exposure.value !== null);
  assert.equal(searchProfiles(profiles, p.isco_code)[0].title, p.title);
  assert.ok(
    searchProfiles(profiles, p.title.toUpperCase()).some(
      (r) => r.isco_code === p.isco_code,
    ),
  );
  assert.equal(searchProfiles(profiles, 'onbestaand beroep xyz').length, 0);
  assert.ok(
    searchProfiles(profiles, '', 'both').every(
      (r) => r.ai_exposure.value !== null && r.ai_complementarity.value !== null,
    ),
  );
  assert.ok(
    searchProfiles(profiles, '', '', 'unavailable').every(
      (r) => r.data_status === 'unavailable',
    ),
  );
});
test('directe hashroute behoudt voorloopnul en weigert ongeldige codes', () => {
  assert.equal(profileCode('#beroep/0110'), '0110');
  assert.equal(profileCode('#beroep/110'), null);
  assert.equal(profileCode('#beroep/abcd'), null);
});
test('beroepspagina toont ontbrekende gegevens en teruglink', () => {
  const html = render(Profile, { code: '0110', profiles });
  assert.match(html, /Niet beschikbaar/);
  assert.match(html, /href="#invloed-ai"/);
});
test('onbekend beroep heeft herstelroute', () =>
  assert.match(render(Profile, { code: '9999', profiles }), /Beroep niet gevonden/));
test('home, lijst en toekomst renderen met echte profielen', () => {
  assert.match(render(Home, { profiles }), /Zoek op beroep/);
  assert.match(render(Occupations, { profiles }), /#beroep\/0110/);
  assert.match(render(Future), /Scenarioberekening/);
  assert.doesNotMatch(render(Future), /Openstaande vacatures|Ga naar Toekomst 2035/);
  assert.doesNotMatch(render(Future), /Onderzoeksagenda|fieldset|method-list/);
});
test('bestaande visualisaties bewaren filters, schalen en beroepslinks', async () => {
  for (const file of ['PerceptualChart', 'ExposureChart']) {
    const source = await fs.readFile(
      new URL(`../src/components/${file}.tsx`, import.meta.url),
      'utf8',
    );
    assert.match(source, /#beroep\//);
    if (file === 'PerceptualChart') assert.match(source, /<table/);
    else {
      assert.doesNotMatch(source, /<table/);
      assert.match(source, /accessibilityLayer=\{true\}/);
    }
    assert.match(source, /setQuery/);
  }
  const map = await fs.readFile(
    new URL('../src/components/PerceptualChart.tsx', import.meta.url),
    'utf8',
  );
  assert.match(map, /median\(complete/);
  assert.match(map, /exportSvg/);
});
test('homepage biedt direct echte beroepen aan zonder willekeurige resultatenlijst', () => {
  const html = render(Home, { profiles });
  assert.match(html, /Wat betekent AI/);
  assert.match(html, /role="search"/);
  assert.match(html, /#beroep\/2512/);
  assert.match(html, /Bekijk beroep/);
  assert.doesNotMatch(html, /ISCO-08 0110/);
});
test('profiel toont AI-scores met mediaan, Hoog/Laag en vereenvoudigde context', () => {
  const row = profiles.find((p) => p.isco_code === '2512');
  const html = render(Profile, { code: row.isco_code, profiles });
  assert.match(html, /score-grid/);
  assert.ok(
    html.includes(
      row.ai_exposure.value.toLocaleString('nl-NL', { maximumFractionDigits: 3 }),
    ),
  );
  assert.ok(
    html.includes(
      row.ai_complementarity.value.toLocaleString('nl-NL', {
        maximumFractionDigits: 3,
      }),
    ),
  );

  assert.match(html, /Hoog|Laag|Op de mediaan/);
  assert.match(html, /Mediaan:/);
  assert.doesNotMatch(html, /Berekend|Hoe zijn deze scores berekend|Beroepsprofiel ·/);
  assert.doesNotMatch(
    html,
    /Bronnen en beperkingen|Bron en berekening|BRC 2014-beroepsgroep|De beschikbare cijfers|De bronnen worden stapsgewijs/,
  );
  assert.doesNotMatch(
    html,
    /Arbeidsmarkt in Fryslân|Ga naar Toekomst 2035|Vooruitblik|Openstaande vacatures/,
  );
  assert.match(html, /Welke beroepen vallen onder deze beroepsgroep/);
  assert.match(html, /Regionale context/);
  assert.match(html, /Aantal studenten en afgestudeerden/);
  assert.match(html, /Aantal werkenden en leeftijdsopbouw/);
  assert.ok(
    html.indexOf('Welke beroepen vallen onder deze beroepsgroep') <
      html.indexOf('Regionale context'),
  );
});

test('beroepsinhoud en ontbrekende scores zijn zichtbaar zonder scores te verzinnen', () => {
  const list = render(Occupations, { profiles });
  assert.match(list, /Vind een beroep/);
  assert.match(list, /occupation-table/);
  assert.match(list, /AI-exposure/);
  assert.match(list, /Complementariteit/);
  assert.doesNotMatch(list, /Filter op beschikbaarheid|<select/);
  assert.match(list, /occupation-status is-present/);
  assert.match(list, /occupation-status is-missing/);
  const missing = profiles.find((p) => p.ai_exposure.value === null);
  const html = render(Profile, { code: missing.isco_code, profiles });
  assert.match(html, /Niet beschikbaar/);
  const withContent = profiles.find(
    (p) => p.description.value && p.tasks.value && p.skills.value,
  );
  const content = render(Profile, { code: withContent.isco_code, profiles });
  assert.match(content, /Welke beroepen vallen onder deze beroepsgroep/);
  assert.match(content, /Beroepen laden/);
  assert.ok(
    profiles.every(
      (p) => p.knowledge_areas.value === null && p.vacancies.value === null,
    ),
  );
});

test('specifieke beroepen hebben eigen definities, taken en vaardigheden', async () => {
  const members = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/occupations/2512.json', import.meta.url),
    ),
  );
  assert.ok(members.length > 1);
  assert.equal(new Set(members.map((m) => m.uri)).size, members.length);
  assert.ok(
    members.every(
      (m) =>
        m.name &&
        typeof m.description === 'string' &&
        Array.isArray(m.tasks) &&
        Array.isArray(m.skills),
    ),
  );
  assert.ok(new Set(members.map((m) => JSON.stringify(m.tasks))).size > 1);
  const source = await fs.readFile(
    new URL('../src/atlas/Atlas.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /setSelected\(event.target.value\)/);
});

test('beroepsdetails groeperen bronwaarden, tonen taakdefinities en vermelden CompetentNL', () => {
  const item = (name, importance, description = '') => ({
    uri: name,
    name,
    importance,
    description,
    code: '',
  });
  const html = render(SpecificOccupationDetails, {
    member: {
      uri: 'test',
      name: 'Testberoep',
      description: 'Definitie van het beroep',
      tasks: [
        item('Kerntaak', 'essentieel', 'Uitleg kerntaak'),
        item('Aanvullende taak', 'optioneel', 'Uitleg extra taak'),
      ],
      skills: [
        item('Kernvaardigheid', 'essentieel'),
        item('Belangrijke vaardigheid', 'belangrijk'),
        item('Aanvullende vaardigheid', 'enigszins'),
      ],
    },
  });
  for (const level of ['Essentieel', 'Optioneel', 'Belangrijk', 'Enigszins belangrijk'])
    assert.ok(html.includes(level));
  assert.match(html, /<span>Kerntaak<\/span>/);
  assert.match(html, /task-blocks/);
  assert.match(html, /Uitleg kerntaak/);
  assert.match(html, /Uitleg extra taak/);
  const profile = render(Profile, { code: profiles[0].isco_code, profiles });
  assert.equal((profile.match(/Bron: CompetentNL/g) || []).length, 1);
  assert.match(profile, /creativecommons.org/);
  assert.match(profile, /Bewerkt/);
});

test('vaardighedencategorie toont zes items in bronvolgorde en een toegankelijke uitklapknop', () => {
  const entries = Array.from({ length: 9 }, (_, i) => ({
    uri: `skill-${i}`,
    name: `Vaardigheid ${i}`,
    importance: 'essentieel',
    description: '',
    code: '',
  }));
  const html = render(OccupationCategory, { entries, label: 'Essentieel' });
  assert.equal((html.match(/<li/g) || []).length, 6);
  for (let i = 0; i < 6; i++) assert.ok(html.includes(`Vaardigheid ${i}`));
  assert.ok(!html.includes('Vaardigheid 6'));
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="[^"]+"/);
  assert.match(html, /Toon alle vaardigheden/);
  assert.ok(html.indexOf('Vaardigheid 0') < html.indexOf('Vaardigheid 5'));
  const short = render(OccupationCategory, {
    entries: entries.slice(0, 3),
    label: 'Essentieel',
  });
  assert.doesNotMatch(short, /Toon alle vaardigheden/);
});
test('profiel heeft drie hoofdsecties en bewaart ontbrekende scores zonder nulschaal', () => {
  const missing = profiles.find(
    (p) => p.ai_exposure.value === null && p.ai_complementarity.value === null,
  );
  const html = render(Profile, { code: missing.isco_code, profiles });
  assert.match(html, /Wat voor invloed heeft AI op dit beroep/);
  assert.match(html, /Welke beroepen vallen onder deze beroepsgroep/);
  assert.match(html, /Regionale context/);
  assert.doesNotMatch(html, /role="meter"/);
  assert.doesNotMatch(html, /Hoe zijn deze scores berekend/);
  assert.doesNotMatch(html, /Toekomst 2035/);
  const details = render(SpecificOccupationDetails, {
    member: { uri: 'empty', name: 'Leeg', description: '', tasks: [], skills: [] },
  });
  assert.match(details, /Voor dit beroep zijn nog geen taken beschikbaar/);
});

test('voorbeelden van werkzaamheden krijgen een eigen kop zonder brontekst te verliezen', () => {
  const html = render(SpecificOccupationDetails, {
    member: {
      uri: 'example',
      name: 'Voorbeeld',
      description:
        'Geeft leiding. Voorbeelden van werkzaamheden: bewaakt de groei, onderhoudt contacten.',
      tasks: [],
      skills: [],
    },
  });
  assert.match(html, /<p>Geeft leiding.<\/p>/);
  assert.match(html, /<h3>Voorbeelden van werkzaamheden<\/h3>/);
  assert.match(html, /<p>Bewaakt de groei, onderhoudt contacten.<\/p>/);
});

test('taken staan in één categorieblok met uitklapbare rijen zonder lijstmarkeringen', () => {
  const entries = Array.from({ length: 8 }, (_, i) => ({
    uri: `task-${i}`,
    name: `Taak ${i}`,
    description: `Uitleg ${i}`,
    importance: 'essentieel',
    code: '',
  }));
  const html = render(OccupationCategory, {
    entries,
    label: 'Essentieel',
    kind: 'tasks',
  });
  assert.doesNotMatch(html, /<ul|<li/);
  assert.equal((html.match(/<details/g) || []).length, 6);
  assert.match(html, /Toon alle taken/);
  assert.equal((html.match(/task-category-panel/g) || []).length, 1);
  assert.doesNotMatch(html, /task-column|grid-template-columns/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Uitleg 0/);
});
