import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile(
  new URL('../scripts/devDocsSync.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { isDocsSource, createDocsBuildQueue } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await pause(10);
  }
  assert.fail('De verwachte build is niet gestart');
}

test('only website sources trigger docs builds; generated files never create a loop', () => {
  const root = '/project/website';
  for (const path of [
    'src/styles/global.css',
    'src/components/Education.tsx',
    'index.html',
    'vite.config.ts',
    'public/assets/logo.svg',
    'package.json',
  ])
    assert.equal(isDocsSource(root, `${root}/${path}`), true, path);
  for (const path of [
    'dist/assets/index.css',
    'node_modules/vite/index.js',
    'public/data/atlas/profiles.json',
    '../docs/index.html',
    '../data/raw/source.csv',
  ])
    assert.equal(isDocsSource(root, `${root}/${path}`), false, path);
});

test('rapid saves are combined and changes during a build are processed afterwards without overlap', async () => {
  const releases = [];
  let active = 0,
    maximum = 0,
    builds = 0;
  const queue = createDocsBuildQueue(() => {
    builds++;
    active++;
    maximum = Math.max(maximum, active);
    return new Promise((resolve) =>
      releases.push(() => {
        active--;
        resolve();
      }),
    );
  }, 5);
  try {
    queue.schedule();
    queue.schedule();
    queue.schedule();
    await waitFor(() => builds === 1);
    queue.schedule();
    queue.schedule();
    await pause(20);
    assert.equal(builds, 1);
    releases.shift()();
    await waitFor(() => builds === 2);
    releases.shift()();
    await pause(20);
    assert.equal(builds, 2);
    assert.equal(maximum, 1);
  } finally {
    queue.stop();
    for (const release of releases) release();
  }
});

test('stopping the dev server cancels pending and future docs builds', async () => {
  let builds = 0;
  const queue = createDocsBuildQueue(async () => {
    builds++;
  }, 5);
  queue.schedule();
  queue.stop();
  queue.schedule();
  await pause(20);
  assert.equal(builds, 0);
});
