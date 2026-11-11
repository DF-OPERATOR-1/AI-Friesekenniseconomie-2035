import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const cache = new URL('../node_modules/.cache/atlas-tests/', import.meta.url);
await fs.mkdir(cache, { recursive: true });
for (const name of [
  'search',
  'Atlas',
  'TopicIcon',
  'EducationSourceTable',
  'perceptualSelection',
  'MboMatches',
  'HoCourses',
  'OccupationCourses',
  'nationalHoCourses',
  'HoOccupations',
]) {
  const component = [
    'EducationSourceTable',
    'TopicIcon',
    'perceptualSelection',
    'MboMatches',
    'HoCourses',
    'HoOccupations',
    'OccupationCourses',
    'nationalHoCourses',
  ].includes(name);
  const source = await fs.readFile(
    new URL(
      `../src/${component ? 'components' : 'atlas'}/${name}.${['search', 'perceptualSelection', 'nationalHoCourses'].includes(name) ? 'ts' : 'tsx'}`,
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
    .replace("'../components/EducationSourceTable'", "'./EducationSourceTable.mjs'")
    .replace("'../components/TopicIcon'", "'./TopicIcon.mjs'")
    .replace("'../components/OccupationCourses'", "'./OccupationCourses.mjs'")
    .replace("'./nationalHoCourses'", "'./nationalHoCourses.mjs'")
    .replace("'./HoCourses'", "'./HoCourses.mjs'")
    .replace("'./MboMatches'", "'./MboMatches.mjs'")
    .replace("'../components/HoCourses'", "'./HoCourses.mjs'")
    .replace("'./HoOccupations'", "'./HoOccupations.mjs'")
    .replace("'../components/MboMatches'", "'./MboMatches.mjs'")
    .replaceAll('import.meta.env.BASE_URL', "'/'")
    .replace("'../components/perceptualSelection'", "'./perceptualSelection.mjs'")
    .replace(
      /import (\w+) from '(.*?\.svg)';/g,
      (_, name, path) => `const ${name} = ${JSON.stringify(path)};`,
    );
  await fs.writeFile(new URL(`${name}.mjs`, cache), output);
}
const { searchProfiles, profileCode } = await import(new URL('search.mjs', cache));
const { Home, Occupations, Profile, SpecificOccupationDetails, OccupationCategory } =
  await import(new URL('Atlas.mjs', cache));
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
test('home en lijst renderen met echte profielen', () => {
  assert.match(render(Home, { profiles }), /Zoek op beroep/);
  assert.match(render(Occupations, { profiles }), /#beroep\/0110/);
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
  assert.doesNotMatch(html, /Aantal studenten en afgestudeerden/);
  assert.match(html, /Welke opleidingen sluiten aan bij deze beroepsgroep/);
  const sectionLabels = [
    ...html.matchAll(
      /<p class="eyebrow">(Invloed van AI|Opleidingen|Werkzaamheden)<\/p>/g,
    ),
  ].map((match) => match[1]);
  assert.deepEqual(sectionLabels, ['Invloed van AI', 'Opleidingen', 'Werkzaamheden']);
  assert.ok(
    html.indexOf('Welke opleidingen sluiten aan') <
      html.indexOf('Welke beroepen vallen onder'),
  );
  assert.match(html, /href="#methodologie\/opleiding-beroep-verantwoording"/);
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
  assert.match(list, /AI-blootstelling/);
  assert.match(list, /Complementariteit/);
  assert.doesNotMatch(list, /Filter op beschikbaarheid/);
  assert.match(list, /Per pagina/);
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
  assert.ok(profiles.every((p) => p.vacancies.value === null));
  assert.ok(profiles.some((p) => p.knowledge_areas.value?.length > 0));
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
        Array.isArray(m.skills) &&
        Array.isArray(m.knowledge_areas),
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
      knowledge_areas: [item('Testkennisgebied', 'essentieel', 'Uitleg kennisgebied')],
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
  assert.match(html, /Kennisgebieden/);
  assert.match(html, /Testkennisgebied/);
  assert.match(html, /Uitleg kennisgebied/);
  assert.equal((html.match(/Bron: CompetentNL/g) || []).length, 1);
  assert.match(html, /creativecommons.org/);
  assert.match(html, /Bewerkt/);
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

test('ESCO-aanvulling heeft herkenbare bron en geen verzonnen takenlijst', async () => {
  const row = profiles.find((p) => p.content_source === 'ESCO');
  assert.ok(row);
  assert.equal(row.content_version, '1.2.1');

  const members = JSON.parse(
    await fs.readFile(
      new URL(
        `../public/data/atlas/occupations/${row.isco_code}.json`,
        import.meta.url,
      ),
    ),
  );
  const html = render(SpecificOccupationDetails, { member: members[0] });
  assert.match(html, /geen afzonderlijke takenlijst/);
  assert.match(
    html,
    /This service uses the ESCO classification of the European Commission/,
  );
  assert.match(html, /<h3>Taken<\/h3>/);
  assert.match(html, /Niet beschikbaar/);
});

test('zeven CBS-groepen tonen bron, beperking en uitsluitend beschikbare AI-scores', () => {
  const codes = ['1113', '4414', '6310', '6320', '6330', '6340', '9624'];
  assert.deepEqual(
    profiles
      .filter((p) => p.cbs_relevance)
      .map((p) => p.isco_code)
      .sort(),
    codes,
  );
  for (const code of codes) {
    const row = profiles.find((p) => p.isco_code === code);
    const html = render(Profile, { code, profiles });
    assert.equal(row.member_count, 0);
    assert.match(html, /Beperkte gegevens beschikbaar/);
    assert.match(html, /Het CBS beschouwt deze beroepsgroep als niet relevant/);
    assert.ok(html.includes(`href="${row.cbs_relevance.source_url}"`));
    assert.match(html, /CBS, Codelijsten en beroepenindex ISCO 2008/);
    assert.match(html, /uitstroom op de arbeidsmarkt/);
    assert.match(html, /AI-blootstelling/);
    assert.doesNotMatch(
      html,
      /Bron: CompetentNL|Beroepen laden|Opleidingen verkennen|Welke opleidingen sluiten aan|profile-education-section|<h2>Regionale context/,
    );
  }
});

test('ESCO toont Nederlandse brontekst en gedeelde competentiekaarten zonder brondata te wijzigen', () => {
  const row = profiles.find((p) => p.content_source === 'ESCO');
  const page = render(Profile, { code: row.isco_code, profiles });
  assert.doesNotMatch(page, /Officiële ESCO-bronvermelding/);
  const member = {
    uri: 'esco:example',
    name: 'voorbeeld',
    source: 'ESCO',
    description: 'Een beroepsomschrijving.',
    tasks: [],
    skills: [
      {
        uri: 's',
        name: 'selectie uitvoeren',
        importance: 'essentieel',
        description: 'selecteert geschikte materialen.',
        code: '',
      },
    ],
    knowledge_areas: [
      {
        uri: 'k',
        name: 'materiaalkennis',
        importance: 'optioneel',
        description: 'kennis van materialen.',
        code: '',
      },
    ],
  };
  const before = JSON.stringify(member);
  const html = render(SpecificOccupationDetails, { member });
  assert.match(html, /Selectie uitvoeren/);
  assert.match(html, /Nederlandstalige classificatie/);
  assert.match(html, /<span lang="en">This service uses the ESCO classification/);
  assert.match(html, /Materiaalkennis/);
  assert.match(html, /Selecteert geschikte materialen/);
  assert.match(html, /Klik op een vaardigheid voor de toelichting/);
  assert.match(html, /Klik op een kennisgebied voor de toelichting/);
  assert.match(html, /competency-category-panel/);
  assert.match(html, /Essentieel/);
  assert.match(html, /Optioneel/);
  assert.match(html, /Niet beschikbaar/);
  assert.equal(JSON.stringify(member), before);
});

test('werkzaamheden toont de keuze-instructie als ondertitel en bron tussen voorbeelden en taken', () => {
  for (const source of ['ESCO', 'CompetentNL']) {
    const row = profiles.find((p) => p.content_source === source);
    const profile = render(Profile, { code: row.isco_code, profiles });
    assert.match(
      profile,
      /Welke beroepen vallen onder deze beroepsgroep\?<\/h2><p class="profile-section-intro">Kies hieronder/,
    );
    assert.doesNotMatch(profile, /class="competent-source"/);
    const html = render(SpecificOccupationDetails, {
      member: {
        uri: 'source-test',
        name: 'Testberoep',
        source,
        source_version: '1.2.1',
        description: 'Omschrijving. Voorbeelden van werkzaamheden: voorbeeldtaak.',
        tasks: [],
        skills: [],
      },
    });
    assert.ok(
      html.indexOf('Voorbeelden van werkzaamheden') <
        html.indexOf('class="competent-source"'),
    );
    assert.ok(
      html.indexOf('class="competent-source"') < html.indexOf('<h3>Taken</h3>'),
    );
    assert.equal((html.match(/class="competent-source"/g) ?? []).length, 1);
    if (source === 'ESCO') {
      assert.match(html, /<strong>Bron:<\/strong> Europese Commissie/);
      assert.match(html, /ESCO v1.2.1/);
    } else {
      assert.match(html, /Bron: CompetentNL/);
      assert.match(html, /creativecommons.org/);
    }
  }
});

const { coursesForOccupation, HoCourseList } = await import(
  new URL('HoCourses.mjs', cache)
);
const hoCourse = (code, type, occupations, levels = ['bachelor']) => ({
  code,
  education_type: type,
  name: `Opleiding ${code}`,
  years: {
    2024: { names: ['Oude naam'], levels: ['master'] },
    2025: { names: [`Opleiding ${code}`], levels },
  },
  occupations,
});
test('beroepsgroep toont unieke hbo/wo-opleidingen met passende graad en behoudt kandidaten apart', () => {
  const relation = (kind, degree = 'bachelor', code = '2422') => ({
    code,
    kind,
    degree,
  });
  const courses = [
    hoCourse('12345', 'hbo', [
      relation('KANDIDAAT'),
      relation('DIRECT'),
      relation('DIRECT'),
    ]),
    hoCourse('54321', 'wo', [relation('KANDIDAAT')]),
    hoCourse('99999', 'mbo', [relation('DIRECT')]),
    hoCourse('88888', 'wo', [relation('DIRECT', 'master')]),
    hoCourse('77777', 'hbo', [relation('DIRECT', 'bachelor', '0110')]),
  ];
  const links = coursesForOccupation(courses, '2422');
  assert.deepEqual(
    links.map((l) => [l.code, l.kind, l.year]),
    [
      ['12345', 'DIRECT', '2025'],
      ['54321', 'KANDIDAAT', '2025'],
    ],
  );
  const html = renderToStaticMarkup(
    React.createElement(HoCourseList, { courses, isco: '2422' }),
  );
  assert.match(html, /#opleiding\/hbo\/12345\/2025/);
  assert.match(html, /#opleiding\/wo\/54321\/2025/);
  assert.match(html, /Directe koppelingen/);
  assert.match(html, /Afgeleide koppelingen/);
  assert.doesNotMatch(html, /99999|88888|77777/);
});
test('ontbrekende opleidingskoppeling is geen uitspraak over opleidingsmogelijkheden', () => {
  const html = renderToStaticMarkup(
    React.createElement(HoCourseList, { courses: [], isco: '0110' }),
  );
  assert.match(html, /Dit betekent niet dat er geen passende opleiding bestaat/);
  assert.match(html, /mbo-opleidingen kunnen aansluiten/);
});

const { OccupationCourseContent, mboCoursesForOccupation } = await import(
  new URL('OccupationCourses.mjs', cache)
);
const mboRelation = (changes = {}) => ({
  code: '25132',
  course_name: '(Junior) accountmanager',
  years: ['2024', '2025'],
  occupation_uri: 'https://example.org/accountmanager',
  occupation: 'Accountmanager',
  isco: '2422',
  status: 'Voorstel',
  source: 'CompetentNL',
  score: 72,
  note: 'Voorlopige onderbouwing',
  method: 'Onderzoeksvoorstel',
  ...changes,
});
test('gekoppelde opleidingen hebben één sectie, drie vaste niveaus en tellingen zonder dubbele opleidingen', () => {
  const relation = (kind) => ({ code: '2422', kind, degree: 'bachelor' });
  const courses = [
    {
      ...hoCourse('12345', 'hbo', [relation('DIRECT'), relation('KANDIDAAT')]),
      years: { 2025: { names: ['Bedrijfskunde'], levels: ['bachelor'] } },
    },
    {
      ...hoCourse('54321', 'wo', [relation('KANDIDAAT')]),
      years: { 2025: { names: ['Bestuurskunde'], levels: ['bachelor'] } },
    },
  ];
  const input = [
    mboRelation(),
    mboRelation({
      occupation_uri: 'https://example.org/adviseur',
      occupation: 'Adviseur',
    }),
    mboRelation(),
  ];
  const before = JSON.stringify({ courses, input });
  const groups = mboCoursesForOccupation(input, '2422');
  assert.equal(groups.length, 1);
  assert.equal(groups[0].relations.length, 2);
  const html = render(OccupationCourseContent, {
    isco: '2422',
    courses,
    relations: input,
  });
  assert.equal((html.match(/<h2>/g) ?? []).length, 1);
  assert.match(html, /Welke opleidingen sluiten aan bij deze beroepsgroep\?/);
  assert.doesNotMatch(html, /Gele onderlijn: aangeboden in Fryslân/);
  for (const level of ['Mbo', 'Hbo', 'Wo'])
    assert.match(html, new RegExp(`class="occupation-course-label">${level}</h3>`));
  assert.match(html, /class="occupation-course-count"[^>]*>1 voorgestelde koppeling</);
  assert.equal(
    (html.match(/class="occupation-course-count"[^>]*>1 opleiding</g) ?? []).length,
    2,
  );
  assert.doesNotMatch(
    html,
    /<details class="occupation-course-level"|occupation-course-chevron/,
  );
  assert.equal(
    (html.match(/<footer class="occupation-course-footer">/g) ?? []).length,
    3,
  );
  const kpiCards = [
    ...html.matchAll(/<header class="occupation-course-heading">(.*?)<\/header>/g),
  ];
  assert.equal(kpiCards.length, 3);
  assert.ok(kpiCards.every((card) => card[1].includes('occupation-course-count')));
  assert.ok(
    html.lastIndexOf('class="occupation-course-kpi"') <
      html.indexOf('Gekoppelde opleidingen'),
  );
  assert.ok(
    html.indexOf('Gekoppelde opleidingen') <
      html.indexOf('class="occupation-course-level"'),
  );
  assert.ok(kpiCards.every((card) => !card[1].includes('occupation-course-links')));
  assert.equal((html.match(/class="occupation-course-icon"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:=|\s|>)/);
  for (const href of [
    '#opleiding/mbo/25132/2025',
    '#opleiding/hbo/12345/2025',
    '#opleiding/wo/54321/2025',
  ])
    assert.equal(html.split(`href="${href}"`).length - 1, 1);
  assert.match(html, /voorlopig, nog in ontwikkeling en worden aangevuld/);
  assert.match(html, /Ontdek welke opleidingen aansluiten bij deze beroepsgroep/);
  assert.match(
    html,
    /Een opleiding kan toegang bieden tot verschillende beroepen en leidt niet automatisch tot een specifiek beroep/,
  );
  assert.match(html, /Directe koppelingen/);
  assert.match(html, /Afgeleide koppelingen · kandidaten/);
  assert.doesNotMatch(
    html,
    /<summary>Bronnen en methodologische toelichting<\/summary>/,
  );
  assert.match(
    html,
    /href="#methodologie\/opleiding-beroep-verantwoording">Bronnen en methodologische toelichting<\/a>/,
  );
  assert.equal(
    (
      html.match(
        /Er is gebruik gemaakt van de data van Landelijk Centrum Studiekeuze/g,
      ) ?? []
    ).length,
    2,
  );
  assert.doesNotMatch(html, /Koppelingen via de Studiekeuzedatabase/);
  const levelBlocks = html.split('<section class="occupation-course-level"').slice(1);
  for (const block of levelBlocks.slice(1)) {
    assert.match(
      block.split('<p class="occupation-course-sources-link">')[0],
      /href="https:\/\/lcsk.nl\/over-ons\/studiekeuzedata-raadplegen\/"/,
    );
  }
  assert.doesNotMatch(html, /<p class="education-profession-source">/);
  assert.match(
    html,
    /href="https:\/\/lcsk.nl\/over-ons\/studiekeuzedata-raadplegen\/"/,
  );
  assert.match(html, /Studiekeuzedatabase, versie 26.6/);
  assert.equal(JSON.stringify({ courses, input }), before);
});
test('aantallen blijven per niveau gescheiden en onderscheiden nul, laden en bronfouten', () => {
  const ready = render(OccupationCourseContent, {
    isco: '2422',
    courses: [],
    relations: [mboRelation({ isco: '0110' })],
  });
  assert.equal((ready.match(/>0 opleidingen</g) ?? []).length, 2);
  assert.match(ready, />0 voorgestelde koppelingen</);
  assert.match(ready, /Dit betekent niet dat er geen passende opleiding bestaat/);
  assert.doesNotMatch(
    ready,
    /Er is gebruik gemaakt van de data van Landelijk Centrum Studiekeuze/,
  );
  assert.doesNotMatch(ready, /lcsk.nl/);
  assert.doesNotMatch(ready, /class="occupation-course-level"/);
  const loading = render(OccupationCourseContent, {
    isco: '2422',
    courses: null,
    relations: null,
  });
  assert.equal(
    (loading.match(/class="occupation-course-count"[^>]*>Opleidingen laden…</g) ?? [])
      .length,
    3,
  );
  assert.doesNotMatch(loading, />0 opleidingen</);
  const failure = render(OccupationCourseContent, {
    isco: '2422',
    courses: [],
    relations: null,
    mboError: true,
  });
  assert.match(failure, /class="occupation-course-count"[^>]*>Niet beschikbaar</);
  assert.equal((failure.match(/>0 opleidingen</g) ?? []).length, 2);
});
test('alle bestaande mbo- en hbo/wo-koppelingen verwijzen na bundeling naar bestaande opleidingsdetails', async () => {
  const { courses } = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/opleidingen.json', import.meta.url),
      'utf8',
    ),
  );
  const { relations } = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/mbo_beroep_matches.json', import.meta.url),
      'utf8',
    ),
  );
  for (const isco of new Set(relations.map((r) => r.isco))) {
    const links = mboCoursesForOccupation(relations, isco);
    assert.equal(
      links.length,
      new Set(relations.filter((r) => r.isco === isco).map((r) => r.code)).size,
    );
    for (const link of links)
      assert.ok(
        courses.some(
          (c) =>
            c.education_type === 'mbo' && c.code === link.code && c.years[link.year],
        ),
      );
  }
  const codes = new Set(
    courses.flatMap((c) => (c.occupations ?? []).map((o) => o.code)),
  );
  for (const isco of codes)
    for (const link of coursesForOccupation(courses, isco))
      assert.ok(
        courses.some(
          (c) =>
            c.education_type === link.type &&
            c.code === link.code &&
            c.years[link.year],
        ),
      );
});

const { nationalCoursesForOccupation } = await import(
  new URL('nationalHoCourses.mjs', cache)
);
test('landelijke beroepslijst toont ook opleidingen buiten Fryslân en maakt alleen bestaande detailroutes klikbaar', () => {
  const relation = { code: '2114', kind: 'DIRECT', degree: 'master' };
  const courses = [
    {
      code: '11111',
      education_type: 'wo',
      name: 'Friese opleiding',
      occupations: [relation],
      years: { 2025: { levels: ['master'] } },
    },
    {
      code: '22222',
      education_type: 'wo',
      name: 'Landelijke opleiding',
      occupations: [relation, relation],
      years: {},
    },
    {
      code: '33333',
      education_type: 'wo',
      name: 'Landelijke kandidaat',
      occupations: [{ ...relation, kind: 'KANDIDAAT' }],
      years: {},
    },
  ];
  const links = nationalCoursesForOccupation(courses, '2114');
  assert.equal(links.length, 3);
  assert.equal(links.filter((l) => l.year).length, 1);
  const html = render(OccupationCourseContent, {
    isco: '2114',
    courses,
    relations: [],
  });
  assert.match(html, />3 opleidingen</);
  assert.match(html, /Landelijke opleiding/);
  assert.match(html, /Landelijke kandidaat/);
  assert.match(html, /href="#opleiding\/wo\/11111\/2025"/);
  assert.doesNotMatch(html, /href="#opleiding\/wo\/(22222|33333)/);
  assert.doesNotMatch(
    html,
    /Dit overzicht bevat landelijke opleidingen|Doorklikken kan bij opleidingen/,
  );
  assert.equal((html.match(/Aangeboden in Fryslân/g) ?? []).length, 1);
  assert.match(html, /class="occupation-course-region">Aangeboden in Fryslân<\/span>/);
});
test('Geologen en geofysici behoudt alle landelijke wo-koppelingen zonder Friese opleidingspagina’s toe te voegen', async () => {
  const { courses: national } = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/ho_isco_landelijk.json', import.meta.url),
      'utf8',
    ),
  );
  const { courses: local } = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/opleidingen.json', import.meta.url),
      'utf8',
    ),
  );
  const links = nationalCoursesForOccupation(national, '2114');
  assert.equal(links.filter((l) => l.type === 'wo' && l.kind === 'DIRECT').length, 8);
  assert.equal(
    links.filter((l) => l.type === 'wo' && l.kind === 'KANDIDAAT').length,
    3,
  );
  assert.ok(links.some((l) => l.name === 'Earth Sciences'));
  assert.ok(links.every((l) => !l.year));
  for (const isco of new Set(
    national.flatMap((c) => c.occupations.map((o) => o.code)),
  )) {
    const links = nationalCoursesForOccupation(national, isco);
    assert.equal(links.length, new Set(links.map((l) => `${l.type}:${l.code}`)).size);
    assert.equal(
      links.length,
      new Set(
        links.map(
          (l) =>
            `${l.type}:${l.name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('nl')}`,
        ),
      ).size,
    );
    for (const link of links.filter((l) => l.year))
      assert.ok(
        local.some(
          (c) =>
            c.code === link.code &&
            c.education_type === link.type &&
            c.years[link.year],
        ),
      );
  }
});

test('dezelfde opleidingsnaam verschijnt één keer en een directe koppeling gaat vóór een afgeleide broncode', () => {
  const course = (code, name, kind, years = {}, education_type = 'wo') => ({
    code,
    name,
    education_type,
    years,
    occupations: [{ code: '2114', kind, degree: 'master' }],
  });
  const courses = [
    course('22222', 'Earth Sciences', 'KANDIDAAT', { 2025: { levels: ['master'] } }),
    course('11111', 'Earth Sciences', 'DIRECT'),
    course('33333', '  Earth   Sciences ', 'KANDIDAAT'),
    course('44444', 'Earth Sciences', 'DIRECT', {}, 'hbo'),
    course('55555', 'Hydrology', 'KANDIDAAT'),
    course('66666', 'Hydrology', 'KANDIDAAT', { 2025: { levels: ['master'] } }),
  ];
  const before = JSON.stringify(courses);
  const links = nationalCoursesForOccupation(courses, '2114');
  assert.equal(links.length, 3);
  const earth = links.find((l) => l.type === 'wo' && l.name === 'Earth Sciences');
  assert.equal(earth.kind, 'DIRECT');
  assert.equal(earth.code, '11111');
  assert.equal(
    earth.year,
    undefined,
    'geen Friese route overnemen van een afgeleide koppeling',
  );
  assert.equal(links.find((l) => l.name === 'Hydrology').code, '66666');
  assert.deepEqual(nationalCoursesForOccupation([...courses].reverse(), '2114'), links);
  const html = render(OccupationCourseContent, {
    isco: '2114',
    courses,
    relations: [],
  });
  assert.equal(
    (html.match(/<span>Earth Sciences<\/span>/g) ?? []).length,
    2,
    'één vermelding per onderwijssoort',
  );
  assert.doesNotMatch(html, /#opleiding\/wo\/22222/);
  assert.equal(JSON.stringify(courses), before);
});

const { filterOccupationCourses } = await import(
  new URL('OccupationCourses.mjs', cache)
);
test('zoeken filtert de volledige lijst op naam en combineert met beschikbaarheid in Fryslân', () => {
  const courses = [
    { name: 'Toegepaste Wiskunde', year: '2025' },
    { name: 'Data Science', year: undefined },
    { name: 'Data Science Fryslân', year: '2024' },
    { name: 'Earth Sciences', year: undefined },
  ];
  const before = JSON.stringify(courses);
  assert.deepEqual(
    filterOccupationCourses(courses, '  data SCIENCE ', false),
    courses.slice(1, 3),
  );
  assert.deepEqual(filterOccupationCourses(courses, 'science data', true), [
    courses[2],
  ]);
  assert.deepEqual(filterOccupationCourses(courses, 'fryslan', true), [courses[2]]);
  assert.deepEqual(filterOccupationCourses(courses, '', true), [
    courses[0],
    courses[2],
  ]);
  assert.deepEqual(filterOccupationCourses(courses, 'bestaat niet', false), []);
  assert.equal(filterOccupationCourses(courses, '', false).length, 4);
  assert.equal(JSON.stringify(courses), before);
});
test('lange opleidingslijsten tonen alle namen binnen het scrollvak zonder knop voor meer', () => {
  const courses = Array.from({ length: 300 }, (_, index) => ({
    code: String(60000 + index),
    education_type: 'wo',
    name: `Opleiding ${String(index).padStart(3, '0')}`,
    occupations: [
      { code: '2120', kind: index < 290 ? 'DIRECT' : 'KANDIDAAT', degree: 'master' },
    ],
    years: {},
  }));
  const html = render(OccupationCourseContent, {
    isco: '2120',
    courses,
    relations: [],
  });
  assert.match(html, /class="occupation-course-grid"/);
  assert.match(html, /type="search"/);
  assert.match(html, /Alleen aangeboden in Fryslân/);
  assert.match(html, />300 opleidingen</);
  assert.match(html, /300 opleidingen in deze lijst/);
  assert.doesNotMatch(html, /Toon 8 meer|occupation-course-more/);
  assert.equal((html.match(/class="occupation-course-name"/g) ?? []).length, 300);
  assert.match(html, /Opleiding 007/);
  assert.match(html, /Opleiding 008/);
  assert.match(html, /Opleiding 299/);
  assert.match(html, /role="region" aria-label="Wo-opleidingen" tabindex="0"/);
  const results = filterOccupationCourses(
    nationalCoursesForOccupation(courses, '2120'),
    'Opleiding 299',
    false,
  );
  assert.equal(results.length, 1, 'zoeken vindt ook opleidingen buiten de eerste acht');
  assert.equal(results[0].kind, 'KANDIDAAT');
});

const {
  matchingOccupationNames,
  occupationHref,
  profileOccupation,
  selectedOccupationUri,
} = await import(new URL('search.mjs', cache));
const { OccupationSearchResult } = await import(new URL('Atlas.mjs', cache));
test('Data scientist vindt ISCO 2120 en verschijnt als herkenbaar, aanklikbaar zoekresultaat', async () => {
  const matches = searchProfiles(profiles, 'Data scientist');
  const row = matches.find((p) => p.isco_code === '2120');
  assert.ok(row);
  assert.deepEqual(matchingOccupationNames(row, 'Data scientist'), ['Data scientist']);
  for (const query of [
    ' DATA   SCIENTIST ',
    'data-scientist',
    'scientist data',
    'data sci',
  ])
    assert.ok(
      searchProfiles(profiles, query).some((p) => p.isco_code === '2120'),
      query,
    );
  const html = render(OccupationSearchResult, { row, query: 'Data scientist' });
  assert.match(html, /Wiskundigen, actuarissen en statistici/);
  assert.match(html, />Data scientist<\/a>/);
  assert.match(html, /href="#beroep\/2120\?beroep=Data%20scientist"/);
  assert.doesNotMatch(html, /Computer vision engineer/);
  const href = occupationHref(row.isco_code, 'Data scientist');
  assert.equal(profileCode(href), '2120');
  assert.equal(profileOccupation(href), 'Data scientist');
  const members = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/occupations/2120.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(
    selectedOccupationUri(members, profileOccupation(href)),
    members.find((m) => m.name === 'Data scientist').uri,
  );
  assert.equal(selectedOccupationUri(members, 'onbekende naam'), members[0].uri);
  assert.equal(profileOccupation('#beroep/2120'), '');
  assert.equal(selectedOccupationUri([], 'Data scientist'), '');
});
test('alle specifieke beroepsnamen zijn vindbaar binnen hun ISCO-groep en zoeken bewaart indicatorfilters', () => {
  const before = JSON.stringify(profiles);
  for (const row of profiles)
    for (const name of row.occupation_names ?? []) {
      assert.ok(
        searchProfiles(profiles, name).some((p) => p.isco_code === row.isco_code),
        `${row.isco_code}: ${name}`,
      );
      assert.ok(matchingOccupationNames(row, name).includes(name));
    }
  assert.equal(JSON.stringify(profiles), before);
  assert.ok(
    searchProfiles(profiles, 'data', 'both').every(
      (p) => p.ai_exposure.value !== null && p.ai_complementarity.value !== null,
    ),
  );
  assert.deepEqual(matchingOccupationNames(profiles[0], ''), []);
  assert.equal(searchProfiles(profiles, '').length, profiles.length);
  assert.deepEqual(searchProfiles(profiles, 'bestaat-absoluut-niet-xyz'), []);
});

test('alle beroepsprofielen en specifieke zoeklinks leveren een bestaande detailpagina op', async () => {
  for (const row of profiles) {
    const href = occupationHref(row.isco_code);
    assert.equal(profileCode(href), row.isco_code);
    const html = render(Profile, { code: row.isco_code, profiles });
    assert.doesNotMatch(html, /<h1>Beroep niet gevonden<\/h1>/, row.isco_code);
    assert.match(html, /profile-header/, row.isco_code);
    if (row.member_count) {
      const members = JSON.parse(
        await fs.readFile(
          new URL(
            `../public/data/atlas/occupations/${row.isco_code}.json`,
            import.meta.url,
          ),
          'utf8',
        ),
      );
      assert.equal(members.length, row.member_count, row.isco_code);
      for (const member of members) {
        const specificHref = occupationHref(row.isco_code, member.name);
        assert.equal(profileCode(specificHref), row.isco_code);
        assert.equal(
          selectedOccupationUri(members, profileOccupation(specificHref)),
          members.find((m) => m.name === member.name).uri,
        );
      }
      assert.doesNotThrow(
        () => render(SpecificOccupationDetails, { member: members[0] }),
        row.isco_code,
      );
    }
  }
});
test('alle 208 specifieke beroepen binnen ISCO 2310 zijn gevuld en kunnen worden weergegeven', async () => {
  const members = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/occupations/2310.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(members.length, 208);
  for (const member of members) {
    const html = render(SpecificOccupationDetails, { member });
    assert.ok(member.description.trim(), member.name);
    assert.match(html, /Beroepsomschrijving/);
    assert.match(html, /<h3>Taken<\/h3>/);
  }
});

test('beroepenoverzicht begrenst de pagina en behoudt alle resultaten via paginering', () => {
  const html = render(Occupations, { profiles });
  const body = html.split('<tbody>')[1].split('</tbody>')[0];
  assert.equal((body.match(/<tr>/g) || []).length, 10);
  assert.match(html, new RegExp(`${profiles.length} beroepen beschikbaar`));
  assert.match(html, /aria-label="Paginering beroepen"/);
  assert.match(html, /option value="10" selected/);
  assert.match(html, /option value="20"/);
  assert.doesNotMatch(html, /viewport-overview|100dvh/);
});
