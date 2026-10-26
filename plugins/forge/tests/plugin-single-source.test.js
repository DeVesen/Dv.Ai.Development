'use strict';

// Sichert mechanisch ab, was Teil A der Vereinfachung zusagt: Die Namen der früheren Doppel-Betriebsart stehen nirgends im Plugin
// (AC-04), die Regeln der Orchestratoren stehen in genau einer Datei (AC-11) und das Maximum der Followup-Runden an genau einer
// Stelle (AC-12). Die Suchmuster entstehen aus Teilstrings: Der Test findet sich nicht selbst, und die Namen stehen im Klartext
// auch in keinem anderen Test.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { FORMER_ROUND_WORDINGS } = require('./lib/former-names');

const ROOT = path.join(__dirname, '..');
const RULES = path.join(ROOT, 'shared', 'orchestrator-rules.md');
const SKIPPED_DIRS = new Set(['node_modules', '.git']);
const TEXT_FILE = /\.(?:js|md|json|ya?ml|txt)$/i;

function pluginFiles(dir = ROOT) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : pluginFiles(full);
    return TEXT_FILE.test(entry.name) ? [full] : [];
  });
}

const FILES = pluginFiles().map((file) => ({ file, rel: path.relative(ROOT, file).replace(/\\/g, '/'), text: fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') }));
const RULES_REL = path.relative(ROOT, RULES).replace(/\\/g, '/');

function filesWith(needle, { ignoreCase = false } = {}) {
  const wanted = ignoreCase ? needle.toLowerCase() : needle;
  return FILES.filter(({ text }) => (ignoreCase ? text.toLowerCase() : text).includes(wanted)).map(({ rel }) => rel);
}

test('plugin_Files_AreFound', () => {
  assert.ok(FILES.length > 100, `nur ${FILES.length} Dateien`);
  assert.ok(FILES.some(({ rel }) => rel === RULES_REL));
});

test('plugin_NoFile_NamesTheFormerReportOptionOrTheEmbeddedRun', () => {
  // Arrange
  const patterns = [['--', 'ber', 'icht'].join(''), ['einge', 'bettet'].join('')];

  // Act
  const hits = patterns.map((pattern) => [pattern, filesWith(pattern, { ignoreCase: true })]);

  // Assert
  for (const [pattern, files] of hits) assert.deepEqual(files, [], `${pattern} steht in ${files.join(', ')}`);
});

// Regeln der Orchestratoren aus der Regeldatei: je Zeile unter Git-Verbote und Ausgabe der Text, je Zeile der Tabelle Rote Flaggen der Gedanke.
function ruleTexts() {
  const lines = fs.readFileSync(RULES, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const rules = [];
  let section = null;
  for (const line of lines) {
    if (line.startsWith('## ')) section = line.slice(3).trim();
    else if (['Git-Verbote', 'Ausgabe'].includes(section) && line.startsWith('- ')) rules.push(line.slice(2).trim());
    else if (section === 'Rote Flaggen' && line.startsWith('| ') && !line.startsWith('| Gedanke') && !line.startsWith('|---')) rules.push(line.split('|')[1].trim());
  }
  return rules;
}

test('rulesFile_Rules_AreFoundForGitBansOutputAndRedFlags', () => {
  const rules = ruleTexts();
  assert.ok(rules.length >= 12, `nur ${rules.length} Regeln`);
});

test('plugin_EveryRuleOfTheRulesFile_StandsInExactlyThatFile', () => {
  for (const rule of ruleTexts()) {
    // Act
    const files = filesWith(rule);

    // Assert
    assert.deepEqual(files, [RULES_REL], `${rule} steht in ${files.join(', ')}`);
  }
});

test('orchestratorSkillsAndBrief_Rules_PointToTheRulesFile', () => {
  for (const file of ['skills/spec-review-orchestrator/SKILL.md', 'skills/plan-orchestrator/SKILL.md', 'skills/implementation-orchestrator/SKILL.md']) {
    const text = FILES.find(({ rel }) => rel === file).text;
    assert.ok(text.includes('Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es'), file);
  }
  assert.ok(FILES.find(({ rel }) => rel === 'shared/session-chain/base-sub-agent.md').text.includes('{{PLUGIN}}/shared/orchestrator-rules.md'));
  assert.ok(FILES.find(({ rel }) => rel === 'README.md').text.includes('`shared/orchestrator-rules.md`'));
});

test('plugin_MaximumOfFollowupRounds_IsSetInExactlyOnePlace', () => {
  // Arrange
  const setting = new RegExp(['Maximum Followup', '-Runden: [0-9]'].join(''), 'g');
  const wordings = FORMER_ROUND_WORDINGS;

  // Act
  const settingFiles = FILES.filter(({ text }) => new RegExp(setting.source).test(text)).map(({ rel }) => rel);
  const wordingHits = wordings.map((wording) => [wording, filesWith(wording, { ignoreCase: true })]);

  // Assert
  assert.deepEqual(settingFiles, [RULES_REL]);
  assert.equal((FILES.find(({ rel }) => rel === RULES_REL).text.match(setting) ?? []).length, 1, 'die Regeldatei setzt den Wert genau einmal');
  for (const [wording, files] of wordingHits) assert.deepEqual(files, [], `${wording} steht in ${files.join(', ')}`);
});
