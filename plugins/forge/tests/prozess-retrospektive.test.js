'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');

const PLUGIN_ROOT = path.join(__dirname, '..');
const SKILL_DIR = path.join(PLUGIN_ROOT, 'skills', 'prozess-retrospektive');
const SKILL = path.join(SKILL_DIR, 'SKILL.md');
const SCRIPTS = ['session-facts.js', 'retro-report.js', 'retro-timeline.js', 'retro-sort.js'];
const JUDGEMENT_SIGNALS = [
  'Rückfrage oder Korrektur durch den Menschen',
  'Skill geladen, aber nicht befolgt',
  'Ergebnis erzeugt, aber nie genutzt',
  'teures Modell oder breiter Lauf, wo ein schmaler reicht',
  'Mensch wartet auf etwas, das parallel laufen könnte',
];

function reportFormat() {
  return readText(path.join(SKILL_DIR, 'references', 'report-format.md'));
}

test('prozessRetrospektive_Frontmatter_ManualOnlyWithAllowedScripts', () => {
  const { fields } = readMarkdown(SKILL);

  assert.deepEqual(Object.keys(fields), ['name', 'description', 'disable-model-invocation', 'allowed-tools']);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.match(fields.description, /^Use when the human types \/dv-toolbelt:prozess-retrospektive/);
  assert.match(fields.description, /Erfahrungsbericht/);
  assert.match(fields.description, /session retrospective/);
});

test('prozessRetrospektive_AllowedTools_EveryScriptInBashAndPowerShell', () => {
  const { fields } = readMarkdown(SKILL);

  for (const shell of ['Bash', 'PowerShell']) {
    for (const script of SCRIPTS) {
      assert.ok(fields['allowed-tools'].includes(`${shell}(node "\${CLAUDE_PLUGIN_ROOT}/scripts/${script}" *)`), `${shell} ${script}`);
    }
  }
});

test('prozessRetrospektive_AllowedTools_DraftFolderWritableWithoutAsking', () => {
  const { fields } = readMarkdown(SKILL);

  assert.ok(fields['allowed-tools'].split(' ').includes('Edit(~/.dv-toolbelt/retro/*)'));
});

test('prozessRetrospektive_Body_InjectsFactsAndFormatBeforeTheModelReads', () => {
  const lines = readMarkdown(SKILL).body.split('\n');

  assert.ok(lines.includes('!`node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" --session ${CLAUDE_SESSION_ID} --before-retro --snapshot --lenient`'));
  assert.ok(lines.includes('!`node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" --format`'));
});

test('prozessRetrospektive_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('prozessRetrospektive_Body_TimelineInsteadOfTextSearch', () => {
  const { body } = readMarkdown(SKILL);

  assert.ok(body.includes('retro-timeline.js" --session ${CLAUDE_SESSION_ID} --entry <n>'));
  assert.match(body, /nie per Textsuche im Protokoll/);
});

test('prozessRetrospektive_Body_DraftPlusScriptInsteadOfSkeleton', () => {
  const { body } = readMarkdown(SKILL);

  assert.ok(body.includes('retro-report.js" --session ${CLAUDE_SESSION_ID} --topic <thema>'));
  assert.match(body, /Entwurf/);
  assert.doesNotMatch(body, /Gerüst|--skeleton/);
});

test('prozessRetrospektive_Body_NamesTheFiveJudgementSignals', () => {
  const { body } = readMarkdown(SKILL);

  for (const signal of JUDGEMENT_SIGNALS) assert.ok(body.includes(signal), signal);
});

test('prozessRetrospektive_Body_CommitOnlyAfterAskingConventionAndWorkitem', () => {
  const { body } = readMarkdown(SKILL);

  assert.match(body, /Nicht committen, erst fragen/);
  assert.ok(body.includes('Commit-Konvention und Workitem-Kennung'));
  assert.doesNotMatch(body, new RegExp([['forge', 'config'].join('-'), 'Workitem-Kandidaten'].join('|')));
});

test('prozessRetrospektive_Body_NoFixedContextThresholdAndOnlyFormatReference', () => {
  const { body } = readMarkdown(SKILL);

  assert.doesNotMatch(body, /\d+k/);
  assert.deepEqual([...new Set(body.match(/references\/[\w.-]+/g))], ['references/report-format.md']);
  assert.deepEqual(fs.readdirSync(path.join(SKILL_DIR, 'references')), ['report-format.md']);
});

test('prozessRetrospektive_Body_ArgumentsRerunFactsAndSortForWishlist', () => {
  const { body } = readMarkdown(SKILL);

  assert.match(body, /`ARGUMENTS`/);
  assert.ok(body.includes('retro-sort.js'));
  assert.ok(body.includes('--expect <server,...>'));
});

test('reportFormat_Draft_NoSlotsAndThreeTargetForms', () => {
  const text = reportFormat();

  assert.doesNotMatch(text, /<ZAHLEN|<MCP-NUTZUNG|--skeleton/);
  assert.ok(text.includes('*Ziel:* <Art> · `<Name>` | <Art> · neu: <Arbeitsname> | Ziel offen'));
  assert.match(text, /## Was das Skript prüft/);
});

test('reportFormat_EveryFinding_HasSituationBetterApproachTargetAndProjectLine', () => {
  const text = reportFormat();
  const template = text.slice(text.indexOf('## Reibung'), text.indexOf('## Neue Ideen'));

  for (const slot of ['*Situation:*', '*Besser gewesen:*', '*Vorschlag:*', '*Ziel:*', '*Im Projekt:*']) {
    assert.equal(template.split(slot).length - 1, 2, `${slot} nicht in Reibung und Sparpotenzial`);
  }
  assert.match(text, /Kein Befund ohne \*Besser gewesen:\*/);
});

test('reportFormat_Outsiders_RolesPlaceholdersAndRawDataExempt', () => {
  const text = reportFormat();

  for (const phrase of ['## Für Außenstehende schreiben', 'als ihre **Rolle**', 'beim **Namen**', 'nur unter *Im Projekt:*', 'Platzhalter in eckigen Klammern', '`dotnet build <Solution>`', 'Vor dem Speichern gehst du jeden Befund durch', '„Zahlen“ und „MCP-Nutzung“ sind davon ausgenommen', 'Ein Fehler in einem Werkzeug ist nie eine Kleinigkeit', '`datei:zeile`']) {
    assert.ok(text.includes(phrase), phrase);
  }
});
