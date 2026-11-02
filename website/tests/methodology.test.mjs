import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const cache = new URL('../node_modules/.cache/methodology-tests/', import.meta.url);
await fs.mkdir(cache, { recursive: true });
for (const name of ['Methodology', 'References', 'TopicIcon', 'ui']) {
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
    .outputText.replace(/from '\.\/(References|TopicIcon|ui)'/g, "from './$1.mjs'")
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
    ...html.matchAll(/<section class="methodology-topic"[^>]*><h2>(.*?)<\/h2>/g),
  ].map((m) => m[1]);
  assert.deepEqual(headings, [
    'Invloed van AI',
    'Werkgelegenheid en demografie',
    'Onderwijs en instroom',
    'Samenhang richting 2035',
  ]);
  for (const text of [
    'AI-exposure laat zien',
    'Complementariteit laat zien',
    'Voor 422 van de 436',
    'Firda, Aeres, SVO en ROC Nova College',
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
    'Hoe wordt AI-exposure berekend?',
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
  assert.match(html, /href="#open-data"/);
  assert.doesNotMatch(html, /Dit is geen herhaling van de oorspronkelijke enquête/);
});
