'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseFrontmatter, validateSkill } = require('../scripts/lib/validate-skill');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'validate-skill.js');

function skillMd({ name = 'my-skill', description = 'Use when testing', extra = '' } = {}) {
  const nameLine = name === null ? '' : `name: ${name}\n`;
  const descriptionLine = description === null ? '' : `description: ${description}\n`;
  return `---\n${nameLine}${descriptionLine}${extra}---\n\n# Titel\n`;
}

// Der Ordner liegt in einem eigenen Elternordner, damit sein Name genau der gewünschte ist.
function makeSkill(folderName, { text, extraFiles = {} }) {
  const folder = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'toolbelt-skill-')), folderName);
  fs.mkdirSync(folder, { recursive: true });
  if (text !== undefined) fs.writeFileSync(path.join(folder, 'SKILL.md'), text);
  for (const [name, content] of Object.entries(extraFiles)) {
    const file = path.join(folder, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return folder;
}

function validate(folder) {
  return spawnSync(process.execPath, [SCRIPT, folder], { encoding: 'utf8' });
}

test('parseFrontmatter_PlainAndQuotedValues_ReadAsStrings', () => {
  const fields = parseFrontmatter('---\nname: a\ndescription: "Use when: x"\n---\nText\n');

  assert.deepEqual(fields, { name: 'a', description: 'Use when: x' });
});

test('parseFrontmatter_FoldedBlock_JoinsLinesWithSpaces', () => {
  const fields = parseFrontmatter('---\nname: a\ndescription: >\n  Zeile eins\n  Zeile zwei\nallowed-tools: x\n---\n');

  assert.deepEqual(fields, { name: 'a', description: 'Zeile eins Zeile zwei', 'allowed-tools': 'x' });
});

test('parseFrontmatter_LiteralBlock_KeepsLineBreaks', () => {
  assert.equal(parseFrontmatter('---\ndescription: |\n  eins\n  zwei\n---\n').description, 'eins\nzwei');
});

test('parseFrontmatter_WindowsLineEndings_Parsed', () => {
  assert.deepEqual(parseFrontmatter('---\r\nname: a\r\n---\r\nText\r\n'), { name: 'a' });
});

test('parseFrontmatter_NoFrontmatter_Null', () => {
  assert.equal(parseFrontmatter('kein Kopf\n'), null);
});

test('parseFrontmatter_Utf8Bom_Parsed', () => {
  assert.deepEqual(parseFrontmatter('﻿---\nname: a\n---\n'), { name: 'a' });
});

test('parseFrontmatter_EmptyHead_EmptyObject', () => {
  assert.deepEqual(parseFrontmatter('---\n---\n'), {});
});

test('validateSkill_ValidHead_NoErrorsNoWarnings', () => {
  const folder = makeSkill('my-skill', { text: skillMd({ extra: 'disable-model-invocation: true\nallowed-tools: Bash(node x *)\n' }) });

  assert.deepEqual(validateSkill(folder), { errors: [], warnings: [], name: 'my-skill' });
});

test('cli_ValidSkill_ExitZeroAndReportsValid', () => {
  const result = validate(makeSkill('my-skill', { text: skillMd() }));

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'Skill gültig: my-skill\n');
});

test('cli_NameWithUppercaseAndUnderscore_ExitOneNamesNameAndRule', () => {
  const result = validate(makeSkill('My_Skill', { text: skillMd({ name: 'My_Skill' }) }));

  assert.equal(result.status, 1);
  assert.ok(result.stdout.includes('FEHLER Name "My_Skill" erlaubt nur Kleinbuchstaben, Ziffern und Bindestriche'), result.stdout);
  assert.ok(result.stdout.includes('Skill ungültig: 1 Fehler'));
});

test('cli_NameOf65Characters_ExitOneNamesLength', () => {
  const result = validate(makeSkill('lang', { text: skillMd({ name: 'a'.repeat(65) }) }));

  assert.equal(result.status, 1);
  assert.ok(result.stdout.includes('FEHLER Name ist 65 Zeichen lang, erlaubt sind höchstens 64'), result.stdout);
});

test('cli_DescriptionOf1025Characters_ExitOneNamesLength', () => {
  const result = validate(makeSkill('my-skill', { text: skillMd({ description: 'x'.repeat(1025) }) }));

  assert.equal(result.status, 1);
  assert.ok(result.stdout.includes('FEHLER Beschreibung ist 1025 Zeichen lang, erlaubt sind höchstens 1024'), result.stdout);
});

test('cli_DescriptionOf1024Characters_ExitZero', () => {
  const result = validate(makeSkill('my-skill', { text: skillMd({ description: 'x'.repeat(1024) }) }));

  assert.equal(result.status, 0, result.stdout);
});

test('cli_NoSkillMd_ExitOneNamesMissingFile', () => {
  const result = validate(makeSkill('my-skill', {}));

  assert.equal(result.status, 1);
  assert.match(result.stdout, /FEHLER SKILL\.md fehlt in /);
});

test('cli_NoHeadAtAll_ExitOneNamesMissingHead', () => {
  const result = validate(makeSkill('my-skill', { text: '# Nur Text\n' }));

  assert.equal(result.status, 1);
  assert.match(result.stdout, /FEHLER Kopf fehlt: SKILL\.md beginnt nicht mit einem Kopf zwischen --- Zeilen/);
});

test('cli_MissingNameOrDescription_ExitOneNamesTheMissingField', () => {
  const withoutName = validate(makeSkill('my-skill', { text: skillMd({ name: null }) }));
  const withoutDescription = validate(makeSkill('my-skill', { text: skillMd({ description: null }) }));

  assert.equal(withoutName.status, 1);
  assert.match(withoutName.stdout, /FEHLER Pflichtfeld name fehlt/);
  assert.equal(withoutDescription.status, 1);
  assert.match(withoutDescription.stdout, /FEHLER Pflichtfeld description fehlt/);
});

test('cli_SecondSkillMdInSubfolder_ExitOneNamesTheExtraFile', () => {
  const result = validate(makeSkill('my-skill', { text: skillMd(), extraFiles: { 'unter/SKILL.md': 'x' } }));

  assert.equal(result.status, 1);
  assert.match(result.stdout, /FEHLER Zusätzliche SKILL\.md: unter[\\/]SKILL\.md/);
});

test('cli_SkillMdInsideNodeModules_Ignored', () => {
  const result = validate(makeSkill('my-skill', { text: skillMd(), extraFiles: { 'node_modules/x/SKILL.md': 'x' } }));

  assert.equal(result.status, 0, result.stdout);
});

test('cli_UnknownKey_WarningNamesKeyAndExitZero', () => {
  const result = validate(makeSkill('my-skill', { text: skillMd({ extra: 'foo: bar\n' }) }));

  assert.equal(result.status, 0, result.stdout);
  assert.ok(result.stdout.includes('WARNUNG Unbekannter Schlüssel im Kopf: foo'), result.stdout);
  assert.ok(result.stdout.includes('Skill gültig: my-skill'));
});

test('cli_AngleBracketInDescription_WarningAndExitZero', () => {
  const result = validate(makeSkill('my-skill', { text: skillMd({ description: 'Use when a < b' }) }));

  assert.equal(result.status, 0, result.stdout);
  assert.ok(result.stdout.includes('WARNUNG Beschreibung enthält < oder >'), result.stdout);
});

test('cli_NoArgument_UsageAndExitTwo', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Aufruf: node validate-skill\.js <skill-ordner>/);
});
