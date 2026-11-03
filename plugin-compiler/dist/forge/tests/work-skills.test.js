'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');
const { DEFAULTS } = require('../scripts/forge-config');

const SKILLS = path.join(__dirname, '..', 'skills');

function skill(name) {
  return readMarkdown(path.join(SKILLS, name, 'SKILL.md'));
}

for (const name of ['init', 'start-work', 'finish-work']) {
  test(`${name}_Frontmatter_UseWhenAndOnlyInitManual`, () => {
    const { fields } = skill(name);
    assert.equal(fields.name, name);
    assert.match(fields.description, /^Use when/);
    assert.equal(fields['disable-model-invocation'], name === 'init' ? 'true' : undefined);
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
  assert.ok(body.includes('work.js" switch <vorschlag>'));
  assert.ok(body.includes('4. Ausgabe: das Ergebnis aus Schritt 3 (Ort, Branch, Aktion) und danach unverändert die Zeilen `<Name>=<Wert>` von `work.js` (`R`, `P`, `S`, `modus`, `branch`, `aktion`); der Implementierungs-Orchestrator liest sie. Kein Befehl, kein Hinweis auf einen nächsten Schritt.'));
  assert.doesNotMatch(body, /\/dv-forge:|Session in <R> starten|Commit anbieten|erst nach Ja/);
});

test('finishWork_Body_ChecksTestsThenRemoves', () => {
  const { body } = skill('finish-work');
  const order = ['work.js" check', 'verify-run.js" --repo "<R>"', 'cd "<haupt>"', 'work.js" remove "<R>"'];
  const positions = order.map((part) => body.indexOf(part));
  assert.ok(positions.every((position) => position !== -1), `fehlt: ${order[positions.indexOf(-1)]}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(body, /Kein Merge, kein Push, kein Branch löschen/);
});

test('finishWork_Body_SkipsTestRunWhenReportShowsGreenRunOnSameCode', () => {
  const { body } = skill('finish-work');
  assert.ok(body.includes('--seit-gruen "<Umsetzungsbericht>"'));
  assert.match(body, /nach einem grünen Gesamtlauf, wenn seither nur Doku geändert ist/);
  for (const result of ['`rot`', '`docker`', '`keine`', '`gruen` mit `offen` > 0']) assert.ok(body.includes(result), result);
});

test('commitMessage_Skill_IsShippedAndInitSuggestsItAsCommitKonvention', () => {
  const { fields, body } = skill('commit-message');
  assert.equal(fields.name, 'commit-message');
  assert.match(body, /Conventional Commits/);
  assert.match(body, /Does not run `git commit`/);
  const init = skill('init').body;
  assert.ok(init.includes('`Commit-Messages mit dem Skill dv-forge:commit-message schreiben.`'));
  assert.ok(init.includes('- Commit-Konvention: Commit-Messages mit dem Skill dv-forge:commit-message schreiben.'));
});

test('finishWork_Body_RemovesChainEntryOnlyAfterSuccessfulEndOfBothCases', () => {
  const { body } = skill('finish-work');
  const remove = body.indexOf('work.js" remove "<R>"');
  const chain = body.indexOf('chain.js" remove --worktree "<R>"');
  assert.ok(remove > -1 && chain > remove, 'chain.js remove muss nach work.js remove stehen');
  assert.ok(body.includes('Nur nach erfolgreichem Ende beider Fälle'));
  assert.ok(body.includes('Brach ein Schritt ab, bleibt der Eintrag.'));
  assert.equal(body.match(/Weiter mit 5\./g).length, 2);
});

test('startWork_Body_HandlesEveryOutputKeyOfWorkStart', () => {
  const { body } = skill('start-work');
  for (const key of ['`modus=worktree`', '`standard=true`', '`drift=<datei>`', '`workitem-konflikt=<nr>`', '`angehaengt`', '`fortgesetzt`', '`Nicht committet:`']) {
    assert.ok(body.includes(key), key);
  }
  const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'work.js'), 'utf8');
  for (const key of ["values['workitem-konflikt']", '{ ...mapped, drift }', "'angehaengt'", "'fortgesetzt'", '`Nicht committet:']) assert.ok(source.includes(key), key);
});

test('startWorkSkill_Output_PrintsTheNameValueLinesOfWorkJs', () => {
  const { body } = skill('start-work');
  assert.ok(body.includes('danach unverändert die Zeilen `<Name>=<Wert>` von `work.js` (`R`, `P`, `S`, `modus`, `branch`, `aktion`); der Implementierungs-Orchestrator liest sie.'));
});
