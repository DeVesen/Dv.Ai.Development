'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { anchorsOf } = require('../scripts/lib/must-show');
const { finding, setup, tempDir, writeJsonFile, flow, runUntilRework } = require('./lib/review-flow-fixture');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'orchestrator-report.js');
const HEADINGS = ['# Abschlussbericht', '# Was sich im Plan geändert hat', '# Was ist noch offen', '# Wie es weitergeht'];
const PLAN = '/repo/docs/forge/x/plan.md';
const SPEC = '/repo/docs/forge/x/spec.md';

function entry(color, key, overrides = {}) {
  return { key, color, title: `Titel ${key}`, description: `Beschreibung ${key}.`, recommendation: null, angles: 'Machbarkeit', hasProposal: true, ...overrides };
}

function change(key, ok, overrides = {}) {
  return { key, ok, title: `Änderung ${key}`, angles: 'Machbarkeit', description: `Beschreibung ${key}.`, change: `Geändert ${key}.`, evidence: null, choice: null, ...overrides };
}

// Berichtsdaten wie aus `review-flow.js report --bericht`; `open`, `changes` usw. überschreiben den sauberen Stand.
function part(overrides = {}) {
  return {
    format: 1, review: 'plan-review', followup: false, status: 'sauber nach Runde 1', kind: 'ready', resultLine: '**Ergebnis:** ✅ Bereit zur Umsetzung',
    flowLine: 'Ablauf: Prüfung aus fünf Blickwinkeln, keine Überarbeitung, keine Nachprüfung.', offersFollowup: false,
    openRed: 0, failedLabels: [], changes: [], decisions: [], questions: [], open: [], notes: [], ...overrides,
  };
}

function writePart(dir, name, value) {
  const file = path.join(dir, name);
  writeJsonFile(file, value);
  return file;
}

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

// Plan-Lauf mit Review-Daten und optional Followup-Daten; liefert den Berichtstext.
function planReport(review, followup, extra = []) {
  const dir = tempDir('dv-forge-orch-');
  const args = ['--art', 'plan', '--review', writePart(dir, 'review.json', review), '--out', path.join(dir, 'abschluss.md'), '--plan', PLAN, '--spec', SPEC, '--stand', 'Spec uncommittet, Plan uncommittet', ...extra];
  if (followup) args.push('--followup', writePart(dir, 'followup.json', followup));
  const result = run(args);
  assert.equal(result.status, 0, result.stderr);
  const text = result.stdout.split('=== BERICHT ===\n')[1].trimEnd();
  assert.equal(fs.readFileSync(path.join(dir, 'abschluss.md'), 'utf8').trimEnd(), text);
  return text;
}

function sectionOf(text, heading) {
  const start = text.indexOf(`${heading}\n`);
  assert.ok(start > -1, `${heading} fehlt`);
  const end = text.indexOf('\n# ', start + 1);
  return text.slice(start + heading.length + 1, end === -1 ? undefined : end);
}

test('orchestratorReport_ReadyPlanWithoutFollowup_FourHeadingsAndImplementationOrchestratorStep', () => {
  // Act
  const text = planReport(part(), null, ['--wi', 'AB#42']);

  // Assert
  assert.deepEqual(text.split('\n').filter((line) => line.startsWith('# ')), HEADINGS);
  assert.match(sectionOf(text, '# Abschlussbericht'), /^\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung\nAblauf: Prüfung aus fünf Blickwinkeln/);
  assert.equal(sectionOf(text, '# Was sich im Plan geändert hat').trim(), 'Keine Änderung.');
  assert.equal(sectionOf(text, '# Was ist noch offen').trim(), 'Nichts weiter offen.');
  assert.equal(sectionOf(text, '# Wie es weitergeht'), [
    '1. Spec und Plan committen. Stand: Spec uncommittet, Plan uncommittet.',
    '2. Implementieren (erst nach 1; sonst fehlen Plan und Spec im Worktree):',
    `   \`/dv-forge:implementation-orchestrator ${PLAN} ${SPEC} AB#42\``,
  ].join('\n'));
  assert.doesNotMatch(text, /review-followup|Pfade:|\/dv-forge:implementation /);
});

test('orchestratorReport_BlockedPlan_NamesFollowupAndPlanReviewButNoImplementation', () => {
  // Arrange
  const review = part({ status: 'nicht bereit, 1 × 🔴 offen', kind: 'blocked', openRed: 1, open: [entry('red', 'task 2')] });

  // Act
  const text = planReport(review, null);

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 1 Hindernis offen/);
  const next = sectionOf(text, '# Wie es weitergeht');
  assert.match(next, /^1\. Spec und Plan committen\. Stand: Spec uncommittet, Plan uncommittet\. Nach dem Followup erneut committen\.\n/);
  assert.match(next, /2\. Das Hindernis einarbeiten lassen \(oder das Dokument selbst anpassen\):\n {3}`\/dv-forge:review-followup \/repo\/docs\/forge\/x\/plan\.md alle`/);
  assert.match(next, /3\. Danach erneut prüfen:\n {3}`\/dv-forge:plan-review \/repo\/docs\/forge\/x\/plan\.md`/);
  assert.match(next, /4\. Implementieren erst nach ✅ Bereit zur Umsetzung\.$/);
  assert.doesNotMatch(next, /implementation-orchestrator/);
});

test('orchestratorReport_OpenRedAndYellow_ListsHindranceBeforeHintAndBlocks', () => {
  // Arrange
  const review = part({ kind: 'blocked', openRed: 1, open: [entry('yellow', 'task 1'), entry('red', 'task 3', { recommendation: 'Fehlerfall testen, weil er sonst unbemerkt bleibt.' })] });

  // Act
  const open = sectionOf(planReport(review, null), '# Was ist noch offen');

  // Assert
  assert.match(open, /^- 🔴 \*\*Titel task 3\*\* · aus: Machbarkeit\n {2}Beschreibung task 3\.\n {2}Vorschlag \(empfohlen\): Fehlerfall testen/);
  assert.ok(open.indexOf('🔴') < open.indexOf('🟡'));
});

test('orchestratorReport_OnlyHintsOpen_ReadyWithHintsAndOptionalFollowupBeforeImplementation', () => {
  // Arrange
  const review = part({ kind: 'hints', open: [entry('yellow', 'task 1')] });

  // Act
  const text = planReport(review, null);

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung · 1 kleiner Hinweis offen/);
  assert.match(sectionOf(text, '# Wie es weitergeht'), /2\. Den Hinweis einarbeiten lassen \(optional\):[\s\S]*3\. Implementieren \(erst nach 1/);
});

test('orchestratorReport_SamePlaceInRoundOneAndFollowup_ShowsOneEntryWithFollowupEndState', () => {
  // Arrange
  const review = part({
    status: 'nicht bereit, 1 × 🔴 offen', kind: 'blocked', openRed: 1,
    changes: [change('task 2', false), change('task 4', true)], open: [entry('red', 'task 2')],
  });
  const followup = part({ followup: true, status: 'sauber nach Nachprüfung', flowLine: 'Ablauf: 1 gewählter Vorschlag umgesetzt, eine Nachprüfung.', changes: [change('task 2', true, { choice: 1, change: 'Fehlerpfad ergänzt.' })] });

  // Act
  const text = planReport(review, followup);

  // Assert
  const changed = sectionOf(text, '# Was sich im Plan geändert hat');
  assert.equal(changed.match(/Änderung task 2/g).length, 1);
  assert.match(changed, /^- ✅ \*\*Änderung task 2\*\*[\s\S]*Änderung: Fehlerpfad ergänzt\.\n {2}Gewählt: Vorschlag 1\n {2}Nachprüfung: bestätigt\./);
  assert.ok(changed.indexOf('task 2') < changed.indexOf('task 4'), 'der Followup ersetzt den Eintrag an seinem Platz');
  assert.doesNotMatch(changed, /⚠️/);
  assert.equal(sectionOf(text, '# Was ist noch offen').trim(), 'Nichts weiter offen.');
  assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung\nAblauf: Prüfung aus fünf Blickwinkeln, keine Überarbeitung, keine Nachprüfung\.\nFollowup: 1 gewählter Vorschlag umgesetzt, eine Nachprüfung\./);
});

test('orchestratorReport_ReviewHindranceWithoutProposal_StaysOpenAfterFollowup', () => {
  // Arrange
  const review = part({ kind: 'blocked', openRed: 2, open: [entry('red', 'task 2'), entry('red', 'kopf', { hasProposal: false })] });
  const followup = part({ followup: true, changes: [change('task 2', true)] });

  // Act
  const text = planReport(review, followup);

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 1 Hindernis offen/);
  assert.match(sectionOf(text, '# Was ist noch offen'), /^- 🔴 \*\*Titel kopf\*\*/);
  assert.match(sectionOf(text, '# Wie es weitergeht'), /Das Hindernis hat keinen Lösungsvorschlag\. Das Dokument selbst anpassen, dann erneut prüfen:/);
});

test('orchestratorReport_QuestionsAndDecisions_GoToOpenAndChangedSections', () => {
  // Arrange
  const review = part({ status: 'Fragen offen', kind: 'questions', questions: ['Soll der Export CSV liefern?'], decisions: [{ title: 'Rundung', decision: 'kaufmännisch' }] });

  // Act
  const text = planReport(review, null);

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ❓ 1 Frage offen/);
  assert.match(sectionOf(text, '# Was ist noch offen'), /^- ❓ Soll der Export CSV liefern\?/);
  assert.match(sectionOf(text, '# Was sich im Plan geändert hat'), /\*\*Deine Entscheidungen:\*\*\n- \*\*Rundung:\*\* kaufmännisch/);
  assert.match(sectionOf(text, '# Wie es weitergeht'), /Die Spec anpassen\.[\s\S]*Implementieren erst nach ✅ Bereit zur Umsetzung\./);
});

test('orchestratorReport_NotesAndFacts_StandInClosingSectionWithoutPaths', () => {
  // Arrange
  const dir = tempDir('dv-forge-orch-');
  const facts = path.join(dir, 'fakten.md');
  fs.writeFileSync(facts, 'Abweichungen: Commit-Wunsch abgelehnt.\n');
  const review = part({ notes: ['Der Scout hat beim ersten Mal kein gültiges Ergebnis geliefert und wurde erneut angefragt.'] });

  // Act
  const closing = sectionOf(planReport(review, null, ['--fakten', facts]), '# Abschlussbericht');

  // Assert
  assert.match(closing, /\*\*Hinweise zum Ablauf:\*\*\n- Der Scout hat beim ersten Mal/);
  assert.match(closing, /Abweichungen: Commit-Wunsch abgelehnt\.\n$/);
  assert.doesNotMatch(closing, /\/repo\//);
});

test('orchestratorReport_ReviewFileMissing_IncompleteWithRerun', () => {
  // Arrange
  const dir = tempDir('dv-forge-orch-');

  // Act
  const result = run(['--art', 'spec', '--review', path.join(dir, 'fehlt.json'), '--out', path.join(dir, 'a.md'), '--spec', SPEC, '--commit', 'nichts zu committen']);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Review ohne Bericht/);
  assert.match(result.stdout, /1\. Spec committen\. Ergebnis: nichts zu committen\.\n2\. Den Lauf in einer frischen Session erneut starten:\n {3}`\/dv-forge:spec-review \/repo\/docs\/forge\/x\/spec\.md`\n3\. Planen erst nach ✅ Bereit zum Planen\./);
});

test('orchestratorReport_ReadySpec_CommitResultAndPlanOrchestratorStep', () => {
  // Arrange
  const dir = tempDir('dv-forge-orch-');
  const review = writePart(dir, 'review.json', part({ review: 'spec-review', resultLine: '**Ergebnis:** ✅ Bereit zum Planen' }));

  // Act
  const result = run(['--art', 'spec', '--review', review, '--out', path.join(dir, 'a.md'), '--spec', SPEC, '--commit', 'a1b2c3d']);

  // Assert
  assert.match(result.stdout, /# Was sich in der Spec geändert hat\n/);
  assert.match(result.stdout, /# Wie es weitergeht\n1\. Spec committen\. Ergebnis: a1b2c3d\.\n2\. Plan \(frische Session\):\n {3}`\/dv-forge:plan-orchestrator \/repo\/docs\/forge\/x\/spec\.md`\n$/);
});

function implementationArgs(dir, review, check, extra = []) {
  return ['--art', 'implementation', '--review', writePart(dir, 'review.json', review), '--out', path.join(dir, 'a.md'), '--plan', PLAN, '--spec', SPEC,
    '--worktree', '/repo-wt', '--branch', 'feature/x', '--pruefung', check, ...extra];
}

test('orchestratorReport_ReadyImplementationWithGreenChecks_FinishWorkInWorktreeAndPushLine', () => {
  // Arrange
  const dir = tempDir('dv-forge-orch-');
  const facts = path.join(dir, 'fakten.md');
  fs.writeFileSync(facts, 'Feature-Branch: feature/x\nModus: Worktree\n');
  const review = part({ review: 'implementation-review', resultLine: '**Ergebnis:** ✅ Bereit zum Abschließen', checked: ['- Bereich: `a1b2c3d..HEAD`'], found: ['- Akzeptanz: 0 Hindernisse, 0 Hinweise'] });

  // Act
  const result = run(implementationArgs(dir, review, 'gruen', ['--fakten', facts]));

  // Assert
  assert.equal(result.status, 0, result.stderr);
  const text = result.stdout.split('=== BERICHT ===\n')[1];
  assert.match(text, /^# Abschlussbericht\n\*\*Ergebnis:\*\* ✅ Bereit zum Abschließen\n[\s\S]*\*\*Geprüft:\*\*\n- Bereich: `a1b2c3d\.\.HEAD`\n\*\*Gefunden:\*\*\n- Akzeptanz[\s\S]*Feature-Branch: feature\/x\nModus: Worktree\n/);
  assert.match(text, /# Was sich im Code geändert hat\nKeine Änderung\./);
  assert.match(text, /# Wie es weitergeht\nWorktree bleibt: \/repo-wt\n1\. Arbeit abschließen \(nur manuell, in \/repo-wt\):\n {3}`\/dv-forge:finish-work`\nNicht gepusht: `git push -u origin feature\/x`\n$/);
});

test('orchestratorReport_ReadyImplementationWithRedChecks_NoFinishWork', () => {
  // Arrange
  const dir = tempDir('dv-forge-orch-');

  // Act
  const result = run(implementationArgs(dir, part({ review: 'implementation-review' }), 'rot'));

  // Assert
  assert.match(result.stdout, /1\. Build, Test oder Lint nicht grün: selbst beheben, dann erneut prüfen:\n {3}`\/dv-forge:implementation-review \/repo\/docs\/forge\/x\/plan\.md \/repo\/docs\/forge\/x\/spec\.md`/);
  assert.doesNotMatch(result.stdout, /finish-work/);
});

test('orchestratorReport_BlockedImplementation_FollowupWithSpecFlag', () => {
  // Arrange
  const dir = tempDir('dv-forge-orch-');
  const review = part({ review: 'implementation-review', kind: 'blocked', openRed: 1, open: [entry('red', 'src/a.js:3')] });

  // Act
  const result = run(implementationArgs(dir, review, 'keine'));

  // Assert
  assert.match(result.stdout, /`\/dv-forge:review-followup \/repo\/docs\/forge\/x\/plan\.md alle --spec \/repo\/docs\/forge\/x\/spec\.md`/);
});

test('orchestratorReport_Report_AnchorsAreTheFourHeadingsForTheStopHook', () => {
  // Act
  const text = planReport(part(), null);

  // Assert
  assert.deepEqual(anchorsOf(text), HEADINGS);
});

test('orchestratorReport_MissingRequiredOption_ExitsWithTwoAndUsage', () => {
  // Act
  const result = run(['--art', 'plan', '--review', 'x.json', '--out', 'a.md', '--plan', PLAN]);

  // Assert
  assert.equal(result.status, 2);
  assert.match(result.stderr, /fehlt: --spec, --stand/);
});

// Ende zu Ende über review-flow.js: Runde 1 ändert AC-04, die Nachprüfung sagt „nicht erledigt“; der Followup erledigt es.
const SCOUT_AC04 = [
  '## Scout-Vorschläge', '',
  '### 🔴 AC-04', 'Titel: Grenzwert festlegen', 'Beschreibung: Der Grenzwert ist nicht bestimmt.', 'Empfehlung: Den Wert festlegen, weil Tests ihn brauchen.', '1. D festlegen.', '**Bevorzugt: 1** — klar.', '',
].join('\n');
const SAVED_AC04 = '=== REWORK ===\n### 🔴 AC-04 (consistency)\n- [consistency · widerspruch] Zitat: „x“ · Konsequenz: Folge · Begründung: Grund\n';
const VERDICT = (verdict) => ({ verdicts: [{ location: 'AC-04', verdict, rationale: verdict }], findings: [] });

function embeddedReview(file) {
  const env = setup();
  runUntilRework(env, [finding({ location: 'AC-04', quote: 'x', category: 'widerspruch' })]);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'scout.md'), SCOUT_AC04);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed', change: 'Erster Versuch.' }], questions: [] });
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), VERDICT('nicht erledigt'));
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  return flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Spec-Review', '--artefakt', SPEC, '--bericht', file);
}

function embeddedFollowup(file) {
  const env = setup();
  const source = ['--quelle', 'nacharbeit'];
  flow('snapshot', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'sicherung-vorher', 'aggregate.md'), SAVED_AC04);
  writeJsonFile(path.join(env.workspace, 'sicherung-vorher', 'scout.md'), SCOUT_AC04);
  writeJsonFile(path.join(env.workspace, 'followup.json'), { gewaehlt: [{ nummer: 1, stufe: '🔴', stelle: 'AC-04', vorschlag: 1 }], offen: [] });
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'aggregate.md'), SAVED_AC04);
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed', change: 'Grenzwert festgelegt.' }] });
  flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), VERDICT('erledigt'));
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  return flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Review-Followup (spec-review)', '--artefakt', SPEC, ...source, '--bericht', file);
}

test('orchestratorReport_EndToEndRoundOneNotDoneThenFollowupDone_OneConfirmedEntryAndNothingOpen', () => {
  // Arrange
  const dir = tempDir('dv-forge-orch-');
  const reviewFile = path.join(dir, 'bericht-review.json');
  const followupFile = path.join(dir, 'bericht-followup.json');
  const review = embeddedReview(reviewFile);
  const followup = embeddedFollowup(followupFile);

  // Act
  const result = run(['--art', 'spec', '--review', reviewFile, '--followup', followupFile, '--out', path.join(dir, 'a.md'), '--spec', SPEC, '--commit', 'a1b2c3d']);

  // Assert
  assert.equal(review.stdout, `ENDE nicht bereit, 1 × 🔴 offen\nERGEBNIS ⛔ Noch nicht bereit · 1 Hindernis offen\nFOLLOWUP ja\nBERICHT ${reviewFile}\n`);
  assert.match(followup.stdout, /^ENDE sauber nach Nachprüfung\nERGEBNIS ✅ Bereit zum Planen\nFOLLOWUP nein\n/);
  assert.equal(result.status, 0, result.stderr);
  const text = result.stdout.split('=== BERICHT ===\n')[1];
  const changed = sectionOf(text, '# Was sich in der Spec geändert hat');
  assert.equal(changed.match(/Grenzwert festlegen/g).length, 1);
  assert.match(changed, /^- ✅ \*\*Grenzwert festlegen\*\*[\s\S]*Änderung: Grenzwert festgelegt\.\n {2}Gewählt: Vorschlag 1\n {2}Nachprüfung: bestätigt\./);
  assert.equal(sectionOf(text, '# Was ist noch offen').trim(), 'Nichts weiter offen.');
  assert.match(text, /^# Abschlussbericht\n\*\*Ergebnis:\*\* ✅ Bereit zum Planen\n/);
});
