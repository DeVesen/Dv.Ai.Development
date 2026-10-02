'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown } = require('./lib/markdown');
const { isMostlyGerman } = require('./lib/german');

const SKILL = path.join(__dirname, '..', 'skills', 'claude-md-audit', 'SKILL.md');
const GUARD = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js"';
const CRITERIA = ['Länge', 'Dokument statt Rahmenkorn', 'Doppelung', 'Widerspruch', 'Ableitbar', 'Krücke für alte Modelle', 'Mehrdeutig', 'Für Menschen geschrieben', 'Trigger fehlt'];

function skill() {
  return readMarkdown(SKILL);
}

test('claudeMdAudit_Frontmatter_NameDescriptionAndGuardScriptAllowed', () => {
  const { fields } = skill();

  assert.deepEqual(Object.keys(fields), ['name', 'description', 'allowed-tools']);
  assert.equal(fields.name, 'claude-md-audit');
  assert.match(fields.description, /^Use when /);
  assert.doesNotMatch(fields.description, /[<>]|: /);
  for (const shell of ['Bash', 'PowerShell']) assert.ok(fields['allowed-tools'].includes(`${shell}(${GUARD} *)`), shell);
});

test('claudeMdAudit_Description_GermanAndEnglishTriggerWords', () => {
  const { fields } = skill();

  assert.match(fields.description, /CLAUDE\.md prüfen/);
  assert.match(fields.description, /audit CLAUDE\.md/);
});

test('claudeMdAudit_Body_IsGerman', () => {
  assert.ok(isMostlyGerman(skill().body));
});

test('claudeMdAudit_Body_TargetIsGivenPathOrProjectRootClaudeMd', () => {
  const { body } = skill();

  assert.ok(body.includes('Prüfziel ist der Pfad, den der Mensch nennt'));
  assert.ok(body.includes('ohne Angabe die CLAUDE.md im Wurzelordner des Projekts'));
});

test('claudeMdAudit_Body_AsksForBackupBeforeCheckingAnything', () => {
  const { body } = skill();

  const asked = body.indexOf('Backup anlegen? Wohin?');
  assert.ok(body.includes('Bevor du etwas prüfst oder änderst'));
  assert.ok(asked > -1);
  assert.ok(asked < body.indexOf('2. **Prüfen.**'));
});

test('claudeMdAudit_Body_BackupAnswers_TempFolderGivenPathOrNone', () => {
  const { body } = skill();

  assert.ok(body.includes(`${GUARD} backup '<datei>'`));
  assert.ok(body.includes('temporären Ordner des Systems'));
  assert.ok(body.includes('nennst dem Menschen den Pfad'));
  assert.ok(body.includes(`backup '<datei>' --to '<pfad>'`));
  assert.ok(body.includes('Nein: kein Backup und am Ende kein Diff'));
  assert.ok(body.includes('Ohne Backup bleiben nur die zwei Zeichenzahlen'));
});

test('claudeMdAudit_Body_ShowsDiffAndBothCharacterCountsAfterTheChange', () => {
  const { body } = skill();

  assert.ok(body.includes(`${GUARD} size '<datei>'`));
  assert.ok(body.includes(`${GUARD} diff '<backup>' '<datei>'`));
  assert.ok(body.includes('nennst beide Zeichenzahlen'));
});

test('claudeMdAudit_Body_AtMostFiveFindingsPerMessageRestOnlyAsCount', () => {
  const { body } = skill();

  assert.ok(body.includes('höchstens fünf je Nachricht, die wichtigsten zuerst'));
  assert.ok(body.includes('den Rest nur als Anzahl'));
});

test('claudeMdAudit_Body_FindingHasQuoteProblemAndProposal', () => {
  assert.ok(skill().body.includes('Zitat, Problem, Vorschlag (neuer Wortlaut, Ziel-Skill oder Löschen)'));
});

test('claudeMdAudit_Body_NothingChangedWithoutApprovalAndNeverCommitted', () => {
  const { body } = skill();

  assert.ok(body.includes('nie committen'));
  assert.ok(body.includes('Der Mensch entscheidet'));
  assert.ok(body.includes('änderst du nur freigegebene Stellen'));
});

test('claudeMdAudit_Body_ProtectedBlocksOnlyNamedByHumanAndCheckedByHash', () => {
  const { body } = skill();

  assert.ok(body.includes('Geschützt ist nur, was der Mensch nennt'));
  assert.ok(body.includes(`${GUARD} blocks hash '<datei>' --start '<start>' --end '<ende>'`));
  assert.ok(body.includes(`${GUARD} blocks verify '<datei>' --start '<start>' --end '<ende>' --hashes '<wert>'`));
  assert.ok(body.includes('Vorschlag an den Besitzer'));
});

test('claudeMdAudit_Body_FailedBlockCheck_RestoredFromBackupOrRememberedWording', () => {
  const { body } = skill();

  assert.ok(body.includes('ohne Backup merkst du dir zusätzlich den Wortlaut jedes Blocks'));
  assert.ok(body.includes('Mit Backup stellst du die Zeilen der betroffenen Blöcke aus dem Backup wieder her'));
  assert.ok(body.includes('Ohne Backup stellst du sie aus dem gemerkten Wortlaut wieder her'));
  assert.ok(body.includes('danach prüfst du erneut mit `blocks verify`'));
});

test('claudeMdAudit_Body_MarkersInSingleQuotesWithoutShellSpecialCharacters', () => {
  const { body } = skill();

  assert.ok(body.includes('Marker gibst du in einfachen Anführungszeichen weiter'));
  assert.ok(body.includes('bittest du den Menschen um einen Marker ohne diese Zeichen'));
});

test('claudeMdAudit_Body_PathsInSingleQuotesWithoutSingleQuote', () => {
  const { body } = skill();

  assert.ok(body.includes('Pfade (`<datei>`, `<pfad>`, `<backup>`) gibst du in einfachen Anführungszeichen weiter'));
  assert.ok(body.includes('Enthält ein Pfad `\'`, bittest du den Menschen um einen Pfad ohne dieses Zeichen'));
});

test('claudeMdAudit_Body_NamesAllNineCriteria', () => {
  const { body } = skill();

  for (const criterion of CRITERIA) assert.ok(body.includes(`**${criterion}:**`), criterion);
});

test('claudeMdAudit_Body_NewRuleChecksNeedDuplicateConflictAndWording', () => {
  const { body } = skill();

  assert.ok(body.includes('Nur wenn jeder Agent sie in jeder Session braucht'));
  assert.ok(body.includes('Steht sie schon, auch sinngemäß?'));
  assert.ok(body.includes('Widerspricht sie einem Eintrag?'));
  assert.ok(body.includes('den Wortlaut lässt du vom Menschen bestätigen'));
});

test('claudeMdAudit_Skill_NoMemoryGitIgnoreOrPluginSectionAssumption', () => {
  const { fields, body } = skill();

  assert.doesNotMatch(`${fields.description}\n${body}`, /memory|gitignore|git-ignore|Plugin-Abschnitt/i);
});
