import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const cache = new URL('../node_modules/.cache/methodology-tests/', import.meta.url);
await fs.mkdir(cache, { recursive: true });
for (const name of [
  'Methodology',
  'References',
  'TopicIcon',
  'ui',
  'EducationAccountability',
  'EducationSources',
  'ResearchDownloads',
  'SourceInformation',
]) {
  const source = await fs.readFile(
    new URL(`../src/components/${name}.tsx`, import.meta.url),
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
    .outputText.replaceAll('import.meta.env.BASE_URL', "'/'")
    .replace(
      /from '\.\/(References|TopicIcon|ui|EducationAccountability|EducationSources|SourceInformation)'/g,
      "from './$1.mjs'",
    )
    .replace(
      /import (\w+) from '(.*?\.svg)';/g,
      (_, name, path) => `const ${name} = ${JSON.stringify(path)};`,
    );
  await fs.writeFile(new URL(`${name}.mjs`, cache), output);
}
const { Methodology } = await import(new URL('Methodology.mjs', cache));
const html = renderToStaticMarkup(React.createElement(Methodology));
function visibleContent(markup) {
  let depth = 0,
    previous = 0,
    visible = '';
  for (const match of markup.matchAll(/<details\b[^>]*>|<\/details>/g)) {
    if (depth === 0) visible += markup.slice(previous, match.index);
    depth += match[0].startsWith('</') ? -1 : 1;
    previous = match.index + match[0].length;
  }
  return visible + markup.slice(previous);
}

test('methodologie toont vier hoofdsecties en compacte kernkeuzes zonder klikken', () => {
  const visible = visibleContent(html);
  const headings = [
    ...html.matchAll(/<section class="methodology-topic"[^>]*><h2\b[^>]*>(.*?)<\/h2>/g),
  ].map((m) => m[1]);
  assert.deepEqual(headings, [
    'Invloed van AI',
    'Werkgelegenheid en demografie',
    'Onderwijs en instroom',
    'Samenhang richting 2035',
  ]);
  for (const text of [
    'AI-blootstelling laat zien',
    'Complementariteit laat zien',
    'Voor 422 van de 436',
    'We gebruiken zes bestanden van Dienst Uitvoering Onderwijs (DUO)',
    'nog geen gevalideerde voorspellingen',
  ])
    assert.ok(visible.includes(text));
  assert.doesNotMatch(
    visible,
    /Afgeschermde aantallen|gedeeld door 600|IMF-referentiewaarden/,
  );
});
test('technische details, formule en volledige bronvermeldingen blijven ingeklapt beschikbaar', () => {
  const summaries = [...html.matchAll(/<summary>(.*?)<\/summary>/g)].map((m) => m[1]);
  for (const title of [
    'Hoe wordt AI-blootstelling berekend?',
    'Hoe wordt complementariteit berekend?',
    'Hoe koppelen we Amerikaanse beroepen aan ISCO-08?',
    'Hoe hebben we de resultaten gecontroleerd?',
    'Welke arbeidsmarktgegevens gebruiken we?',
    'Hoe zijn de onderwijsgegevens geselecteerd en verwerkt?',
  ])
    assert.ok(summaries.includes(title));
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:=|\s|>)/);
  for (const text of [
    'gedeeld door 600',
    'elf werkcontexten',
    '52 menselijke vermogens',
    'Job Zones',
    'IMF-referentiewaarden',
    'Afgeschermde aantallen',
  ])
    assert.ok(html.includes(text));
  assert.match(html, /doi.org/);
  assert.doesNotMatch(html, /href="#open-data"/);
  assert.doesNotMatch(html, /Dit is geen herhaling van de oorspronkelijke enquête/);
});

test('opleidingskoppelingen staan als uitklapper binnen Onderwijs en instroom', () => {
  const education = html
    .split('id="methodologie-onderwijs-instroom"')[1]
    .split('id="methodologie-samenhang"')[0];
  assert.match(
    education,
    /<details class="methodology-disclosure" id="opleiding-beroep-verantwoording">/,
  );
  assert.match(
    education,
    /<summary>Hoe koppelen wij opleidingen aan beroepen\?<\/summary>/,
  );
  assert.match(education, /Hbo en wo · koppeling aan ISCO-08/);
  assert.match(education, /Mbo · kwalificaties en geschatte beroepskoppelingen/);
  assert.match(education, /Literatuurlijst/);
  assert.doesNotMatch(
    visibleContent(html),
    /Wij gebruiken twee onderwijsclassificaties/,
  );
  assert.doesNotMatch(
    education,
    /nog niet gekoppeld aan\s*beroepsgroepen|een gevalideerde\s*koppeling tussen opleidingen en beroepen ontbreekt/,
  );
  assert.equal((html.match(/id="opleiding-beroep-verantwoording"/g) ?? []).length, 1);
});

const { EducationSources, OccupationContentSources } = await import(
  new URL('EducationSources.mjs', cache)
);
const occupationHtml = renderToStaticMarkup(
  React.createElement(OccupationContentSources),
);
const sourceHtml = renderToStaticMarkup(React.createElement(EducationSources));
test('opleidingsbronnen hebben een eigen kop en behouden bronlinks, attributie en wederzijdse verwijzingen', () => {
  assert.match(sourceHtml, /<h2>Opleidingskoppelingen<\/h2>/);
  for (const markup of [sourceHtml + occupationHtml, html]) {
    for (const url of [
      'https://www.s-bb.nl/onderwijs/erkende-opleidingscode/',
      'https://www.competentnl.nl/',
      'https://creativecommons.org/licenses/by/4.0/deed.nl',
      'https://esco.ec.europa.eu/en/classification',
      'https://lcsk.nl/over-ons/studiekeuzedata-raadplegen/',
    ])
      assert.ok(markup.includes(`href="${url}"`), url);
    assert.match(
      markup,
      /This service uses the ESCO classification of the European Commission/,
    );
    assert.match(markup, /Studiekeuzedatabase, versie 26.6/);
    assert.match(markup, /door DataFryslân samengesteld/);
    if (markup === html) assert.match(markup, /niet als CSV beschikbaar gesteld/);
    else assert.doesNotMatch(markup, /niet als CSV beschikbaar gesteld/);
    assert.doesNotMatch(markup, /ho_alle_isco.csv|mbo_beroep_matches.csv/);
  }
  assert.doesNotMatch(
    sourceHtml,
    /href="#methodologie\/opleiding-beroep-verantwoording"/,
  );
  assert.doesNotMatch(html, /href="#open-data\/opleidingskoppelingen"/);
  assert.match(sourceHtml, /id="opleidingskoppelingen"/);
});

test('mbo-toelichting is beknopt en overbodige bronverwijzingen zijn verwijderd', () => {
  assert.match(
    html,
    /schattingen en onderzoeksvoorstellen van DataFryslân. Deze moeten nog worden gevalideerd/,
  );
  assert.match(html, /<h3 id="references-education-mappings">Literatuurlijst<\/h3>/);
  assert.doesNotMatch(
    html,
    /Bekijk deze bronnen bij Bronnen|Bekijk Bronnen &amp; open data|publications.tno.nl/,
  );
  assert.doesNotMatch(sourceHtml, /publications.tno.nl/);
});

const { ResearchDownloads, sourceGroups } = await import(
  new URL('ResearchDownloads.mjs', cache)
);
test('broncatalogus sorteert secties alfabetisch en gebruikt dezelfde compacte regels voor opleidingskoppelingen', async () => {
  const rows = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/catalogue.json', import.meta.url),
      'utf8',
    ),
  );
  const groups = sourceGroups(rows);
  assert.deepEqual(
    groups.map((group) => group.title),
    [
      'AI-beroepsscores',
      'Beroepsinhoud',
      'Onderwijs',
      'Opleidingskoppelingen',
      'Vacatures',
    ],
  );
  const sourceRows = sourceHtml.match(/class="source-row"/g) || [];
  assert.equal(sourceRows.length, 2);
  assert.equal(
    (sourceHtml.match(/<summary>Broninformatie<\/summary>/g) || []).length,
    2,
  );
  const organizations = ['Landelijk Centrum Studiekeuze', 'SBB'];
  for (let i = 1; i < organizations.length; i++)
    assert.ok(
      sourceHtml.indexOf(`<h3>${organizations[i - 1]}</h3>`) <
        sourceHtml.indexOf(`<h3>${organizations[i]}</h3>`),
    );
  const page = renderToStaticMarkup(React.createElement(ResearchDownloads));
  assert.doesNotMatch(page, /Repository en bronverantwoording/);
  assert.match(page, /aria-label="Bronnen per onderwerp" tabindex="0"/);
  assert.doesNotMatch(sourceHtml, /download=/);
});

const { scientificSource, ReferenceList, References } = await import(
  new URL('References.mjs', cache)
);
test('wetenschappelijke publicaties delen dezelfde APA-literatuurlijst met methodologie', () => {
  const source = scientificSource('ISCO08_AIOE.csv');
  assert.ok(source.authors.every((author) => author.startsWith('Felten')));
  assert.equal(source.authors.length, 3);
  assert.ok(source.authors[1].includes('(2023a)'));
  assert.ok(source.authors[2].includes('(2023b)'));
  assert.ok(source.authors.every((author) => !author.includes('DataFryslân')));
  assert.ok(source.processing.includes('DataFryslân'));
  const catalogueList = renderToStaticMarkup(
    React.createElement(ReferenceList, { topics: source.topics }),
  );
  const methodologyList = renderToStaticMarkup(
    React.createElement(References, { topic: 'exposure' }),
  );
  assert.ok(methodologyList.includes(catalogueList));
  for (const doi of [
    '10.1002/smj.3286',
    '10.2139/ssrn.4375268',
    '10.2139/ssrn.4414065',
  ])
    assert.ok(catalogueList.includes(`href="https://doi.org/${doi}"`));
  assert.match(
    catalogueList,
    /<em>Strategic Management Journal, 42<\/em>\(12\), 2195–2217/,
  );
  assert.ok(catalogueList.indexOf('(2021)') < catalogueList.indexOf('(2023a)'));
  assert.ok(catalogueList.indexOf('(2023a)') < catalogueList.indexOf('(2023b)'));
  assert.match(catalogueList, /2023a/);
  assert.match(catalogueList, /2023b/);
  const combined = scientificSource('ISCO08_C_AIOE.csv');
  assert.deepEqual(combined.topics, ['exposure', 'complementarity']);
  const list = renderToStaticMarkup(
    React.createElement(ReferenceList, { topics: combined.topics }),
  );
  assert.equal(
    (list.match(/href="https:\/\/doi.org\/10.1002\/smj.3286"/g) || []).length,
    1,
  );
  assert.match(list, /Pizzinelli/);
  assert.match(list, /International Monetary Fund/);
  assert.equal(scientificSource('studenten_mbo_friesland.csv'), null);
});

test('opleidingsbronnen verwijzen rechtstreeks naar de oorspronkelijke data-aanbieders', () => {
  for (const [label, url] of [
    ['Data aanvragen bij CompetentNL', 'https://www.competentnl.nl/'],
    [
      'Data aanvragen bij Europese Commissie',
      'https://esco.ec.europa.eu/en/classification',
    ],
    [
      'Data aanvragen bij Landelijk Centrum Studiekeuze',
      'https://lcsk.nl/over-ons/studiekeuzedata-raadplegen/',
    ],
  ]) {
    assert.ok(
      (sourceHtml + occupationHtml).includes(`href="${url}" aria-label="${label}"`),
    );
  }
  assert.doesNotMatch(
    sourceHtml,
    /Alleen weergave|niet als CSV beschikbaar gesteld|Lees de methode en verantwoording|Bekijk opleidingen en bijbehorende beroepen/,
  );
  assert.doesNotMatch(sourceHtml, / download[= >]/);
});

test('beroepsinhoud en opleidingskoppelingen bevatten afzonderlijke bronnen zonder dubbele bronregels', () => {
  for (const title of [
    'CompetentNL',
    'Europese Commissie',
    'Centraal Bureau voor de Statistiek',
    'International Labour Organization',
  ]) {
    assert.ok(occupationHtml.includes(`<h3>${title}</h3>`));
    assert.ok(!sourceHtml.includes(`<h3>${title}</h3>`));
  }
  for (const title of ['SBB', 'Landelijk Centrum Studiekeuze']) {
    assert.ok(sourceHtml.includes(`<h3>${title}</h3>`));
    assert.ok(!occupationHtml.includes(`<h3>${title}</h3>`));
  }
  assert.match(
    occupationHtml,
    /beroepsomschrijvingen, werkzaamheden, taken, vaardigheden en kennisgebieden/,
  );
  assert.doesNotMatch(
    occupationHtml,
    /geschatte opleidingskoppelingen|onderzoeksvoorstellen/,
  );
  assert.match(sourceHtml, /opleidingscode|ISCO-beroepen/);
});

test('alle beroeps- en opleidingsbronnen delen dezelfde velden en volgorde van Broninformatie', () => {
  const fields = [
    'Bestand',
    'Wat staat in dit bestand?',
    'Bronorganisatie',
    'Bewerking en berekening',
    'Publicatiejaar',
    'Classificatie',
    'Licentie',
  ];
  for (const section of [sourceHtml, occupationHtml]) {
    for (const article of section.split('<article class="source-row">').slice(1)) {
      assert.deepEqual(
        [...article.matchAll(/<dt>(.*?)<\/dt>/g)].map((match) => match[1]),
        fields,
      );
      assert.ok(article.indexOf('</dl>') < article.indexOf('<h4>Literatuurlijst</h4>'));
      assert.match(
        article,
        /z.d. \(publicatiejaar niet vastgesteld\)|2026 \(laatste release: oktober 2026\)/,
      );
    }
  }
  assert.ok(
    occupationHtml.includes(
      'href="https://www.cbs.nl/-/media/_excel/2021/27/codelijstenisco08.xls"',
    ),
  );
  assert.match(occupationHtml, />Downloadlink<\/a>/);
  assert.match(occupationHtml, /aria-label="Data aanvragen bij CompetentNL"/);
  assert.match(occupationHtml, /aria-label="Data aanvragen bij Europese Commissie"/);
});
