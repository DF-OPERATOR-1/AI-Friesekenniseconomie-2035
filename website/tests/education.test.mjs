import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const cache = new URL('../node_modules/.cache/education-tests/', import.meta.url);
await fs.mkdir(cache, { recursive: true });
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
for (const name of [
  'educationTrendData',
  'educationPathways',
  'EducationTrend',
  'EducationCounts',
  'Education',
  'MboMatches',
  'HoOccupations',
  'EducationSourceTable',
  'EducationOccupationPanel',
]) {
  const source = await fs.readFile(
    new URL(
      `../src/components/${name}.${['educationTrendData', 'educationPathways'].includes(name) ? 'ts' : 'tsx'}`,
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
    .outputText.replaceAll("'./EducationSourceTable'", "'./EducationSourceTable.mjs'")
    .replaceAll("'./EducationOccupationPanel'", "'./EducationOccupationPanel.mjs'")
    .replace("'./EducationCounts'", "'./EducationCounts.mjs'")
    .replace("'./EducationTrend'", "'./EducationTrend.mjs'")
    .replace("'./HoOccupations'", "'./HoOccupations.mjs'")
    .replace("'./MboMatches'", "'./MboMatches.mjs'")
    .replaceAll("'./educationTrendData'", "'./educationTrendData.mjs'")
    .replaceAll("'./educationPathways'", "'./educationPathways.mjs'")
    .replaceAll('import.meta.env.BASE_URL', "'/'");
  await fs.writeFile(new URL(`${name}.mjs`, cache), output);
}
const {
  filterCourses,
  EducationCard,
  EducationDetail,
  courseHref,
  courseRoute,
  levelLabel,
  availableLevels,
} = await import(new URL('Education.mjs', cache));
const { parseEducationCsv, selectCourseCounts, CountTable, EducationFigures } =
  await import(new URL('EducationCounts.mjs', cache));
const { buildEducationTrend, trendSeries, EducationTrend } = await import(
  new URL('EducationTrend.mjs', cache)
);
const { summaryYear } = await import(new URL('educationTrendData.mjs', cache));
const render = (component, props) =>
  renderToStaticMarkup(React.createElement(component, props));
const { courses } = JSON.parse(
  await fs.readFile(
    new URL('../public/data/atlas/opleidingen.json', import.meta.url),
    'utf8',
  ),
);
test('opleidingen volgen het geselecteerde jaar en behouden ontbrekende beroepskoppelingen', () => {
  assert.equal(filterCourses(courses, '2025', '', '', 'mbo').length, 342);
  assert.equal(filterCourses(courses, '2021', '', '', 'mbo').length, 341);
  const missing = filterCourses(courses, '2025', '', '27087', 'mbo');
  assert.equal(missing.length, 1);
  assert.equal(missing[0].current.qualifications.length, 0);
});
test('zoeken ondersteunt SBB-beroepscode, gecombineerde termen en mbo-niveau', () => {
  const sample = filterCourses(courses, '2025', '', '', 'mbo').find(
    (c) => c.current.qualifications.length,
  );
  const q = sample.current.qualifications[0];
  assert.ok(
    filterCourses(
      courses,
      '2025',
      sample.current.levels[0],
      `${sample.code} ${q.code}`,
    ).some((c) => c.code === sample.code),
  );
  assert.equal(filterCourses(courses, '2025', '9', '').length, 0);
  assert.equal(
    filterCourses(courses, '2025', '', 'onbestaande-opleiding-xyz').length,
    0,
  );
});

test('hbo en wo zijn zichtbaar en apart filterbaar zonder mbo-niveaus toe te kennen', () => {
  assert.equal(filterCourses(courses, '2025', '', '', 'hbo').length, 95);
  assert.equal(filterCourses(courses, '2025', '', '', 'wo').length, 10);
  assert.equal(filterCourses(courses, '2025', '', '').length, 447);
  assert.equal(filterCourses(courses, '2025', '4', '', 'wo').length, 0);
  for (const type of ['hbo', 'wo']) {
    for (const course of filterCourses(courses, '2025', '', '', type)) {
      assert.ok(course.current.places.length);
      assert.equal(course.current.qualifications.length, 0);
    }
  }
});

const example = {
  code: '99101',
  education_type: 'mbo',
  years: {
    2025: {
      names: ['Voorbeeldopleiding'],
      levels: ['3'],
      pathways: ['BOLVT'],
      institutions: ['Firda (08PG)'],
      qualifications: [{ code: 'b1234', name: 'Officiële SBB-beroepsnaam' }],
      mapping_status: 'gevonden',
    },
  },
};
const exampleData = {
  courses: [example],
  sources: [{ year: 2025, cohort: '2025-2026', file: 'officiële-koppeltabel.xlsx' }],
};

test('hele opleidingskaart is een link met uitsluitend de gevraagde kerngegevens', () => {
  const html = render(EducationCard, {
    course: example,
    current: example.years['2025'],
    year: '2025',
  });
  const visible = html.replace(/<[^>]*>/g, ' ');
  assert.match(html, /^<a /);
  assert.match(html, /href="#opleiding\/mbo\/99101\/2025"/);
  assert.match(html, /aria-labelledby="course-mbo-99101"/);
  for (const value of ['Voorbeeldopleiding', 'MBO', 'Niveau 3', 'Firda'])
    assert.ok(visible.includes(value));
  for (const value of ['99101', '08PG', 'b1234', 'SBB-beroepsnaam', 'Bron:'])
    assert.ok(!visible.includes(value));
  assert.doesNotMatch(html, /<details|<button|<input|Bekijk opleiding/);
});

test('detailroute bewaart onderwijssoort, code en jaar en weigert ongeldige routes', () => {
  assert.deepEqual(courseRoute(courseHref('mbo', '00123', '2023')), {
    type: 'mbo',
    code: '00123',
    year: '2023',
  });
  for (const value of [
    '#opleiding/mbo/test/2025',
    '#opleiding/hbo/123/2020',
    '#opleiding/anders/123/2025',
    '#opleiding/mbo/123/2025/extra',
  ])
    assert.equal(courseRoute(value), null);
});

test('mbo-detail toont SBB-naam met onderscheid van ISCO en houdt technische gegevens ingeklapt', () => {
  const html = render(EducationDetail, {
    course: example,
    year: '2025',
    data: exampleData,
  });
  assert.match(html, /<h1>Voorbeeldopleiding<\/h1>/);
  assert.match(html, /Aansluitende beroepsgroepen/);
  assert.doesNotMatch(html, /Kwalificatienaam volgens/);
  assert.doesNotMatch(html, /Kwalificatienaam volgens/);
  assert.doesNotMatch(html, /Opleidingsgegevens en bronnen/);
  assert.doesNotMatch(html, /<details[^>]* open/);
  assert.match(html, /Cijfers voor/);
  assert.doesNotMatch(html, /Bron cijfers: DUO/);
  assert.doesNotMatch(html, /studenten_mbo_friesland.csv/);
  assert.doesNotMatch(html, /afgestudeerden_mbo_friesland.csv/);
  const primary = html.replace(/<details[\s\S]*?<\/details>/g, '');
  assert.match(primary, /Aansluitende beroepsgroepen/);
  assert.doesNotMatch(primary, /08PG|b1234/);
});

test('hbo en wo tonen alleen echte beroepsrelaties en anders een korte ontbrekendmelding', () => {
  for (const type of ['hbo', 'wo']) {
    const course = {
      ...example,
      education_type: type,
      years: {
        2025: { ...example.years['2025'], levels: ['bachelor'], qualifications: [] },
      },
    };
    const html = render(EducationDetail, { course, year: '2025', data: exampleData });
    assert.doesNotMatch(
      html,
      /0 beroepsgroepen gekoppeld|Voor deze opleiding is geen geschikte beroepskoppeling beschikbaar/,
    );
    assert.doesNotMatch(html, /Niveau 3/);
    assert.match(html, /Bachelor/);
    const linked = {
      ...course,
      years: {
        2025: {
          ...course.years['2025'],
          qualifications: [{ code: 'known', name: 'Bestaande bronrelatie' }],
        },
      },
    };
    const withLink = render(EducationDetail, {
      course: linked,
      year: '2025',
      data: exampleData,
    });
    assert.match(withLink, /Aansluitende beroepsgroepen/);
    assert.doesNotMatch(withLink, /Bestaande bronrelatie/);
  }
});

test('CSV behoudt geciteerde velden, afgeschermde aantallen en nullen', () => {
  const csv =
    '\uFEFFErkende opleiding code;Jaar;Geslacht;Aantal;Instellingsnaam\r\n00123;2025;man;0;"Naam; met puntkomma"\r\n00123;2025;vrouw;<5;"Naam ""met citaat""\nvolgende regel"\r\n00123;2024;man;9;Andere instelling\r\n123;2025;man;7;Andere code\r\n';
  const rows = parseEducationCsv(csv);
  const selected = selectCourseCounts(rows, 'mbo', '00123', '2025');
  assert.equal(selected.length, 2);
  assert.deepEqual(
    selected.map((r) => r.Aantal),
    ['0', '<5'],
  );
  assert.equal(selected[0].Instellingsnaam, 'Naam; met puntkomma');
  assert.equal(selected[1].Instellingsnaam, 'Naam "met citaat"\nvolgende regel');
  assert.throws(() => parseEducationCsv('Jaar;Aantal;Geslacht\n2025;"onvolledig'));
  const html = render(CountTable, {
    rows: selected,
    type: 'mbo',
    title: 'Studenten',
    year: '2025',
  });
  assert.match(html, />0<\/td>/);
  assert.match(html, /Minder dan 5/);
  assert.doesNotMatch(html, /<caption>/);
  assert.match(html, /aria-label="Studenten in 2025"/);
  assert.match(html, /scope="col"/);
});

test('hogeronderwijscijfers gebruiken de bestaande codekolom en mengen geen jaren', () => {
  const rows = [
    { 'OPLEIDINGSCODE ACTUEEL': '30020', Jaar: '2025', Geslacht: 'man', Aantal: '13' },
    { 'OPLEIDINGSCODE ACTUEEL': '30020', Jaar: '2024', Geslacht: 'man', Aantal: '17' },
  ];
  assert.deepEqual(selectCourseCounts(rows, 'hbo', '30020', '2025'), [rows[0]]);
  assert.equal(selectCourseCounts(rows, 'wo', '50700', '2025').length, 0);
});

test('niveau filtert ook bachelor, associate degree en master op de bestaande graden', () => {
  for (const type of ['hbo', 'wo']) {
    for (const level of availableLevels(courses, '2025', type)) {
      const filtered = filterCourses(courses, '2025', level, '', type);
      assert.ok(filtered.length > 0);
      assert.ok(
        filtered.every(
          (c) => c.education_type === type && c.current.levels.includes(level),
        ),
      );
    }
  }
  const bachelor = filterCourses(courses, '2025', 'bachelor', '');
  assert.ok(bachelor.some((c) => c.education_type === 'hbo'));
  assert.ok(bachelor.some((c) => c.education_type === 'wo'));
  assert.ok(!bachelor.some((c) => c.education_type === 'mbo'));
  assert.ok(availableLevels(courses, '2025', 'hbo').includes('associate degree'));
  assert.deepEqual(availableLevels(courses, '2025', 'wo'), ['bachelor', 'master']);
  assert.equal(levelLabel('associate degree'), 'Associate degree');
});

test('kaarten tonen hogeronderwijsniveau, scheiden instellingen met & en blijven zonder actietekst klikbaar', () => {
  const current = {
    ...example.years['2025'],
    levels: ['bachelor'],
    institutions: ['NHL Stenden (31FR)', 'Van Hall Larenstein (30HD)'],
  };
  const html = render(EducationCard, {
    course: { ...example, education_type: 'hbo' },
    current,
    year: '2025',
  });
  assert.match(html, /HBO Bachelor/);
  assert.match(html, /NHL Stenden &amp; Van Hall Larenstein/);
  assert.doesNotMatch(html, /Bekijk opleiding|31FR|30HD/);
  assert.match(html, /href="#opleiding\/hbo\/99101\/2025"/);
});

const trendRow = (year, gender, count, code = '99101') => ({
  'Erkende opleiding code': code,
  Jaar: year,
  Aantal: count,
  Geslacht: gender,
  Instellingscode: '08PG',
  Instellingsnaam: 'Firda',
  Leerweg: 'BOLVT',
  Niveau: '3',
});
const trendRows = [
  trendRow('2021', 'man', '10'),
  trendRow('2021', 'vrouw', '8'),
  trendRow('2022', 'man', '12'),
  trendRow('2022', 'vrouw', '<5'),
  trendRow('2023', 'man', '0'),
  trendRow('2023', 'vrouw', '0'),
  trendRow('2024', 'man', '15'),
  trendRow('2024', 'vrouw', '9'),
  trendRow('2025', 'man', '25', 'other'),
];

test('trendlijn bewaart exacte totalen, bandbreedtes en ontbrekende jaren afzonderlijk', () => {
  const before = JSON.stringify(trendRows);
  const points = buildEducationTrend(trendRows, 'mbo', '99101');
  assert.deepEqual(
    points.map((p) => p.value),
    [18, null, 0, 24, null],
  );
  assert.deepEqual(
    points.map((p) => p.status),
    ['exact', 'suppressed', 'exact', 'exact', 'missing'],
  );
  assert.equal(JSON.stringify(trendRows), before);
  const table = render(CountTable, {
    rows: selectCourseCounts(trendRows, 'mbo', '99101', '2022'),
    type: 'mbo',
    title: 'Studenten',
    year: '2022',
  });
  assert.match(table, /Minder dan 5/);
});

test('een uitsplitsing kan bekende aantallen tonen zonder afgeschermde andere groepen mee te tellen', () => {
  const options = trendSeries(trendRows, 'mbo', '99101');
  const men = options.find((option) => option.label.endsWith(' · man'));
  const points = buildEducationTrend(trendRows, 'mbo', '99101', men.value);
  assert.deepEqual(
    points.map((p) => p.value),
    [10, 12, 0, 15, null],
  );
  const duplicates = buildEducationTrend([trendRows[0], trendRows[0]], 'mbo', '99101');
  assert.equal(duplicates[0].value, null);
  assert.equal(duplicates[0].status, 'duplicate');
});

test('grafiek maakt geen bandbreedte bij een werkelijk ontbrekende geslachtscategorie', () => {
  const hidden = [trendRow('2025', 'man', '<5')];
  const html = render(EducationTrend, {
    rows: hidden,
    type: 'mbo',
    code: '99101',
    title: 'Studenten',
  });
  assert.match(html, /afgeschermde aantallen &lt;5 \(0 t\/m 4 per categorie\)/);
  assert.match(html, /Geen volledig totaal of bandbreedte beschikbaar/);
  assert.doesNotMatch(html, /recharts-line-curve/);
});

test('ontbrekende geslachtscategorieën worden niet als nul of volledig totaal behandeld', () => {
  const onlyMen = [trendRow('2025', 'man', '12')];
  assert.equal(buildEducationTrend(onlyMen, 'mbo', '99101')[0].status, 'incomplete');
  assert.equal(buildEducationTrend(onlyMen, 'mbo', '99101')[0].value, null);
  const rows = [
    trendRow('2024', 'man', '3'),
    trendRow('2024', 'vrouw', '5'),
    trendRow('2024', 'onbekend', '0'),
    trendRow('2025', 'man', '4'),
    trendRow('2025', 'vrouw', '7'),
  ];
  assert.equal(buildEducationTrend(rows, 'mbo', '99101')[0].value, 8);
  assert.equal(buildEducationTrend(rows, 'mbo', '99101')[1].value, null);
});

test('mbo-totalen combineren DUO-hoofdinschrijvingen over instellingen en leerwegen', () => {
  const rows = [
    trendRow('2025', 'man', '10'),
    trendRow('2025', 'vrouw', '8'),
    {
      ...trendRow('2025', 'man', '7'),
      Instellingscode: '25GV',
      Instellingsnaam: 'Aeres',
    },
    {
      ...trendRow('2025', 'vrouw', '5'),
      Instellingscode: '25GV',
      Instellingsnaam: 'Aeres',
    },
  ];
  assert.equal(buildEducationTrend(rows, 'mbo', '99101')[0].value, 30);
  const firda = trendSeries(rows, 'mbo', '99101').find(
    (s) => s.value.startsWith('scope:') && s.label.startsWith('Firda'),
  );
  assert.equal(buildEducationTrend(rows, 'mbo', '99101', firda.value)[0].value, 18);
  const twoPathways = [
    trendRow('2025', 'man', '10'),
    trendRow('2025', 'vrouw', '8'),
    { ...trendRow('2025', 'man', '7'), Leerweg: 'BBL' },
    { ...trendRow('2025', 'vrouw', '5'), Leerweg: 'BBL' },
  ];
  assert.equal(buildEducationTrend(twoPathways, 'mbo', '99101')[0].value, 30);
});

test('hbo-hoofdinschrijvingen tellen voltijd en deeltijd binnen dezelfde opleiding samen', () => {
  const row = (form, gender, value) => ({
    'OPLEIDINGSCODE ACTUEEL': '30020',
    'INSTELLINGSCODE ACTUEEL': '31FR',
    GEMEENTENUMMER: '0080',
    OPLEIDINGSVORM: form,
    'TYPE HOGER ONDERWIJS': 'bachelor',
    Geslacht: gender,
    Jaar: '2025',
    Aantal: value,
  });
  const rows = [
    row('voltijd', 'man', '10'),
    row('voltijd', 'vrouw', '10'),
    row('deeltijd', 'man', '5'),
    row('deeltijd', 'vrouw', '5'),
  ];
  assert.equal(buildEducationTrend(rows, 'hbo', '30020')[0].value, 30);
  assert.equal(buildEducationTrend(rows.slice(0, 2), 'hbo', '30020')[0].value, 20);
});

test('bronjaarhelper bewaart de bestaande bronjaarlogica', () => {
  assert.equal(summaryYear([trendRow('2024', 'man', '3')], '2025'), '2024');
  assert.equal(
    summaryYear(
      [trendRow('2025', 'man', '3', 'other'), trendRow('2024', 'man', '3')],
      '2025',
    ),
    '2025',
  );
  assert.equal(summaryYear([trendRow('2025', 'man', '3')], '2023'), '2023');
});

test('detailcijfers tonen kernkaarten en tabbladen met compacte bronkolommen', () => {
  const rows = [trendRow('2025', 'man', '12'), trendRow('2025', 'vrouw', '8')];
  const html = render(EducationFigures, {
    counts: [
      { state: 'ready', rows },
      { state: 'ready', rows: [] },
    ],
    type: 'mbo',
    code: '99101',
    year: '2025',
  });
  assert.match(html, />20<\/p>/);
  assert.match(html, /Gedetailleerde cijfers/);
  assert.equal((html.match(/role="tab"/g) || []).length, 2);
  assert.ok(
    html.indexOf('education-summary-card') < html.indexOf('Gedetailleerde cijfers'),
  );
  assert.doesNotMatch(html, /Toon alle bronkolommen/);
  assert.doesNotMatch(html, /education-extended-data/);
});

test('beroepsrichting blijft niet-gegarandeerd en ISCO-uitleg staat alleen in de bronnen', () => {
  const html = render(EducationDetail, {
    course: example,
    year: '2025',
    data: exampleData,
  });
  const main = html.split('<details class="education-detail-sources">')[0];
  assert.match(main, /Aansluitende beroepsgroepen/);
  assert.doesNotMatch(main, /Kwalificatienaam volgens/);
  assert.doesNotMatch(main, /Kwalificatienaam volgens/);
  assert.match(
    main,
    /niet automatisch dat een afgestudeerde voor ieder beroep gekwalificeerd is/,
  );
  assert.doesNotMatch(main, /ISCO-08 [0-9]|b1234|officiële-koppeltabel/);
  assert.doesNotMatch(html, /Kwalificatienaam volgens/);
});

test('een onbekende instelling wordt niet stilzwijgend als eenduidige totaalpopulatie behandeld', () => {
  const rows = [
    { ...trendRow('2025', 'man', '10'), Instellingscode: '' },
    { ...trendRow('2025', 'vrouw', '8'), Instellingscode: '' },
  ];
  assert.equal(buildEducationTrend(rows, 'mbo', '99101')[0].value, null);
  assert.equal(buildEducationTrend(rows, 'mbo', '99101')[0].status, 'incomplete');
});

test('mbo-koppelingen selecteren exact op opleidingscode, ISCO en beroepsidentificatie', async () => {
  const { selectMboRelations, MboMatchList } = await import(
    new URL('MboMatches.mjs', cache)
  );
  const a = {
    code: '99101',
    course_name: 'Voorbeeldopleiding',
    years: ['2024', '2025'],
    occupation_uri: 'esco:a',
    occupation: 'Beroep A',
    isco: '3221',
    status: 'Voorspeld · verwant beroep',
    source: 'ESCO',
    score: 61.2,
    note: 'Onderbouwing',
    method: 'test',
  };
  const b = { ...a, code: '99102', occupation_uri: 'esco:b' };
  assert.deepEqual(selectMboRelations([a, b], '99101'), [a]);
  assert.deepEqual(selectMboRelations([a, b], undefined, '3221'), [a, b]);
  assert.deepEqual(selectMboRelations([a, b], undefined, undefined, 'esco:a'), [a]);
  assert.deepEqual(selectMboRelations([a, b], undefined, undefined, 'cnl:a'), []);
  const groupOnly = { ...a, occupation_uri: '' };
  assert.deepEqual(selectMboRelations([groupOnly], undefined, undefined, 'esco:a'), []);
  const html = render(MboMatchList, {
    relations: [a],
    direction: 'occupation',
    year: '2024',
  });
  assert.match(html, /#opleiding\/mbo\/99101\/2024/);
  assert.match(html, /geen kanspercentage/);
  assert.match(html, /Bekijk dit specifieke beroep in de bron/);
  assert.match(html, /href="esco:a"/);
  assert.match(html, /een onderzoeksvoorstel/);
  assert.match(html, /· mbo/);
  const fallback = render(MboMatchList, {
    relations: [a],
    direction: 'occupation',
    year: '2021',
  });
  assert.match(fallback, /#opleiding\/mbo\/99101\/2025/);
  const forward = render(MboMatchList, { relations: [a], direction: 'course' });
  assert.match(forward, /#beroep\/3221/);
});

test('SVO toont alleen het opgegeven Friese aanbod, met zoeken op de huidige foodservicenaam', () => {
  const svo = filterCourses(courses, '2025', '', '', 'mbo').filter((c) =>
    c.current.institutions.some((i) => i.includes('(17WH)')),
  );
  assert.deepEqual(svo.map((c) => c.code).sort(), ['25178', '25703']);
  assert.ok(
    filterCourses(courses, '2025', '', 'foodservice', 'mbo').some(
      (c) => c.code === '25178',
    ),
  );
});

test('onderwijscijfers volgen de geselecteerde instellingen en mengen uitgesloten scholen niet terug', async () => {
  const { filterMboCountInstitutions } = await import(
    new URL('EducationCounts.mjs', cache)
  );
  const rows = [
    {
      'Erkende opleiding code': '25180',
      Instellingscode: '08PG',
      Jaar: '2025',
      Aantal: '20',
    },
    {
      'Erkende opleiding code': '25180',
      Instellingscode: '17WH',
      Jaar: '2025',
      Aantal: '40',
    },
    {
      'Erkende opleiding code': '25180',
      Instellingscode: '08PG',
      Jaar: '2024',
      Aantal: '<5',
    },
    {
      'Erkende opleiding code': 'andere',
      Instellingscode: '17WH',
      Jaar: '2025',
      Aantal: '50',
    },
  ];
  const selected = filterMboCountInstitutions(rows, '25180', {
    2025: ['08PG'],
    2024: ['08PG'],
  });
  assert.deepEqual(selected, [rows[0], rows[2], rows[3]]);
  assert.equal(rows.length, 4);
  assert.equal(selected[1].Aantal, '<5');
  assert.deepEqual(filterMboCountInstitutions(rows, '25180', {}), [rows[3]]);
});

test('buitensport op de Aeres-locatie Nijkerk wordt niet via gedeelde SBB-kwalificatie getoond', () => {
  assert.ok(
    !courses.some(
      (c) => c.education_type === 'mbo' && ['25844', '26000'].includes(c.code),
    ),
  );
  const green = courses.find((c) => c.education_type === 'mbo' && c.code === '25617');
  assert.ok(green.years['2025'].institutions.some((i) => i.includes('(25GV)')));
});

test('opleidingskaarten groeperen dezelfde officiële kwalificatie zonder codes of cijfers te verwijderen', async () => {
  const { groupCourseResults } = await import(new URL('Education.mjs', cache));
  const raw = filterCourses(courses, '2021', '', 'accountmanager', 'mbo');
  const before = JSON.stringify(raw);
  const unique = groupCourseResults(raw);
  assert.equal(unique.length, 1);
  assert.deepEqual(
    unique[0].registrations.map((r) => r.code),
    ['25132', '93802'],
  );
  assert.deepEqual(unique[0].current.institutions, ['Firda (08PG)']);
  assert.equal(JSON.stringify(raw), before);
  const card = render(EducationCard, {
    course: unique[0],
    current: unique[0].current,
    year: '2021',
  });
  assert.match(card, /href="#opleiding\/mbo\/25132\/2021"/);
  assert.doesNotMatch(card.replace(/<[^>]*>/g, ''), /25132|93802/);
  for (const code of ['25132', '93802']) {
    const course = courses.find((c) => c.education_type === 'mbo' && c.code === code);
    const html = render(EducationDetail, {
      course,
      year: '2021',
      data: { courses, sources: [] },
    });
    assert.doesNotMatch(html, /Registraties van deze opleiding/);
    assert.doesNotMatch(html, /Opleidingsgegevens en bronnen/);
    assert.doesNotMatch(html, /Opleidingsgegevens en bronnen/);
    assert.doesNotMatch(html, /Opleidingsgegevens en bronnen/);
  }
  assert.equal(filterCourses(courses, '2021', '', '93802', 'mbo').length, 1);
});

test('kaartgroepering bewaart afzonderlijke kwalificaties en scheidt namen, niveaus en onderwijssoorten', async () => {
  const { groupCourseResults } = await import(new URL('Education.mjs', cache));
  const samples = [
    example,
    {
      ...example,
      code: '99102',
      years: {
        2025: { ...example.years['2025'], institutions: ['Aeres (V) MBO (25GV)'] },
      },
    },
  ];
  const grouped = groupCourseResults(filterCourses(samples, '2025', '', ''));
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].current.institutions.length, 2);
  const otherQualification = {
    ...example,
    code: '99103',
    years: {
      2025: {
        ...example.years['2025'],
        qualifications: [{ code: 'b5678', name: 'Ander beroep' }],
      },
    },
  };
  const otherLevel = {
    ...example,
    code: '99104',
    years: { 2025: { ...example.years['2025'], levels: ['4'] } },
  };
  const otherName = {
    ...example,
    code: '99107',
    years: {
      2025: {
        ...example.years['2025'],
        names: ['Een andere opleiding met hetzelfde SBB-id'],
      },
    },
  };
  const unknown = {
    ...example,
    code: '99105',
    years: { 2025: { ...example.years['2025'], qualifications: [] } },
  };
  const higher = { ...example, code: '99106', education_type: 'hbo' };
  assert.equal(
    groupCourseResults(
      filterCourses(
        [...samples, otherQualification, otherLevel, otherName, unknown, higher],
        '2025',
        '',
        '',
      ),
    ).length,
    4,
  );
});

test('alle mbo-overzichten hebben unieke combinaties van naam en niveau zonder kwalificaties bij te verzinnen', async () => {
  const { groupCourseResults } = await import(new URL('Education.mjs', cache));
  for (const year of ['2021', '2022', '2023', '2024', '2025']) {
    const raw = filterCourses(courses, year, '', '', 'mbo');
    const grouped = groupCourseResults(raw);
    const labels = grouped.map(
      (g) => g.current.names.join('/').toLowerCase() + '|' + g.current.levels.join('/'),
    );
    assert.equal(labels.length, new Set(labels).size);
    assert.deepEqual(
      grouped.flatMap((g) => g.registrations.map((c) => c.code)).sort(),
      raw.map((c) => c.code).sort(),
    );
    for (const group of grouped)
      for (const registration of group.registrations) {
        assert.deepEqual(
          registration.current.qualifications,
          raw.find((c) => c.code === registration.code).current.qualifications,
        );
      }
  }
});

test('leerweg staat los van opleidingscode en examendeelname wordt apart getoond', async () => {
  const { pathwaySummary, groupCourseResults } = await import(
    new URL('Education.mjs', cache)
  );
  const registrations = filterCourses(courses, '2021', '', 'accountmanager', 'mbo');
  const code25132 = registrations.find((r) => r.code === '25132');
  const code93802 = registrations.find((r) => r.code === '93802');
  assert.ok(code25132.current.pathways.includes('BOLVT'));
  assert.ok(code25132.current.pathways.includes('BBL'));
  assert.ok(code93802.current.pathways.includes('BBL'));
  assert.equal(pathwaySummary(['EX'], 'mbo'), 'Leerweg: Extraneus');
  assert.equal(
    pathwaySummary(['BOLVT', 'BBL', 'EX'], 'mbo'),
    'Leerweg: BBL / BOL (voltijd) / Extraneus',
  );
  assert.equal(pathwaySummary(['BBL', 'BBL'], 'mbo'), 'Leerweg: BBL');
  const group = groupCourseResults(registrations)[0];
  const card = render(EducationCard, {
    course: group,
    current: group.current,
    year: '2021',
  });
  assert.match(card, /BOL \(voltijd\)/);
  assert.match(card, /BBL/);
  assert.match(card, /Extraneus/);
  assert.doesNotMatch(card, /BOLVT/);
  const detail = render(EducationDetail, {
    course: code25132,
    year: '2021',
    data: { courses, sources: [] },
  });
  assert.match(detail, /Leerweg:/);
  assert.match(detail, /Extraneus/);
  assert.ok(filterCourses(courses, '2021', '', 'accountmanager BBL', 'mbo').length);
});

test('hbo- en wo-kaarten tonen de geregistreerde opleidingsvorm', async () => {
  const { pathwaySummary } = await import(new URL('Education.mjs', cache));
  assert.equal(
    pathwaySummary(
      ['voltijd onderwijs', 'deeltijd onderwijs', 'duaal onderwijs'],
      'hbo',
    ),
    'Opleidingsvorm: Voltijd / Deeltijd / Duaal',
  );
  for (const type of ['hbo', 'wo']) {
    const course = filterCourses(courses, '2025', '', '', type)[0];
    const card = render(EducationCard, {
      course,
      current: course.current,
      year: '2025',
    });
    assert.match(card, /Opleidingsvorm:/);
    assert.doesNotMatch(card, /Leerweg:/);
  }
});

test('afgeschermde mannen en vrouwen leveren grenzen op zonder een geschat exact totaal', () => {
  const rows = [
    trendRow('2021', 'man', '12'),
    trendRow('2021', 'vrouw', '<5'),
    trendRow('2022', 'man', '<5'),
    trendRow('2022', 'vrouw', '<5'),
    trendRow('2023', 'man', '0'),
    trendRow('2023', 'vrouw', '< 5'),
    trendRow('2024', 'man', '12'),
    trendRow('2024', 'vrouw', '8'),
    trendRow('2025', 'man', '0'),
    trendRow('2025', 'vrouw', '0'),
  ];
  const before = JSON.stringify(rows);
  const points = buildEducationTrend(rows, 'mbo', '99101');
  assert.deepEqual(
    points.map((p) => [p.lower, p.upper, p.value]),
    [
      [12, 16, null],
      [0, 8, null],
      [0, 4, null],
      [20, 20, 20],
      [0, 0, 0],
    ],
  );
  assert.deepEqual(
    points.map((p) => p.suppressedCategories),
    [1, 2, 1, 0, 0],
  );
  assert.equal(JSON.stringify(rows), before);
});

test('ontbrekende cellen, dubbele bronrijen en numerieke overflow worden geen bandbreedte', () => {
  const incomplete = [trendRow('2025', 'man', '12'), trendRow('2025', 'vrouw', '')];
  const missing = [trendRow('2025', 'man', '<5')];
  const duplicate = [
    trendRow('2025', 'man', '<5'),
    trendRow('2025', 'man', '<5'),
    trendRow('2025', 'vrouw', '12'),
  ];
  const overlapping = [
    trendRow('2025', 'man', '<5'),
    trendRow('2025', 'vrouw', '12'),
    { ...trendRow('2025', 'man', '10'), Leerweg: 'BBL' },
    { ...trendRow('2025', 'vrouw', '10'), Leerweg: 'BBL' },
  ];
  const overflow = [
    trendRow('2025', 'man', String(Number.MAX_SAFE_INTEGER)),
    trendRow('2025', 'vrouw', '<5'),
  ];
  for (const rows of [incomplete, missing, duplicate, overflow]) {
    const point = buildEducationTrend(rows, 'mbo', '99101')[0];
    assert.equal(point.value, null);
    assert.equal(point.lower, undefined);
    assert.equal(point.upper, undefined);
  }
  const total = buildEducationTrend(overlapping, 'mbo', '99101')[0];
  assert.deepEqual([total.lower, total.upper, total.value], [32, 36, null]);
  const scope = trendSeries(overlapping, 'mbo', '99101').find(
    (s) => s.value.startsWith('scope:') && s.label.includes('BOL (voltijd)'),
  );
  const point = buildEducationTrend(overlapping, 'mbo', '99101', scope.value)[0];
  assert.deepEqual([point.lower, point.upper], [12, 16]);
});

test('grafiek en tooltip onderscheiden exacte totalen en bandbreedtes zonder middenwaarde', async () => {
  const { EducationTrendTooltip, trendPointLabel } = await import(
    new URL('EducationTrend.mjs', cache)
  );
  const rows = [
    trendRow('2021', 'man', '12'),
    trendRow('2021', 'vrouw', '<5'),
    trendRow('2022', 'man', '12'),
    trendRow('2022', 'vrouw', '8'),
  ];
  const points = buildEducationTrend(rows, 'mbo', '99101');
  const html = render(EducationTrend, {
    rows,
    type: 'mbo',
    code: '99101',
    title: 'Studenten',
  });
  assert.match(html, /Bandbreedte door &lt;5/);
  assert.match(html, /Exact totaal/);
  assert.match(html, /2021: 12–16 \(bandbreedte\)/);
  assert.match(html, /2022: 20 \(exact\)/);
  assert.match(html, /gearceerde band/);
  const tooltip = render(EducationTrendTooltip, {
    point: points[0],
    title: 'Studenten',
  });
  assert.match(tooltip, /12–16 \(bandbreedte\)/);
  assert.doesNotMatch(tooltip, /14 studenten/);
  assert.equal(trendPointLabel(points[1]), '20 (exact)');
  const summary = render(EducationFigures, {
    counts: [
      { rows, state: 'ready' },
      { rows: [], state: 'ready' },
    ],
    type: 'mbo',
    code: '99101',
    year: '2021',
  });
  assert.match(
    summary.split('education-chart-grid')[0],
    /Voor 2021 bevat de bron geen cijfers/,
  );
  assert.match(summary.split('education-chart-grid')[0], /12–16/);
  assert.match(summary.split('education-chart-grid')[0], /Bandbreedte/);
});

test('het mbo-opleidingstotaal combineert BBL, BOL en Extraneus met grenzen voor iedere afgeschermde cel', () => {
  const rows = [
    { ...trendRow('2025', 'man', '10'), Leerweg: 'BBL' },
    { ...trendRow('2025', 'vrouw', '<5'), Leerweg: 'BBL' },
    trendRow('2025', 'man', '20'),
    trendRow('2025', 'vrouw', '30'),
    { ...trendRow('2025', 'man', '<5'), Leerweg: 'EX' },
    { ...trendRow('2025', 'vrouw', '0'), Leerweg: 'EX' },
  ];
  const total = buildEducationTrend(rows, 'mbo', '99101')[0];
  assert.deepEqual(
    [total.lower, total.upper, total.value, total.suppressedCategories],
    [60, 68, null, 2],
  );
  const known = rows.map((r) => ({ ...r, Aantal: r.Aantal === '<5' ? '2' : r.Aantal }));
  assert.equal(buildEducationTrend(known, 'mbo', '99101')[0].value, 64);
  const missingGender = rows.slice(0, -1);
  assert.equal(
    buildEducationTrend(missingGender, 'mbo', '99101')[0].status,
    'incomplete',
  );
  const table = render(CountTable, {
    rows,
    type: 'mbo',
    title: 'Studenten',
    year: '2025',
  });
  assert.match(table, /data-source-value="EX">EX</);
  assert.equal(rows[4].Leerweg, 'EX');
});

test('Junior accountmanager krijgt in 2021 een opleidingstotaal van 182–190 uit de echte bronrijen', async () => {
  const text = await fs.readFile(
    new URL('../public/data/research/studenten_mbo_friesland.csv', import.meta.url),
    'utf8',
  );
  const rows = parseEducationCsv(text);
  const total = buildEducationTrend(rows, 'mbo', '25132').find(
    (p) => p.year === '2021',
  );
  assert.deepEqual([total.lower, total.upper, total.value], [182, 190, null]);
  const forms = trendSeries(rows, 'mbo', '25132');
  assert.ok(forms.some((s) => s.label.includes('Extraneus')));
  assert.ok(!forms.some((s) => s.label.includes(' · EX')));
  const bol = forms.find(
    (s) => s.value.startsWith('scope:') && s.label.includes('BOL (voltijd)'),
  );
  assert.equal(
    buildEducationTrend(rows, 'mbo', '25132', bol.value).find((p) => p.year === '2021')
      .value,
    152,
  );
  const extraneus = forms.find(
    (s) => s.value.startsWith('scope:') && s.label.includes('Extraneus'),
  );
  const exPoint = buildEducationTrend(rows, 'mbo', '25132', extraneus.value).find(
    (p) => p.year === '2021',
  );
  assert.deepEqual([exPoint.lower, exPoint.upper, exPoint.value], [0, 4, null]);
  const summary = render(EducationFigures, {
    counts: [
      { rows, state: 'ready' },
      { rows: [], state: 'ready' },
    ],
    type: 'mbo',
    code: '25132',
    year: '2021',
  });
  assert.match(summary.split('education-chart-grid')[0], /182–190/);
  assert.match(summary.split('education-chart-grid')[0], /Bandbreedte/);
  assert.match(summary, /Opleidingscode/);
});

test('centrale jaarselectie gebruikt alleen aanwezige cijfers van de geopende opleiding', async () => {
  const { availableCountYears, selectCountYear, countTableRows } = await import(
    new URL('EducationCounts.mjs', cache)
  );
  const students = [
    trendRow('2025', 'man', '12'),
    trendRow('2025', 'vrouw', '8'),
    trendRow('2024', 'man', '<5'),
    trendRow('2024', 'vrouw', '0'),
    trendRow('2030', 'man', '99', 'other'),
    trendRow('2023', 'man', ''),
  ];
  const graduates = [trendRow('2020', 'man', '3'), trendRow('2020', 'vrouw', '2')];
  const counts = [
    { rows: students, state: 'ready' },
    { rows: graduates, state: 'ready' },
  ];
  const years = availableCountYears(counts, 'mbo', '99101');
  assert.deepEqual(years, ['2025', '2024', '2020']);
  assert.equal(selectCountYear(years), '2025');
  assert.equal(selectCountYear(years, '2024'), '2024');
  assert.equal(selectCountYear(years, '2022'), '2025');
  assert.deepEqual(
    countTableRows(students, 'mbo', '99101', '2024').map((r) => r.Aantal),
    ['<5', '0'],
  );
  assert.equal(countTableRows(students, 'mbo', '99101', '2024', true).length, 5);
  assert.deepEqual(
    availableCountYears([{ rows: students, state: 'loading' }], 'mbo', '99101'),
    [],
  );
});

test('kerncijfers volgen het gekozen jaar terwijl uitgebreide tabellen altijd alle jaren tonen', () => {
  const counts = [
    {
      state: 'ready',
      rows: [trendRow('2025', 'man', '12'), trendRow('2025', 'vrouw', '8')],
    },
    {
      state: 'ready',
      rows: [trendRow('2024', 'man', '3'), trendRow('2024', 'vrouw', '5')],
    },
  ];
  for (const year of ['2025', '2024']) {
    const html = render(EducationFigures, {
      counts,
      type: 'mbo',
      code: '99101',
      year,
      onYearChange: () => {},
    });
    assert.equal((html.match(/Cijfers voor/g) || []).length, 1);
    assert.match(html, new RegExp(`<option value="${year}" selected="">${year}`));
    assert.match(html, new RegExp(`Studenten in ${year}`));
    assert.match(html, new RegExp(`Afgestudeerden in ${year}`));
    assert.match(html, /bevat de bron geen cijfers/);
    const tables = html.split('education-detailed-figures')[1];
    assert.match(tables, /aria-label="Studenten in alle beschikbare jaren"/);
    assert.match(tables, /<td[^>]*>2025<\/td>/);
    assert.doesNotMatch(tables, /Toon alle bronkolommen/);
  }
});

test('cijferjaar staat afzonderlijk in de URL en terugnavigeren bewaart een ondersteund overzichtsjaar', async () => {
  const {
    courseFiguresHref,
    figuresRouteYear,
    overviewHref,
    overviewRouteYear,
    restoredOverviewYear,
  } = await import(new URL('Education.mjs', cache));
  const route = courseFiguresHref('mbo', '25132', '2021', '2025');
  assert.equal(route, '#opleiding/mbo/25132/2021?cijfers=2025');
  assert.deepEqual(courseRoute(route), { type: 'mbo', code: '25132', year: '2021' });
  assert.equal(figuresRouteYear(route), '2025');
  assert.equal(
    figuresRouteYear('#opleiding/mbo/25132/2021?cijfers=onbekend'),
    undefined,
  );
  assert.equal(overviewRouteYear(overviewHref('2024')), '2024');
  assert.equal(
    restoredOverviewYear('#opleidingen?jaar=2021', route, '2024', [
      '2025',
      '2024',
      '2021',
    ]),
    '2024',
  );
  assert.equal(
    restoredOverviewYear('#opleidingen?jaar=2020', route, '2020', [
      '2025',
      '2024',
      '2021',
    ]),
    '2025',
  );
});

test('opleidings- en beroepsgegevens blijven bij het openingsjaar terwijl het cijferjaar wisselt', () => {
  const course = courses.find((c) => c.education_type === 'mbo' && c.code === '25132');
  const base = { course, year: '2021', data: { courses, sources: [] } };
  const first = render(EducationDetail, { ...base, figuresYear: '2021' });
  const second = render(EducationDetail, { ...base, figuresYear: '2025' });
  assert.match(first, /#opleidingen\?jaar=2021/);
  assert.match(second, /#opleidingen\?jaar=2025/);
  for (const html of [first, second]) {
    assert.doesNotMatch(html, /Friese DUO-selectie/);
    assert.match(html, /\(Junior\) accountmanager/);
    assert.doesNotMatch(html, /Opleidingsgegevens en bronnen/);
  }
});

test('grafieken behouden alle jaren bij een ander centraal geselecteerd cijferjaar', () => {
  const rows = [
    trendRow('2021', 'man', '10'),
    trendRow('2021', 'vrouw', '8'),
    trendRow('2025', 'man', '20'),
    trendRow('2025', 'vrouw', '<5'),
  ];
  for (const year of ['2021', '2025']) {
    const html = render(EducationTrend, {
      rows,
      type: 'mbo',
      code: '99101',
      title: 'Studenten',
      selectedYear: year,
    });
    assert.match(html, /2021: 18 \(exact\)/);
    assert.match(html, /2025: 20–24 \(bandbreedte\)/);
  }
});

test('kernkaarten presenteren een som over meerdere instellingen niet als exact uniek studententotaal', () => {
  const rows = [
    trendRow('2025', 'man', '10'),
    trendRow('2025', 'vrouw', '8'),
    { ...trendRow('2025', 'man', '7'), Instellingscode: '25GV' },
    { ...trendRow('2025', 'vrouw', '5'), Instellingscode: '25GV' },
  ];
  assert.equal(buildEducationTrend(rows, 'mbo', '99101')[0].value, 30);
  const html = render(EducationFigures, {
    counts: [
      { state: 'ready', rows },
      { state: 'ready', rows: [] },
    ],
    type: 'mbo',
    code: '99101',
    year: '2025',
  });
  const summaries = html.split('education-chart-grid')[0];
  assert.match(summaries, /Voor 2025 bevat de bron geen cijfers/);
  assert.match(summaries, />30<\/p>/);
});

test('kernkaarten Junior accountmanager tonen de echte bandbreedtes na wisselen van cijferjaar', async () => {
  const counts = [];
  for (const kind of ['studenten', 'afgestudeerden']) {
    const text = await fs.readFile(
      new URL(`../public/data/research/${kind}_mbo_friesland.csv`, import.meta.url),
      'utf8',
    );
    counts.push({ state: 'ready', rows: parseEducationCsv(text) });
  }
  const scenarios = [
    ['2025', '16–20', '30–46'],
    ['2024', '60–72', '17–33'],
    ['2021', '182–190', '35–43'],
  ];
  for (const [year, students, graduates] of scenarios) {
    const html = render(EducationFigures, {
      counts,
      type: 'mbo',
      code: '25132',
      year,
      onYearChange: () => {},
    }).split('education-chart-grid')[0];
    assert.match(html, new RegExp(`Studenten in ${year}`));
    assert.match(html, new RegExp(`Afgestudeerden in ${year}`));
    assert.ok(html.includes(students));
    assert.ok(html.includes(graduates));
    assert.equal((html.match(/Bandbreedte/g) || []).length, 2);
    assert.doesNotMatch(html, /Geen volledig totaal beschikbaar/);
  }
  const exact = render(EducationFigures, {
    counts,
    type: 'mbo',
    code: '25132',
    year: '2023',
    onYearChange: () => {},
  }).split('education-chart-grid')[0];
  assert.match(exact, />104<\/p>/);
  assert.match(exact, /38–42/);
});

test('detailvolgorde zet grafieken voor beroepsgroepen en daarna tabellen en bronnen', () => {
  const html = render(EducationDetail, {
    course: example,
    year: '2025',
    data: exampleData,
  });
  const markers = [
    'education-overview',
    'education-chart-grid',
    'education-careers',
    'Gedetailleerde cijfers',
  ];
  for (let i = 1; i < markers.length; i++)
    assert.ok(html.indexOf(markers[i - 1]) < html.indexOf(markers[i]));
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test('aanvullende beroepsnamen zijn uniek, sluiten de SBB-naam uit en behouden alle beschikbare groepslinks', async () => {
  const { EducationOccupationLinks, educationOccupationGroups } = await import(
    new URL('MboMatches.mjs', cache)
  );
  const relations = [
    { occupation: 'Kok', isco: '5120' },
    { occupation: 'KEUKENHULP', isco: '9412' },
    { occupation: 'Keukenhulp', isco: '9412' },
    { occupation: 'Keukenhulp', isco: '9999' },
  ];
  const original = JSON.stringify(relations);
  const groups = educationOccupationGroups(relations, ['kok']);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].codes, ['9412', '9999']);
  const html = render(EducationOccupationLinks, { relations, excludeNames: ['kok'] });
  assert.equal((html.match(/KEUKENHULP/g) || []).length, 1);
  assert.doesNotMatch(html, />Kok<|ISCO|Modelscore/);
  assert.match(html, /#beroep\/9412/);
  assert.match(html, /#beroep\/9999/);
  assert.equal(JSON.stringify(relations), original);
  const empty = render(EducationOccupationLinks, { relations: [], excludeNames: [] });
  assert.match(empty, /Aanvullende beroepskoppelingen zijn nog niet beschikbaar/);
});

test('gedeelde grafiekselectie vereist dezelfde deelgroepen en behoudt aparte selecties bij verschillende bronnen', async () => {
  const { sharedTrendOptions } = await import(new URL('EducationCounts.mjs', cache));
  const students = [trendRow('2025', 'man', '10'), trendRow('2025', 'vrouw', '<5')];
  const graduates = [trendRow('2024', 'man', '5'), trendRow('2024', 'vrouw', '3')];
  const counts = [
    { state: 'ready', rows: students },
    { state: 'ready', rows: graduates },
  ];
  const shared = sharedTrendOptions(counts, 'mbo', '99101');
  assert.ok(shared?.some((option) => option.value.startsWith('scope:')));
  const different = [
    counts[0],
    { state: 'ready', rows: graduates.map((row) => ({ ...row, Leerweg: 'BBL' })) },
  ];
  assert.equal(sharedTrendOptions(different, 'mbo', '99101'), null);
  assert.equal(
    sharedTrendOptions([counts[0], { state: 'loading', rows: [] }], 'mbo', '99101'),
    null,
  );
  const html = render(EducationFigures, {
    counts,
    type: 'mbo',
    code: '99101',
    year: '2025',
    onYearChange: () => {},
  });
  assert.equal((html.match(/Deelgroep in beide grafieken/g) || []).length, 0);
  assert.equal(
    (html.match(/Afgeschermde aantallen worden weergegeven als bandbreedte/g) || [])
      .length,
    2,
  );
  const scope = shared.find((option) => option.value.startsWith('scope:'));
  const chart = render(EducationTrend, {
    rows: students,
    type: 'mbo',
    code: '99101',
    title: 'Studenten',
    series: scope.value,
    hideSelector: true,
    hideNote: true,
    noteId: 'gezamenlijke-toelichting',
  });
  assert.match(chart, /Ontwikkeling aantal studenten/);
  assert.match(chart, /10–14 \(bandbreedte\)/);
  assert.match(chart, /aria-describedby="gezamenlijke-toelichting"/);
  assert.doesNotMatch(chart, /Welke cijfers wil je zien|gearceerde band/);
});

test('detail toont de instellingen en codes van de gezamenlijk weergegeven opleiding', () => {
  const first = { ...example, code: '99101' };
  const second = {
    ...example,
    code: '99102',
    years: {
      2025: { ...example.years['2025'], institutions: ['Andere school (25GV)'] },
    },
  };
  const html = render(EducationDetail, {
    course: first,
    year: '2025',
    data: { courses: [first, second], sources: [] },
  });
  const main = html.split('<details class="education-detail-sources">')[0];
  assert.doesNotMatch(main, /Andere school/);
  assert.match(html, /Voorbeeldopleiding/);
});

test('alleen expliciet brongecontroleerde codefamilies krijgen samengestelde cijfers', async () => {
  const { courseCodeFamily } = await import(new URL('Education.mjs', cache));
  const mapping = JSON.parse(
    await fs.readFile(
      new URL('../../data/mappings/mbo_codefamilies.json', import.meta.url),
      'utf8',
    ),
  );
  const family = mapping.families[0];
  const course = courses.find((c) => c.code === '25132' && c.education_type === 'mbo');
  assert.equal(courseCodeFamily({ courses, sources: [] }, course), undefined);
  assert.equal(
    courseCodeFamily({ courses, sources: [], code_families: mapping.families }, course),
    family,
  );
  const html = render(EducationDetail, {
    course,
    year: '2021',
    data: { courses, sources: [], code_families: mapping.families },
  });
  assert.doesNotMatch(html, /Opleidingsgegevens en bronnen/);
  assert.doesNotMatch(html, /Registraties van deze opleiding/);
  const rows = parseEducationCsv(
    await fs.readFile(
      new URL(
        '../../data/processed/onderwijs/studenten_mbo_friesland.csv',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const trend = buildEducationTrend(
    rows,
    'mbo',
    family.codes.map((c) => c.code),
    'total',
    family.codes,
  );
  for (const [year, bounds] of Object.entries({
    2021: [182, 198],
    2022: [182, 186],
    2023: [143, 147],
    2024: [134, 150],
    2025: [145, 153],
  })) {
    const point = trend.find((p) => p.year === year);
    assert.deepEqual([point.lower, point.upper], bounds);
  }
  const grads = parseEducationCsv(
    await fs.readFile(
      new URL(
        '../../data/processed/onderwijs/afgestudeerden_mbo_friesland.csv',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const gradTrend = buildEducationTrend(
    grads,
    'mbo',
    family.codes.map((c) => c.code),
    'total',
    family.codes,
  );
  assert.equal(gradTrend.find((p) => p.year === '2025').status, 'suppressed');
  assert.deepEqual(
    [
      gradTrend.find((p) => p.year === '2025').lower,
      gradTrend.find((p) => p.year === '2025').upper,
    ],
    [30, 46],
  );
  assert.equal(gradTrend.find((p) => p.year === '2025').value, null);
});

test('gelijknamige opleidingen worden voor cijfers niet zonder codebewijs samengevoegd', async () => {
  const { courseCountGroup } = await import(new URL('Education.mjs', cache));
  const second = { ...example, code: '99102' };
  assert.deepEqual(
    courseCountGroup({ courses: [example, second], sources: [] }, example).map(
      (c) => c.code,
    ),
    ['99101'],
  );
});

test('expliciete codefamilies worden vanaf iedere code gelijk toegepast', async () => {
  const { courseCountGroup } = await import(new URL('Education.mjs', cache));
  const second = { ...example, code: '99102' };
  const data = {
    courses: [example, second],
    sources: [],
    code_families: [
      { education_type: 'mbo', codes: [{ code: '99101' }, { code: '99102' }] },
    ],
  };
  for (const course of data.courses)
    assert.deepEqual(
      courseCountGroup(data, course).map((c) => c.code),
      ['99101', '99102'],
    );
});

test('grafiek begint altijd bij de totale opleiding en biedt instellingen apart aan', async () => {
  const { simpleTrendOptions } = await import(new URL('educationTrendData.mjs', cache));
  const rows = [trendRow('2025', 'man', '10'), trendRow('2025', 'vrouw', '5')];
  const options = simpleTrendOptions(rows, 'mbo', '99101');
  assert.equal(options[0].value, 'total');
  assert.equal(options.length, 2);
  const html = render(EducationTrend, {
    rows,
    type: 'mbo',
    code: '99101',
    title: 'Studenten',
  });
  assert.match(html, /2025: 15 \(exact\)/);
  assert.match(html, /Totaal opleiding/);
});

test('meerdere instellingen worden opgeteld met bandbreedte voor iedere afgeschermde regel', async () => {
  const rows = [
    trendRow('2025', 'man', '10'),
    trendRow('2025', 'vrouw', '<5'),
    { ...trendRow('2025', 'man', '20'), Instellingscode: '25GV' },
    { ...trendRow('2025', 'vrouw', '5'), Instellingscode: '25GV' },
  ];
  assert.equal(resolveEducationSeries(rows, 'mbo', '99101').series, 'total');
  const point = educationChartTrend(rows, 'mbo', '99101')[0];
  assert.deepEqual([point.lower, point.upper], [35, 39]);
  assert.equal(resolveEducationSeries(rows, 'mbo', '99101').options.length, 3);
});

test('samengevoegde geslachtscategorie naast afzonderlijke categorieën wordt nooit dubbel geteld', async () => {
  const { simpleTrendOptions } = await import(new URL('educationTrendData.mjs', cache));
  const rows = [
    trendRow('2025', 'man', '10'),
    trendRow('2025', 'vrouw', '5'),
    trendRow('2025', 'totaal', '15'),
  ];
  assert.equal(buildEducationTrend(rows, 'mbo', '99101')[0].status, 'overlap');
  assert.equal(simpleTrendOptions(rows, 'mbo', '99101')[0].value, 'total');
});

test('afgestudeerdentotalen blijven zichtbaar bij ontbrekende jaren en afgeschermde waarden', async () => {
  const { simpleTrendOptions, educationChartTrend } = await import(
    new URL('educationTrendData.mjs', cache)
  );
  const rows = [
    trendRow('2023', 'man', '10'),
    trendRow('2023', 'vrouw', '5'),
    trendRow('2024', 'man', '8'),
    trendRow('2024', 'vrouw', '<5'),
    trendRow('2025', 'man', '3'),
  ];
  assert.deepEqual(simpleTrendOptions(rows, 'mbo', '99101')[0], {
    value: 'total',
    label: 'Totaal opleiding',
  });
  const points = educationChartTrend(rows, 'mbo', '99101');
  assert.equal(points[0].value, 15);
  assert.deepEqual([points[1].lower, points[1].upper], [8, 12]);
  assert.equal(points[2].value, null);
  assert.equal(points[2].status, 'incomplete');
  const html = render(EducationTrend, {
    rows,
    type: 'mbo',
    code: '99101',
    title: 'Afgestudeerden',
  });
  assert.match(html, /2023: 15 \(exact\)/);
  assert.match(html, /2024: 8–12 \(bandbreedte\)/);
  assert.match(html, /2025: Niet beschikbaar/);
  assert.match(html, /totaal opleiding/);
  assert.match(html, /Totaal opleiding/);
});

test('een betrouwbaar jaar maakt een jaar met meerdere instellingen niet alsnog tot uniek totaal', async () => {
  const { educationChartTrend } = await import(
    new URL('educationTrendData.mjs', cache)
  );
  const rows = [
    trendRow('2023', 'man', '10'),
    trendRow('2023', 'vrouw', '5'),
    trendRow('2024', 'man', '8'),
    trendRow('2024', 'vrouw', '2'),
    { ...trendRow('2024', 'man', '5'), Instellingscode: '25GV' },
    { ...trendRow('2024', 'vrouw', '3'), Instellingscode: '25GV' },
  ];
  const points = educationChartTrend(rows, 'mbo', '99101');
  assert.equal(points[0].value, 15);
  assert.equal(points[1].value, 18);
  assert.equal(points[1].status, 'exact');
});

test('Integrale Veiligheidskunde heeft identieke opleidingstotalen op kaarten en grafieken', async () => {
  const { educationChartTrend, simpleTrendOptions } = await import(
    new URL('educationTrendData.mjs', cache)
  );
  const students = parseEducationCsv(
    await fs.readFile(
      new URL(
        '../../data/processed/onderwijs/studenten_hbo_friesland.csv',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const graduates = parseEducationCsv(
    await fs.readFile(
      new URL(
        '../../data/processed/onderwijs/afgestudeerden_hbo_friesland.csv',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const studentTotal = educationChartTrend(students, 'hbo', '39268').find(
    (p) => p.year === '2024',
  );
  const graduateTotal = educationChartTrend(graduates, 'hbo', '39268').find(
    (p) => p.year === '2024',
  );
  assert.equal(studentTotal.value, 591);
  assert.deepEqual(
    [graduateTotal.lower, graduateTotal.upper, graduateTotal.value],
    [114, 122, null],
  );
  assert.equal(simpleTrendOptions(students, 'hbo', '39268')[0].value, 'total');
  assert.equal(simpleTrendOptions(graduates, 'hbo', '39268')[0].value, 'total');
  const counts = [
    { state: 'ready', rows: students },
    { state: 'ready', rows: graduates },
  ];
  const cards = render(EducationFigures, {
    counts,
    type: 'hbo',
    code: '39268',
    year: '2024',
  });
  assert.match(cards, /education-summary-value">591</);
  assert.match(cards, /education-summary-value">114–122</);
  for (const [rows, title, expected] of [
    [students, 'Studenten', /2024: 591 \(exact\)/],
    [graduates, 'Afgestudeerden', /2024: 114–122 \(bandbreedte\)/],
  ]) {
    const chart = render(EducationTrend, { rows, type: 'hbo', code: '39268', title });
    assert.match(chart, expected);
    assert.match(chart, /Totaal opleiding/);
  }
  const latest = render(EducationFigures, {
    counts,
    type: 'hbo',
    code: '39268',
    year: '2025',
  });
  assert.match(latest, /education-summary-value">575</);
  assert.match(latest, /Voor 2025 bevat de bron geen cijfers voor deze opleiding/);
});

test('hbo en wo combineren opleidingsvormen maar geen verschillende diplomatypes', async () => {
  const { educationChartTrend } = await import(
    new URL('educationTrendData.mjs', cache)
  );
  for (const type of ['hbo', 'wo']) {
    const row = (form, gender, n, degree = 'bachelor') => ({
      'OPLEIDINGSCODE ACTUEEL': '30020',
      'INSTELLINGSCODE ACTUEEL': '31FR',
      GEMEENTENUMMER: '0080',
      OPLEIDINGSVORM: form,
      'SOORT DIPLOMA': degree,
      Geslacht: gender,
      Jaar: '2024',
      Aantal: n,
    });
    const rows = [
      row('voltijd', 'man', '10'),
      row('voltijd', 'vrouw', '5'),
      row('deeltijd', 'man', '<5'),
      row('deeltijd', 'vrouw', '7'),
    ];
    const total = educationChartTrend(rows, type, '30020')[0];
    assert.deepEqual([total.lower, total.upper], [22, 26]);
    assert.equal(
      educationChartTrend(
        [
          ...rows,
          row('voltijd', 'man', '5', 'master'),
          row('voltijd', 'vrouw', '5', 'master'),
        ],
        type,
        '30020',
      )[0].status,
      'overlap',
    );
  }
});

test('een categorie onbekend bij een andere opleiding blokkeert geen volledige mannen-vrouwentelling', () => {
  const rows = [
    trendRow('2025', 'man', '10'),
    trendRow('2025', 'vrouw', '5'),
    trendRow('2025', 'onbekend', '<5', '99999'),
  ];
  assert.equal(buildEducationTrend(rows, 'mbo', '99101')[0].value, 15);
  const samePartition = [
    trendRow('2024', 'man', '5'),
    trendRow('2024', 'vrouw', '5'),
    trendRow('2024', 'onbekend', '0'),
    ...rows,
  ];
  assert.equal(
    buildEducationTrend(samePartition, 'mbo', '99101').find((p) => p.year === '2025')
      .status,
    'incomplete',
  );
});

test('alle kaarten en detailkoppen tonen dezelfde leerwegen en blijven naar bestaande opleidingsjaren linken', async () => {
  const { groupCourseResults, pathwaySummary } = await import(
    new URL('Education.mjs', cache)
  );
  for (const year of ['2021', '2022', '2023', '2024', '2025']) {
    for (const group of groupCourseResults(filterCourses(courses, year, '', ''))) {
      const card = render(EducationCard, {
        course: group,
        current: group.current,
        year,
      });
      const expected = pathwaySummary(group.current.pathways, group.education_type);
      assert.ok(card.includes(expected), `${year} ${group.code}: kaart`);
      const route = courseRoute(courseHref(group.education_type, group.code, year));
      assert.ok(
        courses.some(
          (c) =>
            c.code === route.code &&
            c.education_type === route.type &&
            c.years[route.year],
        ),
      );
      for (const registration of group.registrations) {
        const detail = render(EducationDetail, {
          course: registration,
          year,
          data: { courses: group.registrations, sources: [] },
        });
        const header = detail.split('<div class="container"><section')[0];
        assert.ok(
          header.includes(
            pathwaySummary(
              registration.years[year].pathways,
              registration.education_type,
            ),
          ),
          `${year} ${registration.code}: detailkop`,
        );
      }
    }
  }
});

test('accountmanager 2025 toont Extraneus op kaart, detail en in zoeken, met diplomabron', async () => {
  const { groupCourseResults } = await import(new URL('Education.mjs', cache));
  const raw = filterCourses(courses, '2025', '', 'accountmanager', 'mbo');
  const group = groupCourseResults(raw)[0];
  assert.match(
    render(EducationCard, { course: group, current: group.current, year: '2025' }),
    /Extraneus/,
  );
  assert.ok(
    filterCourses(courses, '2025', '', 'accountmanager Extraneus', 'mbo').length,
  );
  const course = raw.find((c) => c.code === '25132');
  const detail = render(EducationDetail, {
    course,
    year: '2025',
    data: { courses, sources: [] },
  });
  assert.match(detail, /Extraneus/);
  assert.doesNotMatch(detail, /Opleidingsgegevens en bronnen/);
});

test('zoeken behoudt alle leerwegen en instellingen van een samengevoegde kaart', async () => {
  const { filteredCourseGroups } = await import(new URL('Education.mjs', cache));
  const first = {
    ...example,
    code: '99101',
    years: {
      2025: {
        ...example.years['2025'],
        pathways: ['BBL'],
        institutions: ['School A (08PG)'],
      },
    },
  };
  const second = {
    ...example,
    code: '99102',
    years: {
      2025: {
        ...example.years['2025'],
        pathways: ['EX'],
        institutions: ['School B (25GV)'],
      },
    },
  };
  for (const query of ['BBL', 'Extraneus', '99102', 'School A']) {
    const groups = filteredCourseGroups([first, second], '2025', '', query, 'mbo');
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0].current.pathways, ['BBL', 'EX']);
    assert.equal(groups[0].current.institutions.length, 2);
    const card = render(EducationCard, {
      course: groups[0],
      current: groups[0].current,
      year: '2025',
    });
    assert.match(card, /BBL \/ Extraneus/);
    const detail = render(EducationDetail, {
      course: first,
      year: '2025',
      data: { courses: [first, second], sources: [] },
    });
    assert.match(detail.split('<div class="container"><section')[0], /BBL/);
    assert.doesNotMatch(detail.split('<div class="container"><section')[0], /School B/);
  }
});

const { selectEducationPopulation, EducationSummaryCards, EducationCountCard } =
  await import(new URL('EducationCounts.mjs', cache));
const { compareSourceValues, filterSourceRows } = await import(
  new URL('EducationSourceTable.mjs', cache)
);
const { uniqueEducationOccupations, EducationOccupationPanel } = await import(
  new URL('EducationOccupationPanel.mjs', cache)
);
const { resolveEducationSeries, educationChartTrend } = await import(
  new URL('educationTrendData.mjs', cache)
);

test('de gedeelde selectie past instellingen per opleidingscode en bronjaar toe, ook bij meerdere codes', () => {
  const rows = [
    trendRow('2025', 'man', '10', '99101'),
    { ...trendRow('2025', 'vrouw', '5', '99101'), Instellingscode: '25GV' },
    trendRow('2025', 'vrouw', '5', '99101'),
    { ...trendRow('2025', 'man', '999', '99102'), Instellingscode: '25GV' },
    trendRow('2025', 'man', '7', '99102'),
    trendRow('2025', 'vrouw', '3', '99102'),
    trendRow('2020', 'man', '2', 'andere-opleiding'),
  ];
  const before = JSON.stringify(rows);
  const selected = selectEducationPopulation(rows, 'mbo', ['99101', '99102'], {
    99101: { 2025: ['08PG'] },
    99102: { 2025: ['08PG'] },
  });
  assert.deepEqual(selected, [rows[0], rows[2], rows[4], rows[5], rows[6]]);
  assert.equal(
    educationChartTrend(selected, 'mbo', ['99101', '99102']).find(
      (point) => point.year === '2025',
    ).value,
    25,
  );
  assert.equal(JSON.stringify(rows), before);
});
test('overzichtskaarten en grafieken gebruiken dezelfde bandbreedte en vervangen een ontbrekend diplomajaar niet', () => {
  const students = [
    trendRow('2024', 'man', '5'),
    trendRow('2024', 'vrouw', '5'),
    trendRow('2025', 'man', '10'),
    trendRow('2025', 'vrouw', '<5'),
  ];
  const graduates = [trendRow('2024', 'man', '3'), trendRow('2024', 'vrouw', '4')];
  const counts = [
    { state: 'ready', rows: students },
    { state: 'ready', rows: graduates },
  ];
  const html = render(EducationSummaryCards, {
    occupationCount: 3,
    counts,
    type: 'mbo',
    code: '99101',
    year: '2025',
  });
  assert.equal(
    (html.match(/<article class="education-summary-card">/g) ?? []).length,
    3,
  );
  assert.match(html, /10–14/);
  assert.match(html, /Afgestudeerden in 2025/);
  assert.match(html, /Voor 2025 bevat de bron geen cijfers/);
  const chart = render(EducationTrend, {
    rows: students,
    type: 'mbo',
    code: '99101',
    title: 'Studenten',
    selectedYear: '2025',
  });
  assert.match(chart, /2024: 10 \(exact\)/);
  assert.match(chart, /2025: 10–14 \(bandbreedte\)/);
  assert.deepEqual(
    educationChartTrend(students, 'mbo', '99101').find((point) => point.year === '2025')
      .lower,
    10,
  );
  assert.ok(html.indexOf('Studenten in') < html.indexOf('Aansluitende beroepsgroepen'));
});
test('kernkaart blijft het opleidingstotaal tonen bij een instellingselectie in de grafiek', () => {
  const rows = [
    trendRow('2025', 'man', '10'),
    trendRow('2025', 'vrouw', '5'),
    { ...trendRow('2025', 'man', '30'), Instellingscode: '25GV' },
    { ...trendRow('2025', 'vrouw', '4'), Instellingscode: '25GV' },
  ];
  const selection = resolveEducationSeries(rows, 'mbo', '99101');
  assert.equal(selection.series, 'total');
  const part = selection.options[1].value;
  const html = render(EducationCountCard, {
    entry: { state: 'ready', rows },
    type: 'mbo',
    code: '99101',
    year: '2025',
    title: 'Studenten',
    series: part,
  });
  assert.match(html, />49<\/p>/);
  assert.equal(educationChartTrend(rows, 'mbo', '99101', part)[0].value, 15);
});

test('brontabellen behouden alle kolommen en bronwaarden, met sortering, filters en tien rijen per pagina', () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    ...trendRow('2025', index % 2 ? 'vrouw' : 'man', String(index)),
    Extra_bronveld: `bron ${index}`,
  }));
  const before = JSON.stringify(rows);
  const html = render(CountTable, {
    rows,
    type: 'mbo',
    title: 'Studenten',
    year: 'alle beschikbare jaren',
  });
  const body = html.split('<tbody>')[1].split('</tbody>')[0];
  assert.equal((body.match(/<tr>/g) ?? []).length, 10);
  assert.match(html, /aria-label="Pagina 2"/);
  assert.match(html, /12 resultaten/);
  assert.doesNotMatch(html, /Pagina 1 van 2/);
  assert.match(html, /Filters wissen/);
  assert.doesNotMatch(html, /Extra_bronveld/);
  assert.doesNotMatch(html, /Toon alle bronkolommen/);
  assert.doesNotMatch(html, /data-source-value="bron 0"/);
  assert.match(html, /aria-sort="descending"/);
  assert.deepEqual(filterSourceRows(rows, { Geslacht: 'vrouw' }).length, 6);
  assert.equal(
    filterSourceRows([{ Aantal: '' }, { Aantal: '<5' }, { Aantal: '0' }], {
      Aantal: '__missing__',
    }).length,
    1,
  );
  const values = ['<5', '12', '', '2', '0'].sort((a, b) =>
    compareSourceValues(a, b, 'Aantal', 1),
  );
  assert.deepEqual(values, ['0', '2', '12', '<5', '']);
  assert.deepEqual(
    ['<5', '12', '', '2', '0'].sort((a, b) => compareSourceValues(a, b, 'Aantal', -1)),
    ['12', '2', '0', '<5', ''],
  );
  assert.equal(JSON.stringify(rows), before);
});
test('beroepsgroeptelling ontdubbelt ISCO-relaties en toont alle links in een compact scrollvak', () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    code: String(1100 + index),
    name: `Groep ${index}`,
    kind: 'DIRECT',
    degree: 'bachelor',
  }));
  const matches = uniqueEducationOccupations(
    [
      ...rows,
      { ...rows[0], kind: 'KANDIDAAT' },
      { code: '9999', name: 'Andere graad', kind: 'DIRECT', degree: 'master' },
    ],
    ['bachelor'],
  );
  assert.equal(matches.length, 12);
  assert.equal(matches.find((row) => row.code === '1100').kind, 'DIRECT');
  const html = render(EducationOccupationPanel, {
    matches,
    relations: null,
    loading: false,
    error: false,
    qualifications: [],
  });
  assert.equal((html.match(/href="#beroep\//g) ?? []).length, 12);
  assert.match(html, /occupation-course-scroll education-career-scroll/);
  assert.match(html, /tabindex="0"/);
  assert.doesNotMatch(html, /Toon alle beroepsgroepen|Toon minder beroepsgroepen/);
  assert.match(html, /Zoek een beroepsgroep/);
  assert.match(html, /Aansluitende beroepsgroepen/);
  assert.doesNotMatch(
    html,
    /Over deze koppeling|education-relation-details|ISCO-08: 1100/,
  );
  const candidate = render(EducationOccupationPanel, {
    matches: [...matches, { code: '9998', name: 'Kandidaat', kind: 'KANDIDAAT' }],
    relations: null,
    loading: false,
    error: false,
    qualifications: [],
  });
  assert.doesNotMatch(candidate, /Directe koppelingen/);
  assert.match(candidate, /Afgeleide koppelingen · kandidaten/);
  assert.match(candidate, /href="#beroep\/9998"/);
});
test('officiële opleidingsnamen met B en M worden exact als titel getoond, ook met een codefamilie', () => {
  for (const name of ['B Biotechnologie', 'M Environmental and Energy Management']) {
    const course = {
      ...example,
      education_type: 'hbo',
      years: {
        2025: {
          ...example.years['2025'],
          names: [name],
          levels: ['bachelor'],
          qualifications: [],
        },
      },
    };
    const html = render(EducationDetail, {
      course,
      year: '2025',
      data: {
        courses: [course],
        sources: [],
        code_families: [
          {
            id: 'test',
            education_type: 'hbo',
            name: 'Vervangende groepsnaam',
            codes: [{ code: course.code }],
            sources: [],
          },
        ],
      },
    });
    assert.ok(html.includes(`<h1>${name}</h1>`));
    assert.doesNotMatch(html, /<h1>Vervangende groepsnaam<\/h1>/);
    const overview = html.indexOf('Aansluitende beroepsgroepen');
    assert.ok(overview < html.indexOf('education-careers'));
    assert.ok(
      html.indexOf('Studenten en afgestudeerden') < html.indexOf('education-careers'),
    );
  }
});

test('International Business gebruikt echte DUO-regels over beide instellingen voor studenten en afgestudeerden', async () => {
  for (const [file, year, expected] of [
    ['studenten', '2025', [584, 592]],
    ['afgestudeerden', '2024', [89, 89]],
  ]) {
    const rows = parseEducationCsv(
      await fs.readFile(
        new URL(
          `../../data/processed/onderwijs/${file}_hbo_friesland.csv`,
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const point = educationChartTrend(rows, 'hbo', '30029').find(
      (p) => p.year === year,
    );
    assert.deepEqual([point.lower, point.upper], expected);
    const html = render(EducationCountCard, {
      entry: { state: 'ready', rows },
      type: 'hbo',
      code: '30029',
      year,
      title: file,
    });
    assert.match(
      html,
      new RegExp(
        expected[0] === expected[1]
          ? `>${expected[0]}<`
          : `${expected[0]}–${expected[1]}`,
      ),
    );
  }
});

test('lege HO-telcellen en verdwenen broncategorieën blijven onbekend', () => {
  const row = (year, gender, amount) => ({
    'OPLEIDINGSCODE ACTUEEL': '30029',
    'INSTELLINGSCODE ACTUEEL': '21MI',
    GEMEENTENUMMER: '0080',
    OPLEIDINGSVORM: 'voltijd',
    'TYPE HOGER ONDERWIJS': 'bachelor',
    Geslacht: gender,
    Jaar: year,
    Aantal: amount,
  });
  assert.equal(
    buildEducationTrend([row('2024', 'man', '')], 'hbo', '30029')[0].status,
    'missing',
  );
  const points = buildEducationTrend(
    [row('2023', 'man', '2'), row('2023', 'vrouw', '4'), row('2024', 'man', '3')],
    'hbo',
    '30029',
  );
  assert.equal(points[0].value, 6);
  assert.equal(points[1].status, 'incomplete');
  assert.equal(points[1].value, null);
});

const { educationPageNumbers, EducationPagination } = await import(
  new URL('EducationSourceTable.mjs', cache)
);
test('compacte paginering houdt eerste, laatste en huidige pagina bereikbaar zonder een lange rij knoppen', () => {
  for (const pages of [1, 2, 5, 50, 1000])
    for (const page of [0, Math.floor(pages / 2), pages - 1]) {
      const items = educationPageNumbers(page, pages);
      const numbers = items.filter((n) => typeof n === 'number');
      assert.ok(numbers.includes(0));
      assert.ok(numbers.includes(pages - 1));
      assert.ok(numbers.includes(page));
      assert.ok(items.length <= 5);
      assert.equal(new Set(numbers).size, numbers.length);
      const html = render(EducationPagination, {
        page,
        pages,
        results: pages * 10,
        onChange: () => {},
      });
      assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
      assert.match(
        html,
        new RegExp(`aria-label="Pagina ${page + 1}" aria-current="page"`),
      );
      assert.doesNotMatch(html, /Pagina 1 van/);
    }
  assert.deepEqual(educationPageNumbers(99, 2), [0, 1]);
  const first = render(EducationPagination, {
    page: 0,
    pages: 5,
    results: 42,
    onChange: () => {},
  });
  const last = render(EducationPagination, {
    page: 4,
    pages: 5,
    results: 42,
    onChange: () => {},
  });
  assert.match(first, /<button type="button" disabled=""><span aria-hidden="true">←/);
  assert.match(last, /<button type="button" disabled="">Volgende/);
  assert.match(first, /42 resultaten/);
});
test('lege beroepslijst heeft geen zoekveld en bandbreedtes hebben toegankelijke uitleg', () => {
  const empty = render(EducationOccupationPanel, {
    matches: [],
    relations: [],
    loading: false,
    error: false,
    qualifications: [],
  });
  assert.doesNotMatch(empty, /type="search"/);
  const html = render(EducationCountCard, {
    entry: {
      state: 'ready',
      rows: [trendRow('2025', 'man', '10'), trendRow('2025', 'vrouw', '<5')],
    },
    type: 'mbo',
    code: '99101',
    year: '2025',
    title: 'Studenten',
  });
  assert.match(html, /role="tooltip"/);
  assert.match(html, /minimum en maximum/);
  assert.match(html, /0 tot en met 4/);
  const chart = render(EducationTrend, {
    rows: [trendRow('2025', 'man', '10'), trendRow('2025', 'vrouw', '<5')],
    type: 'mbo',
    code: '99101',
    title: 'Studenten',
    hideNote: true,
  });
  assert.doesNotMatch(chart, /<select/);
  assert.match(chart, /Bandbreedte door &lt;5/);
  assert.match(chart, /role="tooltip"/);
});

test('mbo telt oude diplomacodes mee, ook zonder eigen studentenpagina, en toont de codes in de tabel', async () => {
  const { courseCountCodes } = await import(new URL('Education.mjs', cache));
  const data = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/opleidingen.json', import.meta.url),
      'utf8',
    ),
  );
  const course = data.courses.find(
    (c) => c.education_type === 'mbo' && c.code === '25132',
  );
  const codes = courseCountCodes(data, course);
  assert.deepEqual([...codes].sort(), ['25132', '25877', '93802']);
  const family = data.code_families.find((f) =>
    f.codes.some((c) => c.code === '25132'),
  );
  for (const [dataset, bounds] of [
    ['studenten', [145, 153]],
    ['afgestudeerden', [30, 46]],
  ]) {
    const rows = parseEducationCsv(
      await fs.readFile(
        new URL(
          `../../data/processed/onderwijs/${dataset}_mbo_friesland.csv`,
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const point = educationChartTrend(rows, 'mbo', codes, 'total', family.codes).find(
      (p) => p.year === '2025',
    );
    assert.deepEqual([point.lower, point.upper], bounds);
    const selected = rows.filter(
      (r) => codes.includes(r['Erkende opleiding code']) && r.Jaar === '2025',
    );
    const table = render(CountTable, {
      rows: selected,
      type: 'mbo',
      title: dataset,
      year: '2025',
    });
    assert.match(table, /Opleidingscode/);
    assert.match(table, /data-source-value="25132"/);
    if (dataset === 'afgestudeerden') assert.match(table, /data-source-value="93802"/);
    const card = render(EducationCountCard, {
      entry: { state: 'ready', rows },
      type: 'mbo',
      code: codes,
      periods: family.codes,
      year: '2025',
      title: dataset,
    });
    assert.match(card, new RegExp(`${bounds[0]}–${bounds[1]}`));
  }
  const diplomaOnly = {
    ...family,
    codes: [...family.codes, { code: '99991', start: '20000101', end: '0' }],
  };
  const withOld = { ...data, code_families: [diplomaOnly] };
  assert.ok(courseCountCodes(withOld, course).includes('99991'));
});
test('afwezige broncodes worden niet met lege telcellen of ontbrekende jaarregels verward', () => {
  const codes = ['99101', '99102'];
  const periods = codes.map((code) => ({ code, start: '20000101', end: '0' }));
  const rows = [trendRow('2025', 'man', '10'), trendRow('2025', 'vrouw', '<5')];
  assert.deepEqual(
    [
      buildEducationTrend(rows, 'mbo', codes, 'total', periods)[0].lower,
      buildEducationTrend(rows, 'mbo', codes, 'total', periods)[0].upper,
    ],
    [10, 14],
  );
  const missingCell = [
    ...rows,
    { ...trendRow('2025', 'man', ''), 'Erkende opleiding code': '99102' },
    { ...trendRow('2025', 'vrouw', '0'), 'Erkende opleiding code': '99102' },
  ];
  assert.equal(
    buildEducationTrend(missingCell, 'mbo', codes, 'total', periods)[0].status,
    'missing',
  );
  const otherYear = [
    ...rows,
    { ...trendRow('2024', 'man', '2'), 'Erkende opleiding code': '99102' },
    { ...trendRow('2024', 'vrouw', '3'), 'Erkende opleiding code': '99102' },
  ];
  assert.equal(
    buildEducationTrend(otherYear, 'mbo', codes, 'total', periods).find(
      (p) => p.year === '2025',
    ).status,
    'incomplete',
  );
});
