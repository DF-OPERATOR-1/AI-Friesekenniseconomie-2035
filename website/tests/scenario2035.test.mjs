import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const cache = new URL('../node_modules/.cache/scenario-tests/', import.meta.url);
await fs.mkdir(cache, { recursive: true });
for (const name of [
  'scenario2035',
  'scenarioLabour',
  'scenarioPresentation',
  'educationTrendData',
  'educationPathways',
  'perceptualSelection',
]) {
  const source = await fs.readFile(
    new URL(`../src/components/${name}.ts`, import.meta.url),
    'utf8',
  );
  const output = ts
    .transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    .outputText.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  await fs.writeFile(new URL(`${name}.mjs`, cache), output);
}
const m = await import(new URL('scenario2035.mjs', cache));
const labourData = await import(new URL('scenarioLabour.mjs', cache));
const presentation = await import(new URL('scenarioPresentation.mjs', cache));
const base = { year: 2024, lower: 100, upper: 104 };
const extra = {
  juniorAutomation: false,
  relatedCode: '2310',
  selectedCode: '2120',
  relatedShortage: 20,
  relatedConfirmed: false,
};
const high = {
  title: 'Hoger substitutierisico',
  highExposure: true,
  highComplementarity: false,
};
const market = (demand, cum = { lower: 110, upper: 110 }, patch = {}) =>
  m.calculateMarket(
    {
      source: 'user',
      stock: 1000,
      outflow: 110,
      demand,
      tolerance: 5,
      aiEffect: 0,
      ...patch,
    },
    cum,
  );
test('2025–2035 contains eleven years and preserves unrounded suppressed ranges', () => {
  const p = m.projectGraduates(base, 0, 25, 80);
  assert.equal(p.length, 11);
  assert.equal(p[0].year, 2025);
  assert.equal(p.at(-1).year, 2035);
  assert.deepEqual(p[0].inflow, { lower: 20, upper: 20.8 });
  assert.deepEqual(m.addIntervals(p.map((x) => x.inflow)), {
    lower: 220,
    upper: 228.80000000000004,
  });
  assert.equal(
    m.projectGraduates(base, 10, 100, 100).at(-1).graduates.lower,
    100 * 1.1 ** 11,
  );
  assert.equal(m.projectGraduates(base, -100, 100, 100).at(-1).graduates.upper, 0);
  assert.equal(m.projectGraduates(base, 101, 100, 100), null);
  assert.equal(m.projectGraduates(base, 0, 101, 100), null);
  assert.equal(m.parseAssumption(''), null);
  assert.equal(m.parseAssumption('0'), 0);
  assert.equal(m.parseAssumption('1,5'), 1.5);
});
test('allocation uses one shared course budget across professions', () => {
  const c = { key: 'hbo:1', occupations: ['2120', '2310', '2511'] };
  assert.equal(m.courseAllocation(c, '2120', {}).value, 100 / 3);
  const overrides = { 'hbo:1': { 2120: '60' } };
  assert.equal(m.courseAllocation(c, '2310', overrides).value, 20);
  assert.equal(
    c.occupations.reduce(
      (s, isco) => s + m.courseAllocation(c, isco, overrides).value,
      0,
    ),
    100,
  );
  assert.ok(
    m.courseAllocation(c, '2310', { 'hbo:1': { 2120: '80', 2310: '30' } }).error,
  );
});
test('course links deduplicate by code, prefer direct and retain missing local coverage', () => {
  const local = {
    education_type: 'hbo',
    code: '1',
    years: { 2025: { names: ['Naam'], levels: ['bachelor'] } },
    occupations: [{ code: '2120', kind: 'DIRECT', degree: 'bachelor' }],
  };
  const national = {
    ...local,
    name: 'Andere naam',
    years: {},
    occupations: [
      { code: '2120', kind: 'KANDIDAAT', degree: 'bachelor' },
      { code: '2310', kind: 'DIRECT', degree: 'bachelor' },
    ],
  };
  const courses = m.linkedScenarioCourses(
    [local],
    [national, { ...national, code: '2' }],
    '2120',
  );
  assert.equal(courses.length, 2);
  assert.equal(courses.find((c) => c.code === '1').name, 'Naam');
  assert.equal(courses.find((c) => c.code === '1').kind, 'DIRECT');
  assert.equal(courses.find((c) => c.code === '2').localYear, undefined);
  assert.deepEqual(m.linkedScenarioCourses([local], [national], '212'), []);
});
test('labour balance handles tolerance, ranges, zero and invalid assumptions', () => {
  assert.equal(market(1000).balance, 'balanced');
  assert.equal(market(1100).balance, 'shortage');
  assert.equal(market(900).balance, 'surplus');
  assert.equal(market(1000, { lower: 50, upper: 200 }).balance, 'uncertain');
  assert.equal(market(null), null);
  assert.equal(market(1000, undefined, { outflow: 1001 }), null);
  assert.equal(market(1000, undefined, { aiEffect: -10 }).demand, 900);
  assert.equal(
    market(0, { lower: 0, upper: 0 }, { stock: 0, outflow: 0 }).balance,
    'balanced',
  );
  assert.equal(market(1000, { lower: 60, upper: 60 }).balance, 'balanced');
});
test('only five scenarios; deficit can coexist with starter assumptions', () => {
  assert.equal(m.SCENARIOS.length, 5);
  const selected = m.selectScenarios(
    market(1100),
    high,
    { lower: 10, upper: 10 },
    { ...extra, juniorAutomation: true },
  );
  assert.equal(selected.main.id, 2);
  assert.deepEqual(
    selected.additional.map((x) => x.id),
    [4],
  );
  assert.equal(
    m.selectScenarios(market(900), high, { lower: 10, upper: 10 }, extra).main.id,
    1,
  );
  assert.equal(
    m.selectScenarios(market(1000), high, { lower: 10, upper: 10 }, extra).main.id,
    3,
  );
  assert.equal(
    m.selectScenarios(
      market(900),
      { ...high, title: 'Beperkte directe AI-impact', highExposure: false },
      null,
      extra,
    ).main,
    null,
  );
  assert.equal(
    m.selectScenarios(
      null,
      high,
      { lower: 1, upper: 1 },
      { ...extra, juniorAutomation: true },
    ).main,
    null,
  );
});
test('mobility requires explicit related shortage; exposure alone cannot trigger starters', () => {
  const ai = { ...high, title: 'Potentieel productiviteitswinst' };
  assert.equal(
    m.selectScenarios(market(900), ai, { lower: 1, upper: 1 }, extra).main,
    null,
  );
  assert.equal(
    m.selectScenarios(
      market(900),
      ai,
      { lower: 1, upper: 1 },
      { ...extra, relatedConfirmed: true },
    ).main.id,
    5,
  );
  assert.equal(
    m.selectScenarios(market(900), ai, null, {
      ...extra,
      relatedConfirmed: true,
      relatedCode: '2120',
    }).main,
    null,
  );
  assert.equal(
    m.selectScenarios(
      market(900),
      ai,
      { lower: 0, upper: 0 },
      { ...extra, juniorAutomation: true },
    ).main,
    null,
  );
});
test('AI thresholds retain existing median boundaries and missing values', () => {
  const p = (raw, comp) => ({ map_exposure: raw, ai_complementarity: { value: comp } });
  const profiles = [p(0, 0), p(1, 1), p(2, 2)];
  assert.equal(m.scenarioAI(profiles, profiles[1]).highExposure, null);
  assert.equal(m.scenarioAI(profiles, profiles[2]).highExposure, true);
  assert.equal(m.scenarioAI(profiles, p(null, 1)).highExposure, null);
});
test('empty or mismatched forecasts are not fabricated as zero', () => {
  assert.equal(m.aggregateProjections([]), null);
  assert.equal(m.aggregateProjections([[]]), null);
  assert.equal(m.educationBaseline([], 'hbo', '1'), null);
  assert.equal(m.formatInterval(null), 'Niet beschikbaar');
});

test('actual DUO graduation base uses 2024 without treating unavailable 2025 as observed', async () => {
  const csv = (
    await fs.readFile(
      new URL(
        '../public/data/research/afgestudeerden_hbo_friesland.csv',
        import.meta.url,
      ),
      'utf8',
    )
  )
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
  const headers = csv.shift().split(';');
  const rows = csv.map((line) =>
    Object.fromEntries(line.split(';').map((value, index) => [headers[index], value])),
  );
  const baseline = m.educationBaseline(rows, 'hbo', '30029');
  assert.deepEqual(baseline, { year: 2024, lower: 89, upper: 89 });
  assert.equal(
    m.addIntervals(m.projectGraduates(baseline, 0, 100, 100).map((p) => p.inflow))
      .lower,
    979,
  );
  const bad = [
    ...rows,
    { 'OPLEIDINGSCODE ACTUEEL': '30029', Jaar: '2025', Aantal: '' },
  ];
  assert.equal(m.educationBaseline(bad, 'hbo', '30029'), null);
});
test('all real AI profiles use exactly the existing map classification', async () => {
  const profiles = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/profiles.json', import.meta.url),
      'utf8',
    ),
  );
  const { interpretMapPoint } = await import(new URL('perceptualSelection.mjs', cache));
  const complete = profiles.filter(
    (p) => p.map_exposure !== null && p.ai_complementarity.value !== null,
  );
  const median = (values) => {
    const a = values.sort((a, b) => a - b),
      i = Math.floor(a.length / 2);
    return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2;
  };
  const em = median(complete.map((p) => p.map_exposure)),
    cm = median(complete.map((p) => p.ai_complementarity.value));
  for (const profile of complete)
    assert.equal(
      m.scenarioAI(profiles, profile).title,
      interpretMapPoint(
        {
          raw: profile.map_exposure,
          complementarity: profile.ai_complementarity.value,
        },
        em,
        cm,
      ).title,
    );
});
test('split source relations share the same allocation budget even when one source lacks the selected ISCO', () => {
  const common = {
    code: '1',
    education_type: 'hbo',
    years: { 2025: { names: ['Test'], levels: ['bachelor'] } },
  };
  const local = { ...common, occupations: [{ code: '2310', kind: 'DIRECT' }] };
  const national = { ...common, occupations: [{ code: '2120', kind: 'DIRECT' }] };
  const first = m.linkedScenarioCourses([local], [national], '2120')[0];
  const second = m.linkedScenarioCourses([local], [national], '2310')[0];
  assert.deepEqual(new Set(first.occupations), new Set(second.occupations));
  assert.equal(
    m.courseAllocation(first, '2120', {}).value +
      m.courseAllocation(second, '2310', {}).value,
    100,
  );
});
test('stable demand and missing AI do not force an unsupported scenario', () => {
  const moving = market(2000, { lower: 1110, upper: 1110 });
  assert.equal(moving.balance, 'balanced');
  assert.equal(moving.stableDemand, false);
  assert.equal(
    m.selectScenarios(moving, high, { lower: 10, upper: 10 }, extra).main,
    null,
  );
  const noAI = {
    title: 'AI-profiel niet beschikbaar',
    highExposure: null,
    highComplementarity: null,
  };
  assert.equal(m.selectScenarios(market(1100), noAI, null, extra).main.id, 2);
  assert.equal(m.selectScenarios(market(900), noAI, null, extra).main, null);
});

test('scenario selection contains all local education types and respects matching degrees', () => {
  const profiles = ['2120', '2310', '2511', '1111', '9999'].map((isco_code) => ({
    isco_code,
    cbs_relevance: isco_code === '1111' ? { note: 'Beperkt' } : null,
  }));
  const course = {
    code: '1',
    education_type: 'hbo',
    years: { 2025: { levels: ['bachelor'] } },
    occupations: [
      { code: '2120', kind: 'DIRECT', degree: 'bachelor' },
      { code: '2310', kind: 'DIRECT', degree: 'master' },
      { code: '1111', kind: 'DIRECT', degree: 'bachelor' },
    ],
  };
  const mbo = {
    ...course,
    education_type: 'mbo',
    occupations: [{ code: '2511', kind: 'DIRECT' }],
  };
  const noLocalYear = {
    ...course,
    code: '3',
    years: {},
    occupations: [{ code: '9999', kind: 'DIRECT' }],
  };
  assert.deepEqual(
    m
      .availableScenarioProfiles(profiles, [course, mbo, noLocalYear])
      .map((p) => p.isco_code),
    ['2120', '2511'],
  );
  assert.deepEqual(m.availableScenarioProfiles(profiles, []), []);
});
test('local scenario professions and both DUO series use the existing Friese selection', async () => {
  const { courses } = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/opleidingen.json', import.meta.url),
      'utf8',
    ),
  );
  const profiles = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/profiles.json', import.meta.url),
      'utf8',
    ),
  );
  const available = m.availableScenarioProfiles(profiles, courses);
  assert.ok(available.length > 0 && available.length < profiles.length);
  assert.ok(available.some((p) => p.isco_code === '2120'));
  for (const p of available)
    assert.ok(
      m
        .linkedScenarioCourses(courses, [], p.isco_code)
        .every((c) => c.localYear && ['hbo', 'wo'].includes(c.type)),
    );
  const lines = (
    await fs.readFile(
      new URL('../public/data/research/studenten_hbo_friesland.csv', import.meta.url),
      'utf8',
    )
  )
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
  const headers = lines.shift().split(';');
  const rows = lines.map((line) =>
    Object.fromEntries(line.split(';').map((v, i) => [headers[i], v])),
  );
  assert.deepEqual(m.educationBaseline(rows, 'hbo', '30029'), {
    year: 2025,
    lower: 584,
    upper: 592,
  });
});

test('mbo old and current codes form one course and one allocation budget', () => {
  const countCodes = ['25195', '25718'];
  const countPeriods = [
    { code: '25195', start: '20150801', end: '20280801' },
    { code: '25718', start: '20210801', end: '0' },
  ];
  const courses = countCodes.map((code) => ({
    code,
    education_type: 'mbo',
    countCodes,
    countPeriods,
    years: {
      2025: { names: [code === '25718' ? 'Fotograaf' : 'Oude naam'], levels: ['4'] },
    },
    occupations: [
      { code: '3431', kind: 'VOORSTEL' },
      { code: '3432', kind: 'VOORSTEL' },
    ],
  }));
  const linked = m.linkedScenarioCourses(courses, [], '3431');
  assert.equal(linked.length, 1);
  assert.equal(linked[0].code, '25718');
  assert.equal(linked[0].name, 'Fotograaf');
  assert.equal(linked[0].kind, 'VOORSTEL');
  assert.deepEqual(linked[0].countCodes, countCodes);
  assert.equal(m.courseAllocation(linked[0], '3431', {}).value, 50);
});
test('mbo baselines include historical DUO codes and retain the same suppressed bands as education pages', async () => {
  const data = JSON.parse(
    await fs.readFile(
      new URL('../public/data/atlas/opleidingen.json', import.meta.url),
      'utf8',
    ),
  );
  const family = data.code_families.find((f) => f.id === 'junior-accountmanager');
  const codes = family.codes.map((c) => c.code);
  for (const [file, lower, upper] of [
    ['studenten_mbo_friesland.csv', 145, 153],
    ['afgestudeerden_mbo_friesland.csv', 30, 46],
  ]) {
    const lines = (
      await fs.readFile(
        new URL(`../public/data/research/${file}`, import.meta.url),
        'utf8',
      )
    )
      .replace(/^\uFEFF/, '')
      .trim()
      .split(/\r?\n/);
    const headers = lines.shift().split(';');
    const rows = lines.map((line) =>
      Object.fromEntries(line.split(';').map((v, i) => [headers[i], v])),
    );
    assert.deepEqual(m.educationBaseline(rows, 'mbo', codes, family.codes), {
      year: 2025,
      lower,
      upper,
    });
  }
});

test('labour sources arrive and refresh without replacing user scenarios, including explicit empty and zero', () => {
  const source = { value: 500, source: 'Testbron', referenceYear: 2025 };
  assert.deepEqual(labourData.resolveLabourValue(undefined, undefined), {
    value: '',
    origin: 'missing',
    source: undefined,
  });
  assert.equal(labourData.resolveLabourValue(source, undefined).value, '500');
  assert.equal(labourData.resolveLabourValue(source, undefined).origin, 'data');
  for (const override of ['600', '', '0']) {
    const resolved = labourData.resolveLabourValue(source, override);
    assert.equal(resolved.value, override);
    assert.equal(resolved.origin, 'user');
    assert.equal(
      labourData.resolveLabourValue({ ...source, value: 700 }, override).value,
      override,
    );
  }
  assert.equal(source.value, 500);
  assert.equal(
    labourData.resolveLabourValue({ ...source, value: 0 }, undefined).value,
    '0',
  );
  for (const value of [-1, NaN, Infinity])
    assert.equal(
      labourData.resolveLabourValue({ ...source, value }, undefined).value,
      '',
    );
});

test('reset restores latest labour source without affecting other fields or occupations and recalculates balance', () => {
  const overrides = { 1111: { stock: '600', outflow: '100' }, 2222: { stock: '800' } };
  const reset = labourData.resetLabourValue(overrides, '1111', 'stock');
  const observation = { value: 500, source: 'Testbron', referenceYear: 2025 };
  const before = labourData.resolveLabourValue(observation, overrides['1111'].stock);
  const restored = labourData.resolveLabourValue(observation, reset['1111'].stock);
  const calculate = (entry) =>
    m.calculateMarket(
      {
        source: entry.origin === 'data' ? 'data' : 'user',
        stock: m.parseAssumption(entry.value),
        outflow: 100,
        demand: 550,
        tolerance: 5,
        aiEffect: 0,
      },
      { lower: 50, upper: 54 },
    );
  assert.deepEqual(calculate(before).supply, { lower: 550, upper: 554 });
  assert.deepEqual(calculate(restored).supply, { lower: 450, upper: 454 });
  assert.equal(restored.origin, 'data');
  assert.equal(reset['1111'].outflow, '100');
  assert.equal(reset['2222'].stock, '800');
  assert.equal(overrides['1111'].stock, '600');
  assert.equal(
    labourData.resolveLabourValue({ ...observation, value: 510 }, reset['1111'].stock)
      .value,
    '510',
  );
  assert.equal(labourData.resolveLabourValue(undefined, reset['1111'].stock).value, '');
});

test('education filters only change visible rows; hidden course allocations and projections remain in totals', () => {
  const courses = [
    {
      key: 'mbo:1',
      code: '1',
      type: 'mbo',
      name: 'Techniek',
      occupations: ['1111', '2222'],
    },
    { key: 'hbo:2', code: '2', type: 'hbo', name: 'Économie', occupations: ['1111'] },
    { key: 'wo:3', code: '3', type: 'wo', name: 'Rechten', occupations: ['1111'] },
  ];
  const overrides = { 'mbo:1': { 1111: '25', 2222: '75' } };
  const rows = courses.map((course) => ({
    course,
    projection: m.projectGraduates(
      base,
      0,
      m.courseAllocation(course, '1111', overrides).value,
      100,
    ),
  }));
  const original = structuredClone(rows);
  const total = () => m.aggregateProjections(rows.map((row) => row.projection));
  const before = total();
  for (const [type, query, count] of [
    ['mbo', '', 1],
    ['hbo', 'economie', 1],
    ['wo', '', 1],
    ['', '2', 1],
    ['', 'unknown', 0],
    ['', '', 3],
  ]) {
    const visible = presentation.filterScenarioCourses(rows, type, query);
    assert.equal(visible.length, count);
    assert.deepEqual(total(), before);
    assert.deepEqual(rows, original);
  }
  assert.equal(presentation.filterScenarioCourses(rows, 'mbo', '')[0], rows[0]);
  // Changing an individual setting persists through searches and recomputes the full population.
  overrides['mbo:1']['1111'] = '50';
  overrides['mbo:1']['2222'] = '50';
  rows[0].projection = m.projectGraduates(
    base,
    0,
    m.courseAllocation(courses[0], '1111', overrides).value,
    100,
  );
  presentation.filterScenarioCourses(rows, 'wo', 'Rechten');
  assert.notDeepEqual(total(), before);
  assert.equal(
    presentation.filterScenarioCourses(rows, '', '')[0].projection,
    rows[0].projection,
  );
  // A hidden invalid allocation is still invalid; filtering never repairs or discards it.
  overrides['mbo:1']['2222'] = '80';
  presentation.filterScenarioCourses(rows, 'hbo', '');
  assert.ok(m.courseAllocation(courses[0], '1111', overrides).error);
});

test('definitive graduate method: zero, positive and negative growth use the actual DUO source year for all eleven years', () => {
  for (const sourceYear of [2021, 2024, 2025]) {
    for (const growth of [0, 2, -2]) {
      const baseline = { year: sourceYear, lower: 100, upper: 100 };
      const result = m.projectGraduates(baseline, growth, 25, 80);
      assert.deepEqual(
        result.map((point) => point.year),
        Array.from({ length: 11 }, (_, i) => 2025 + i),
      );
      for (const point of result) {
        const graduates = 100 * (1 + growth / 100) ** (point.year - sourceYear);
        assert.equal(point.graduates.lower, graduates);
        assert.equal(point.graduates.upper, graduates);
        assert.ok(Math.abs(point.inflow.lower - graduates * 0.25 * 0.8) < 1e-10);
      }
      const expectedTotal = Array.from(
        { length: 11 },
        (_, i) => 100 * (1 + growth / 100) ** (2025 + i - sourceYear) * 0.25 * 0.8,
      ).reduce((sum, value) => sum + value, 0);
      assert.ok(
        Math.abs(
          m.addIntervals(result.map((point) => point.inflow)).lower - expectedTotal,
        ) < 1e-10,
      );
    }
  }
  assert.equal(
    m.projectGraduates({ year: 2024, lower: 100, upper: 100 }, 2, 100, 100).at(-1)
      .graduates.lower,
    100 * 1.02 ** 11,
  );
  assert.equal(
    m.projectGraduates({ year: 2025, lower: 100, upper: 100 }, 2, 100, 100).at(-1)
      .graduates.lower,
    100 * 1.02 ** 10,
  );
});

test('multiple graduate cohorts aggregate before presentation, including suppressed counts and changed profession shares', () => {
  const course = { key: 'hbo:privacy', occupations: ['1111', '2222', '3333'] };
  const suppressed = { year: 2024, lower: 0, upper: 4 };
  const other = { year: 2025, lower: 28, upper: 28 };
  const original = structuredClone({ course, suppressed, other });
  const autoShare = m.courseAllocation(course, '1111', {}).value;
  const automatic = m.projectGraduates(suppressed, 2, autoShare, 80);
  const second = m.projectGraduates(other, -2, 50, 80);
  const total = m.aggregateProjections([automatic, second]);
  assert.equal(automatic.at(-1).inflow.lower, 0);
  assert.ok(
    Math.abs(automatic.at(-1).inflow.upper - ((4 * 1.02 ** 11) / 3) * 0.8) < 1e-12,
  );
  assert.equal(
    total.at(-1).inflow.upper,
    automatic.at(-1).inflow.upper + second.at(-1).inflow.upper,
  );
  const cumulative = m.addIntervals(total.map((point) => point.inflow));
  const perCourse = m.addIntervals([
    m.addIntervals(automatic.map((point) => point.inflow)),
    m.addIntervals(second.map((point) => point.inflow)),
  ]);
  assert.ok(Math.abs(cumulative.lower - perCourse.lower) < 1e-10);
  assert.ok(Math.abs(cumulative.upper - perCourse.upper) < 1e-10);
  const changedShare = m.courseAllocation(course, '1111', {
    [course.key]: { 1111: '50,0' },
  }).value;
  const changed = m.aggregateProjections([
    m.projectGraduates(suppressed, 2, changedShare, 80),
    second,
  ]);
  assert.ok(changed.at(-1).inflow.upper > total.at(-1).inflow.upper);
  assert.deepEqual({ course, suppressed, other }, original);
  // Students are source information, not an argument to any projection or aggregate.
  assert.deepEqual(m.projectGraduates(suppressed, 0, 100, 100)[0].inflow, {
    lower: 0,
    upper: 4,
  });
});

test('display whole persons and outward ranges without collapsing DUO uncertainty or rounding calculations', () => {
  assert.equal(m.formatInterval({ lower: 0, upper: 4 }), '0–4');
  assert.equal(m.formatInterval({ lower: 19.6, upper: 20.3 }), '19–21');
  assert.equal(m.formatInterval({ lower: 3872.1, upper: 4466.2 }), '3.872–4.467');
  assert.equal(m.formatInterval({ lower: 19.6, upper: 19.6 }), '20');
  assert.equal(m.formatInterval({ lower: 0.01, upper: 0.4 }), '0–1');
  assert.equal(m.formatInterval({ lower: 1e-11, upper: 2e-11 }), '0–1');
  assert.equal(m.formatInterval(null), 'Niet beschikbaar');
  const inflow = m.projectGraduates(base, 2, 100 / 3, 80);
  const before = structuredClone(inflow);
  for (const point of inflow) m.formatInterval(point.inflow);
  assert.deepEqual(inflow, before);
  assert.equal(presentation.isSmallAnnualInflow({ lower: 0.4, upper: 0.4 }), true);
  for (const value of [
    null,
    { lower: 0, upper: 0 },
    { lower: 0, upper: 0.4 },
    { lower: 1, upper: 1 },
  ])
    assert.equal(presentation.isSmallAnnualInflow(value), false);
});

test('percentage presentation uses Dutch comma and at most one decimal, preserving exact stored model shares', () => {
  assert.equal(presentation.formatScenarioPercentage(''), '');
  assert.equal(presentation.formatScenarioPercentage('0.0'), '0');
  assert.equal(presentation.formatScenarioPercentage(100 / 3), '33,3');
  assert.equal(presentation.formatScenarioPercentage('16,67'), '16,7');
  assert.equal(presentation.formatScenarioPercentage('-2.34'), '-2,3');
  const course = { key: 'hbo:1', occupations: ['1111', '2222', '3333'] };
  const exact = m.courseAllocation(course, '1111', {}).value;
  presentation.formatScenarioPercentage(exact);
  assert.equal(exact, 100 / 3);
  assert.equal(m.courseAllocation(course, '1111', {}).value, 100 / 3);
});

test('compact result keeps all five existing scenario selections and supplies a two-sentence explanation and action', () => {
  const supportive = {
    ...high,
    title: 'Potentieel productiviteitswinst',
    highComplementarity: true,
  };
  const examples = [
    [market(900), high, extra, 1],
    [market(1100), supportive, extra, 2],
    [market(1000), high, extra, 3],
    [
      market(1000, { lower: 50, upper: 200 }),
      high,
      { ...extra, juniorAutomation: true },
      4,
    ],
    [market(900), supportive, { ...extra, relatedConfirmed: true }, 5],
  ];
  for (const [balance, ai, assumptions, id] of examples) {
    const result = m.selectScenarios(balance, ai, { lower: 1, upper: 4 }, assumptions);
    assert.equal(result.main.id, id);
    assert.equal(result.main.title, m.SCENARIOS[id - 1].title);
    const copy = presentation.scenarioResultCopy(id, ai);
    assert.ok(copy.explanation.length > 0);
    assert.ok(copy.action.length > 0);
    for (const text of [copy.explanation, copy.action, copy.consequences])
      assert.ok(text.split(/(?<=[.!?])\s+/).filter(Boolean).length <= 2);
  }
  assert.equal(presentation.scenarioResultCopy(99, high), null);
  assert.equal(
    m.selectScenarios(
      null,
      high,
      { lower: 1, upper: 4 },
      { ...extra, juniorAutomation: true, relatedConfirmed: true },
    ).main,
    null,
  );
  assert.equal(
    m.selectScenarios(examples[3][0], high, { lower: 1, upper: 4 }, extra).main,
    null,
  );
  assert.equal(
    m.selectScenarios(market(900), supportive, { lower: 1, upper: 4 }, extra).main,
    null,
  );
});

test('shortage and surplus amounts have positive correctly ordered bounds, with neutral signed differences around equilibrium', () => {
  const shortage = presentation.scenarioBalanceDisplay(
    market(1100, { lower: 100, upper: 120 }),
  );
  assert.deepEqual(shortage, {
    label: 'Mogelijk tekort',
    value: { lower: 90, upper: 110 },
  });
  assert.equal(m.formatInterval(shortage.value), '90–110');
  const surplus = presentation.scenarioBalanceDisplay(
    market(800, { lower: 100, upper: 120 }),
  );
  assert.deepEqual(surplus, {
    label: 'Mogelijk overschot',
    value: { lower: 190, upper: 210 },
  });
  const balanced = presentation.scenarioBalanceDisplay(
    market(1000, { lower: 100, upper: 120 }),
  );
  assert.equal(balanced.label, 'Ongeveer in evenwicht');
  assert.deepEqual(balanced.value, { lower: -10, upper: 10 });
  const uncertain = presentation.scenarioBalanceDisplay(
    market(1000, { lower: 50, upper: 200 }),
  );
  assert.equal(uncertain.label, 'Verschil bij onzekere balans');
  assert.deepEqual(uncertain.value, { lower: -60, upper: 90 });
});

test('shortage explanation respects actual AI profile instead of assuming AI support for every occupation', () => {
  const limited = presentation.scenarioResultCopy(2, {
    ...high,
    title: 'Beperkte directe AI-impact',
    highExposure: false,
  });
  assert.match(limited.explanation, /beperkte directe invloed/);
  const supportive = presentation.scenarioResultCopy(2, {
    ...high,
    highComplementarity: true,
  });
  assert.match(supportive.explanation, /werkzaamheden ondersteunen/);
  assert.notEqual(limited.explanation, supportive.explanation);
});

test('student context uses the exact graduate source year and never falls back to a different cohort', async () => {
  const readRows = async (file) => {
    const lines = (
      await fs.readFile(
        new URL(`../public/data/research/${file}`, import.meta.url),
        'utf8',
      )
    )
      .replace(/^\uFEFF/, '')
      .trim()
      .split(/\r?\n/);
    const headers = lines.shift().split(';');
    return lines.map((line) =>
      Object.fromEntries(
        line.split(';').map((value, index) => [headers[index], value]),
      ),
    );
  };
  const graduates = await readRows('afgestudeerden_hbo_friesland.csv');
  const students = await readRows('studenten_hbo_friesland.csv');
  const baseline = m.educationBaseline(graduates, 'hbo', '30029');
  const sameYear = m.educationCountsAtYear(students, 'hbo', '30029', baseline.year);
  assert.equal(sameYear.year, baseline.year);
  const original = structuredClone(baseline);
  assert.equal(
    m.educationCountsAtYear(
      students.filter((row) => row.Jaar !== String(baseline.year)),
      'hbo',
      '30029',
      baseline.year,
    ),
    null,
  );
  assert.equal(m.educationCountsAtYear(students, 'hbo', '30029', 2019), null);
  assert.deepEqual(baseline, original);
  const projection = m.projectGraduates(baseline, 2, 50, 80);
  for (const year of [2021, 2022, 2023, 2024, 2025]) {
    const shownGraduates = m.educationCountsAtYear(graduates, 'hbo', '30029', year);
    const shownStudents = m.educationCountsAtYear(students, 'hbo', '30029', year);
    if (shownGraduates) assert.equal(shownGraduates.year, year);
    if (shownStudents) assert.equal(shownStudents.year, year);
    assert.deepEqual(m.projectGraduates(baseline, 2, 50, 80), projection);
  }
});

test('cumulative trend is a running sum of annual unrounded inflow and ends at the existing total', () => {
  const annual = m.aggregateProjections([
    m.projectGraduates(base, 2, 100 / 3, 80),
    m.projectGraduates({ year: 2025, lower: 0, upper: 4 }, -2, 50, 80),
  ]);
  const original = structuredClone(annual);
  const trend = presentation.cumulativeInflowSeries(annual);
  assert.equal(trend.length, 11);
  for (let index = 0; index < annual.length; index++) {
    assert.equal(trend[index].year, annual[index].year);
    assert.deepEqual(
      trend[index].inflow,
      m.addIntervals(annual.slice(0, index + 1).map((point) => point.inflow)),
    );
  }
  assert.deepEqual(
    trend.at(-1).inflow,
    m.addIntervals(annual.map((point) => point.inflow)),
  );
  assert.deepEqual(annual, original);
  assert.deepEqual(presentation.cumulativeInflowSeries([]), []);
});

test('Dutch count input displays grouping and keeps raw numbers, emptiness and validation intact', () => {
  assert.equal(presentation.formatScenarioCountInput('10000'), '10.000');
  assert.equal(presentation.formatScenarioCountInput('1000000'), '1.000.000');
  assert.equal(presentation.formatScenarioCountInput('10000.5'), '10.000,5');
  assert.equal(presentation.formatScenarioCountInput(''), '');
  assert.equal(presentation.formatScenarioCountInput('0'), '0');
  assert.equal(presentation.normalizeScenarioCountInput('10.000'), '10000');
  assert.equal(presentation.normalizeScenarioCountInput('1.000.000'), '1000000');
  assert.equal(presentation.normalizeScenarioCountInput('10.000,5'), '10000.5');
  assert.equal(presentation.normalizeScenarioCountInput('10 000'), '10000');
  assert.equal(
    m.parseAssumption(presentation.normalizeScenarioCountInput('-10.000')),
    null,
  );
  assert.equal(m.parseAssumption(presentation.normalizeScenarioCountInput('')), null);
  assert.equal(
    m.parseAssumption(presentation.normalizeScenarioCountInput('10.000')),
    10000,
  );
});
