'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');
const { DEFAULTS } = require('../scripts/forge-config');

const SKILLS = path.join(__dirname, '..', 'skills');

function skill(name) {
  return readMarkdown(path.join(SKILLS, name, 'SKILL.md'));
}

for (const name of ['init', 'start-work', 'finish-work']) {
  test(`${name}_Frontmatter_ManualOnlyUseWhen`, () => {
    const { fields } = skill(name);
    assert.equal(fields.name, name);
    assert.match(fields.description, /^Use when/);
    assert.equal(fields['disable-model-invocation'], 'true');
  });

  test(`${name}_Body_StaysUnder500WordsAndUsesPluginRoot`, () => {
    const { body } = skill(name);
    assert.ok(wordCount(body) < 500);
    assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
  });
}

test('init_Body_ListsEveryConfigKey', () => {
  const { body } = skill('init');
  for (const key of Object.keys(DEFAULTS)) assert.ok(body.includes(`\`${key}\``), `${key} fehlt`);
  assert.ok(body.includes('forge-config.js" show'));
  assert.ok(body.includes('## dv-forge'));
});

test('init_Body_ChecksSetupBeforeConfig', () => {
  const { body } = skill('init');
  const check = body.indexOf('setup-check.js"');
  assert.ok(check !== -1 && check < body.indexOf('forge-config.js" show'));
  assert.match(body, /\*\*alle nach Vorschlag\*\*, \*\*einzeln\*\* oder \*\*behalten\*\*/);
  assert.doesNotMatch(body, /dv-forge: (?:angular|dotnet)-|Vorschläge/);
});

test('init_Row_BuildTestLintAcceptsAnyCommandWithoutToolSuggestions', () => {
  const { body } = skill('init');
  assert.ok(body.includes('| `Build`, `Test`, `Lint` | Befehl, z. B. `npm test`; mehrere mit ` ; ` | leer |'));
});

// Ein „: “ im unquotierten Wert lehnt ein strenger YAML-Parser ab.
test('init_Description_HasNoColonSpace', () => {
  const { fields } = skill('init');
  assert.doesNotMatch(fields.description, /: /);
});

test('startWork_Body_DelegatesDecisionToScript', () => {
  const { body } = skill('start-work');
  assert.ok(body.includes('prepare.js" implementation $ARGUMENTS'));
  assert.ok(body.includes('work.js" start <slug> --spec "<S>" --plan "<P>"'));
  assert.ok(body.includes('git switch -c <vorschlag>'));
  assert.ok(body.includes('/dv-forge:implementation <P>'));
});

test('finishWork_Body_ChecksTestsThenRemoves', () => {
  const { body } = skill('finish-work');
  const order = ['work.js" check', 'forge-config.js" get <Schlüssel>', 'cd "<haupt>"', 'work.js" remove "<R>"'];
  const positions = order.map((part) => body.indexOf(part));
  assert.ok(positions.every((position) => position !== -1), `fehlt: ${order[positions.indexOf(-1)]}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(body, /Kein Merge, kein Push, kein Branch löschen/);
});

test('finishWork_Body_SkipsTestRunWhenReportShowsGreenRunOnSameCode', () => {
  const { body } = skill('finish-work');
  assert.ok(body.includes('`Gesamtlauf:`'));
  assert.ok(body.includes('git diff --name-only <commit> HEAD'));
  assert.match(body, /nur Doku/);
});
