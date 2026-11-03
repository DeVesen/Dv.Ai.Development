'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown } = require('./lib/markdown');
const { IMPLEMENTATION_CATEGORIES } = require('../scripts/lib/implementation-categories');

const AGENTS = path.join(__dirname, '..', 'agents');
const FORMAT_KEYS = ['"reviewer"', '"summary"', '"findings"', '"location"', '"quote"', '"category"', '"consequence"', '"rationale"'];
const TYPOGRAPHIC_QUOTES = /[\u201C\u201D\u201E]/;
const REVIEWERS = {
  acceptance: { tools: 'Read, Grep, Glob, Write', location: '`AC-<Zahl>`' },
  'plan-fidelity': { tools: 'Read, Grep, Glob, Write', location: '`Task <n>` oder `Global Constraints`' },
  design: { tools: 'Read, Grep, Glob, Write', location: 'Pfad der Datei relativ zu `Repo`' },
  tests: { tools: undefined, location: 'oder `Testlauf`' },
  risks: { tools: 'Read, Grep, Glob, Write', location: 'Pfad der Datei relativ zu `Repo`' },
};

function readAgent(name) {
  return readMarkdown(path.join(AGENTS, `${name}.md`));
}

for (const [reviewer, expected] of Object.entries(REVIEWERS)) {
  const name = `implementation-review-${reviewer}`;

  test(`${name}_Frontmatter_NameToolsModelDescription`, () => {
    const { fields } = readAgent(name);
    assert.equal(fields.name, name);
    assert.equal(fields.tools, expected.tools);
    assert.equal(fields.model, 'sonnet');
    assert.match(fields.description, /^Use when/);
  });

  test(`${name}_Body_FindingFormatLocationAndInputs`, () => {
    const { body } = readAgent(name);
    for (const key of FORMAT_KEYS) assert.ok(body.includes(key), `${key} fehlt`);
    assert.ok(body.includes(`"reviewer": "${reviewer}"`));
    assert.ok(body.includes(expected.location), 'Stellen-Regel fehlt');
    assert.ok(body.includes('`Paket:`') && body.includes('`Repo:`'));
    assert.doesNotMatch(body, TYPOGRAPHIC_QUOTES);
  });
}

test('implementation-review-acceptance_Body_ReadsSpecNotPlanAndMissingAcIsRed', () => {
  const { body } = readAgent('implementation-review-acceptance');
  assert.ok(body.includes('`Spec:`'));
  assert.ok(!body.includes('`Plan:`'));
  assert.match(body, /Den Plan liest du nicht/);
  assert.match(body, /ist immer `ac-verfehlt`/);
});

test('implementation-review-design_Body_ReadsProjectRulesNotSpecOrPlan', () => {
  const { body } = readAgent('implementation-review-design');
  assert.ok(body.includes('`<Repo>/CLAUDE.md`'));
  assert.match(body, /Spec und Plan liest du nicht/);
});

test('implementation-review-tests_Body_RunsSuiteOnceAndMayNotEdit', () => {
  const { body } = readAgent('implementation-review-tests');
  assert.match(body, /komplette Suite genau einmal/);
  assert.match(body, /Du änderst keine Datei/);
  assert.match(body, /Ein Test ohne Assertion ist `test-ohne-assertion`/);
});

test('implementation-review-tests_Body_ConfiguredCommandFirstAndReusesGreenRun', () => {
  const { body } = readAgent('implementation-review-tests');
  assert.ok(body.includes('- `Test:`'));
  assert.match(body, /auch kein MCP-Tool mit gleichem Zweck/);
  assert.doesNotMatch(body, /Schreibt sie ein MCP-Tool vor/);
  assert.ok(body.includes('`Gesamtlauf:`'));
  assert.match(body, /nur Doku/);
});

test('implementation-review-tests_Body_ForeignRedTestIsRerunAlone', () => {
  const { body } = readAgent('implementation-review-tests');
  assert.match(body, /außerhalb des Pakets/);
  assert.match(body, /einzeln/);
  assert.ok(body.includes('`flaky im Gesamtlauf`'));
});

test('implementation-review-risks_Body_SwallowedErrorIsRed', () => {
  const { body } = readAgent('implementation-review-risks');
  assert.match(body, /verschluckter Fehler/);
  assert.match(body, /Spec und Plan liest du nicht/);
});

test('implementation-review-scout_Frontmatter_ReadGrepGlobWriteSonnet', () => {
  const { fields } = readAgent('implementation-review-scout');
  assert.equal(fields.name, 'implementation-review-scout');
  assert.equal(fields.tools, 'Read, Grep, Glob, Write');
  assert.equal(fields.model, 'sonnet');
  assert.match(fields.description, /^Use when/);
});

test('implementation-review-scout_Body_FormatContextProfilesAndNoEdits', () => {
  const { body } = readAgent('implementation-review-scout');
  for (const part of ['## Scout-Vorschläge', '**Bevorzugt: <Nr>** — <Begründung>', '`Context:`', '`Repo:`',
    'docs/application/', '`Nicht ändern: <Begründung>`']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.match(body, /1 bis 3/);
  assert.match(body, /änderst keine Datei/);
  assert.match(body, /🟢-Gruppen lässt du weg/);
  assert.doesNotMatch(body, /Spec so ändern/);
  assert.doesNotMatch(body, TYPOGRAPHIC_QUOTES);
});

function categorySection(body) {
  const start = body.indexOf('## Kategorie\n');
  assert.ok(start > -1, '## Kategorie fehlt');
  const end = body.indexOf('\n## ', start + 1);
  return body.slice(start, end === -1 ? undefined : end);
}

for (const [reviewer, categories] of Object.entries(IMPLEMENTATION_CATEGORIES)) {
  test(`implementation-review-${reviewer}_Body_NamesItsCategoriesNeverColours`, () => {
    const { body } = readAgent(`implementation-review-${reviewer}`);
    const section = categorySection(body);
    const listed = [...section.matchAll(/^- `([a-z-]+)` — /gm)].map((match) => match[1]);
    assert.deepEqual(listed, Object.keys(categories), 'Liste im Agent und im Skript stimmen überein');
    assert.ok(!body.includes('## Einstufung'));
    assert.ok(!body.includes('"severity"'));
    assert.ok(!/`(red|yellow|green)`/.test(body), 'Farbe als Wert');
    assert.ok(section.includes('Ein Feld `severity` oder `color` macht dein Ergebnis ungültig.'));
    const example = /"category": "([a-z-]+)"/.exec(body)?.[1];
    assert.ok(Object.hasOwn(categories, example), `Beispiel-Kategorie ${example}`);
  });

  test(`implementation-review-${reviewer}_Body_EveryCategoryExceptRemarkIsNamedInThePrueflauf`, () => {
    const { body } = readAgent(`implementation-review-${reviewer}`);
    const auftrag = body.slice(body.indexOf('## Prüfauftrag'), body.indexOf('## Nicht deine Aufgabe')) + body.slice(body.indexOf('## W-Einträge'), body.indexOf('## Kalibrierung'));
    for (const category of Object.keys(categories).filter((name) => name !== 'anmerkung')) assert.ok(auftrag.includes(`\`${category}\``), `${category} fehlt im Prüfauftrag`);
  });
}
