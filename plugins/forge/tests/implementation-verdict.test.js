'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { verdictOf, verdictLine } = require('../scripts/lib/implementation-verdict');
const { tempDir } = require('./lib/review-flow-fixture');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'implementation-verdict.js');

function taskReport({ findings = [], outside = [], verdict = 'freigegeben — Alles erfüllt.' }) {
  return [
    '### Spec-Treue', '- ✅ erfüllt', '', '### Stärken', '- `src/a.js:3` — klar', '',
    '### Findings', ...(findings.length > 0 ? findings : ['- keine']), '',
    ...(outside.length > 0 ? ['### Außerhalb des Scopes', ...outside, ''] : []),
    '### Urteil', `**Task:** ${verdict}`,
  ].join('\n');
}

function reReport({ damages = ['- keine'], verdict = 'alle behoben, keine neuen 🔴' }) {
  return ['### Findings', '- **Leere Liste** — behoben — src/a.js:4', '', '### Neue Schäden im Fix-Diff', ...damages, '', '### Außerhalb', '- keine', '', '### Urteil', `**Fix-Runde:** ${verdict}`].join('\n');
}

function finalReport({ findings = [], deferred = [], verdict = 'ja — bereit.' }) {
  return ['### Stärken', '- klar', '', '### Findings', ...(findings.length > 0 ? findings : ['- keine']), '', '### Zurückgestellt', ...(deferred.length > 0 ? deferred : ['- keine']), '', '### Urteil', `**Übergabe:** ${verdict}`].join('\n');
}

const RED = '- 🔴 `src/a.js:3` — Absturz — weil leer — Prüfung ergänzen';
const YELLOW = '- 🟡 `src/b.js:9` — Name — unklar — umbenennen';
const GREEN = '- 🟢 `src/c.js:1` — Hinweis';

const CASES = [
  ['TaskClean', taskReport({}), 'URTEIL freigegeben ROT=0 GELB=0'],
  ['TaskFreigegebenWithYellowAndGreen', taskReport({ findings: [YELLOW, GREEN] }), 'URTEIL freigegeben ROT=0 GELB=1'],
  ['TaskFreigegebenButRed', taskReport({ findings: [RED, YELLOW] }), 'URTEIL nachbessern (korrigiert: 🔴 vorhanden) ROT=1 GELB=1'],
  ['TaskNachbessern', taskReport({ findings: [RED], verdict: 'nachbessern — Absturz bei leerer Liste.' }), 'URTEIL nachbessern ROT=1 GELB=0'],
  ['TaskRedOnlyOutsideScope', taskReport({ outside: ['- 🔴 `src/z.js:1` — fremd — egal'] }), 'URTEIL freigegeben ROT=0 GELB=0'],
  ['ReReviewClean', reReport({}), 'URTEIL sauber ROT=0 GELB=0'],
  ['ReReviewCleanButNewRedDamage', reReport({ damages: ['- 🔴 `src/a.js:7` — Absturz'] }), 'URTEIL nachbessern (korrigiert: 🔴 vorhanden) ROT=1 GELB=0'],
  ['ReReviewOpen', reReport({ damages: ['- 🟡 `src/a.js:7` — magisch'], verdict: 'offen: Leere Liste' }), 'URTEIL offen ROT=0 GELB=1'],
  ['FinalJa', finalReport({}), 'URTEIL ja ROT=0 GELB=0 BEHEBEN=0'],
  ['FinalJaWithRed', finalReport({ findings: [RED] }), 'URTEIL mit-korrekturen (korrigiert: 🔴 vorhanden) ROT=1 GELB=0 BEHEBEN=0'],
  ['FinalJaWithBeheben', finalReport({ deferred: ['- Name — beheben — trägt andere Arbeit', '- Doku — bleibt — egal'] }), 'URTEIL mit-korrekturen (korrigiert: beheben-Punkte vorhanden) ROT=0 GELB=0 BEHEBEN=1'],
  ['FinalMitKorrekturen', finalReport({ findings: [RED], verdict: 'mit Korrekturen — ein Absturz.' }), 'URTEIL mit-korrekturen ROT=1 GELB=0 BEHEBEN=0'],
  ['FinalNein', finalReport({ findings: [RED], verdict: 'nein — Task 2 fehlt.' }), 'URTEIL nein ROT=1 GELB=0 BEHEBEN=0'],
];

for (const [name, report, expected] of CASES) {
  test(`verdictLine_${name}_PrintsVerdictAndCounts`, () => {
    // Act
    const result = verdictOf(report);

    // Assert
    assert.equal(result.problem, undefined);
    assert.equal(verdictLine(result), expected);
  });
}

test('verdictOf_NoVerdictLine_ReportsProblem', () => {
  // Arrange
  const report = taskReport({ findings: [YELLOW] }).replace(/### Urteil[\s\S]*$/, '');

  // Act
  const result = verdictOf(report);

  // Assert
  assert.match(result.problem, /Urteilszeile fehlt/);
});

test('verdictOf_UnreadableVerdictValue_ReportsProblem', () => {
  assert.match(verdictOf(taskReport({ verdict: 'vielleicht — mal sehen.' })).problem, /Urteil nicht lesbar: vielleicht/);
});

function runScript(args, input) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', input });
}

test('implementationVerdict_ReportFile_PrintsLineWithExitZero', () => {
  // Arrange
  const file = path.join(tempDir('dv-forge-verdict-'), 'review.md');
  fs.writeFileSync(file, taskReport({ findings: [RED] }));

  // Act
  const result = runScript([file]);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'URTEIL nachbessern (korrigiert: 🔴 vorhanden) ROT=1 GELB=0\n');
});

test('implementationVerdict_DashReadsStdin', () => {
  const result = runScript(['-'], reReport({}));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'URTEIL sauber ROT=0 GELB=0\n');
});

test('implementationVerdict_MissingVerdictLine_ExitOne', () => {
  const result = runScript(['-'], '### Findings\n- 🟡 `a.js:1` — x\n');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Urteilszeile fehlt/);
});

test('implementationVerdict_MissingFile_ExitOne', () => {
  assert.equal(runScript([path.join(tempDir('dv-forge-verdict-'), 'gibt-es-nicht.md')]).status, 1);
});

test('implementationVerdict_WrongArguments_ExitTwo', () => {
  assert.equal(runScript([]).status, 2);
});
