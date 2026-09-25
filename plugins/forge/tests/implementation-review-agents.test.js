'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown } = require('./lib/markdown');

const AGENTS = path.join(__dirname, '..', 'agents');
const FORMAT_KEYS = ['"reviewer"', '"findings"', '"location"', '"quote"', '"severity"', '"consequence"', '"rationale"'];
const TYPOGRAPHIC_QUOTES = /[\u201C\u201D\u201E]/;
const REVIEWERS = {
  acceptance: { tools: 'Read, Grep, Glob', location: '`AC-<Zahl>`' },
  'plan-fidelity': { tools: 'Read, Grep, Glob', location: '`Task <n>` oder `Global Constraints`' },
  design: { tools: 'Read, Grep, Glob', location: 'Pfad der Datei relativ zu `Repo`' },
  tests: { tools: undefined, location: 'oder `Testlauf`' },
  risks: { tools: 'Read, Grep, Glob', location: 'Pfad der Datei relativ zu `Repo`' },
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
  assert.match(body, /ist immer `red`/);
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
  assert.match(body, /Ein Test ohne Assertion ist `red`/);
});

test('implementation-review-risks_Body_SwallowedErrorIsRed', () => {
  const { body } = readAgent('implementation-review-risks');
  assert.match(body, /verschluckter Fehler/);
  assert.match(body, /Spec und Plan liest du nicht/);
});
