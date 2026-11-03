'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { lintSpec } = require('../scripts/lib/spec-lint');
const { VALID_SPEC } = require('./lib/spec-fixtures');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'spec-lint.js');

function rules(text) {
  return lintSpec(text).issues.map((entry) => `${entry.severity} ${entry.rule} ${entry.location}`);
}

test('lintSpec_ValidSpec_NoIssuesAndMetrics', () => {
  const { issues, metrics } = lintSpec(VALID_SPEC);
  assert.deepEqual(issues, []);
  assert.deepEqual(metrics, { fehler: 0, warnungen: 0, ac: 2, w: 1, ohneTag: 0, ungeklaert: 0, art: 'frei', abbruch: false });
});

test('lintSpec_GrillingFixture_Clean', () => {
  const text = fs.readFileSync(path.join(__dirname, 'fixtures', 'spec-grilling', 'spec.md'), 'utf8');
  assert.deepEqual(lintSpec(text).issues, []);
});

test('lintSpec_FlawedFixture_UnknownSectionsAndTicketReference', () => {
  const found = rules(fs.readFileSync(path.join(__dirname, 'fixtures', 'flawed-spec.md'), 'utf8'));
  assert.ok(found.includes('fehler abschnitt-unbekannt Export'));
  assert.ok(found.includes('fehler abschnitt-fehlt Akzeptanzkriterien'));
  assert.ok(found.includes('warnung verweis Synchronisation'));
});

test('lintSpec_AcGapDuplicateAndOneDigit_AreErrors', () => {
  assert.ok(rules(VALID_SPEC.replace('**AC-02**', '**AC-03**')).includes('fehler ac-luecke AC-03'));
  assert.ok(rules(VALID_SPEC.replace('**AC-02**', '**AC-01**')).includes('fehler ac-luecke AC-01'));
  assert.ok(rules(VALID_SPEC.replace('**AC-02**', '**AC-2**')).includes('fehler ac-id AC-2'));
});

test('lintSpec_AcWithoutGivenWhenThen_IsError', () => {
  const text = VALID_SPEC.replace('Gegeben kein Kunde, wenn der Anwender exportiert, dann hat', 'Leere Liste hat');
  assert.ok(rules(text).includes('fehler ac-form AC-02'));
});

test('lintSpec_ForbiddenWordAndMissingTag_AreWarnings', () => {
  const text = VALID_SPEC.replace('dann hat die Datei drei Zeilen.', 'dann sollte die Datei drei Zeilen haben.').replace('Kunden exportieren. · Aussage', 'Kunden exportieren.');
  const found = rules(text);
  assert.ok(found.includes('warnung ac-wort AC-01'));
  assert.ok(found.includes('warnung tag-fehlt Was, wie, wo, warum'));
  assert.equal(lintSpec(text).metrics.fehler, 0);
});

test('lintSpec_FreeSpecWithGitTag_Warns', () => {
  assert.ok(rules(VALID_SPEC.replace('Kunden exportieren. · Aussage', 'Kunden exportieren. · Git')).includes('warnung tag-art Was, wie, wo, warum'));
});

test('lintSpec_ArtTypoAndWrongStatus_AreHeaderErrors', () => {
  const found = rules(VALID_SPEC.replace('Art: frei', 'Art: frie').replace('bestätigt am 2026-10-01', 'fertig'));
  assert.ok(found.includes('fehler kopf-art Kopf'));
  assert.ok(found.includes('fehler kopf-status Kopf'));
});

test('lintSpec_SectionsSwapped_OrderError', () => {
  const text = VALID_SPEC.replace('## Soll-Vorgaben', '## TMP').replace('## Theoretisches Verhalten nach Umsetzung', '## Soll-Vorgaben').replace('## TMP', '## Theoretisches Verhalten nach Umsetzung');
  assert.ok(rules(text).includes('fehler abschnitt-reihenfolge Kopf'));
});

test('lintSpec_BrokenWEntry_IsError', () => {
  assert.ok(rules(VALID_SPEC.replace('- **W · Format** · Aussage — CSV.', '- **W · Format** — CSV.')).includes('fehler w-form Entscheidungen'));
});

test('lintSpec_AbortStatusCountsOpenEntries', () => {
  const aborted = `${VALID_SPEC.replace('Status: bestätigt am 2026-10-01', 'Status: Abbruch am 2026-10-01, 2 Punkte offen')}\n## Offen, bewusst nicht weiterverfolgt (Abbruch)\n- **Rechte** · ungeklärt — Wer darf exportieren?\n`;
  assert.ok(rules(aborted).includes('fehler abbruch-anzahl Kopf'));
  assert.deepEqual(rules(aborted.replace('2 Punkte offen', '1 Punkt offen')), []);
  assert.ok(rules(`${VALID_SPEC}\n## Offen, bewusst nicht weiterverfolgt (Abbruch)\n- **X** · ungeklärt — y\n`)
    .includes('fehler abschnitt-unbekannt Offen, bewusst nicht weiterverfolgt (Abbruch)'));
});

test('lintSpec_LinesInsideCodeFence_Ignored', () => {
  const text = VALID_SPEC.replace('## Soll-Vorgaben\n', '## Soll-Vorgaben\n```\n## Kein Abschnitt\nsiehe https://x.y\n```\n');
  assert.deepEqual(rules(text), []);
});

test('cli_ErrorsExitOneAndWriteJson', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-lint-'));
  const spec = path.join(dir, 'spec.md');
  const json = path.join(dir, 'lint.json');
  fs.writeFileSync(spec, VALID_SPEC.replace('**AC-02**', '**AC-03**'));
  const result = spawnSync(process.execPath, [SCRIPT, spec, '--json', json], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^LINT fehler=1 warnungen=0 ac=2 w=1 ohne-tag=0\nFEHLER ac-luecke · AC-03: /);
  assert.equal(JSON.parse(fs.readFileSync(json, 'utf8')).metrics.fehler, 1);
});

test('cli_CleanSpecExitZero_MissingArgumentExitTwo', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-lint-'));
  const spec = path.join(dir, 'spec.md');
  fs.writeFileSync(spec, VALID_SPEC);
  assert.equal(spawnSync(process.execPath, [SCRIPT, spec], { encoding: 'utf8' }).status, 0);
  assert.equal(spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' }).status, 2);
});

test('lintSpec_SpecWithoutAnyAcId_ErrorAcKeine', () => {
  // Arrange
  const text = VALID_SPEC.replace(/- \*\*AC-0[12]\*\*.*\n/g, '');

  // Act
  const found = rules(text);

  // Assert
  assert.ok(found.includes('fehler ac-keine Akzeptanzkriterien'), found.join(', '));
});
