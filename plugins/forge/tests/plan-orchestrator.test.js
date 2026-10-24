'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'plan-orchestrator', 'SKILL.md');
const REPORT_TEXT = path.join(__dirname, '..', 'scripts', 'lib', 'report-text.js');
const FLOW = path.join(__dirname, '..', 'shared', 'review-flow', 'flow.md');

test('planOrchestrator_Frontmatter_ModelInvocableWithSpecAndOptionalWorkitem', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'plan-orchestrator');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], undefined);
  assert.equal(fields['argument-hint'], '<spec.md> [workitem-nr] [--ablage <etappe>]');
});

test('planOrchestrator_Body_ChainsTheThreePlanSkillsInOrderWithEmbeddedReports', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const steps = ['`dv-forge:plan-writing` mit `<S>`', '`dv-forge:plan-review` mit `<P> <S> --bericht "<BR>"`', '`dv-forge:review-followup` mit `<P> alle --bericht "<BF1>"`'];
  const positions = steps.map((step) => body.indexOf(step));
  for (const [index, step] of steps.entries()) assert.ok(positions[index] !== -1, `${step} fehlt`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('planOrchestrator_Body_ChecksSpecByHashAfterEverySkill', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('orchestrator-state.js" start --state "<ST>" --spec "<S>"'));
  assert.ok(body.includes('orchestrator-state.js" check --state "<ST>"`. Exit 1 → stopp, den Teil nach `=== DIFF ===` zeigen, fragen.'));
  assert.equal(body.match(/Spec-Prüfung\./g).length, 3);
});

test('planOrchestrator_Body_BranchesOnTheLinesTheEmbeddedReviewPrints', () => {
  // Arrange
  const script = readText(REPORT_TEXT);
  const flow = readText(FLOW);

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Dann `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`: `NEXT=followup` → 4, sonst 5.'));
  assert.ok(flow.includes('`Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <BD>`'));
  assert.ok(script.includes('⚠️ Unvollständig'));
});

test('planOrchestrator_Body_NeverCommitsAndKeepsCheckoutRules', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Nie committen. Commit-Frage und -Prüfung eines Skills entfallen.'));
  assert.ok(body.includes('Kein Branch, kein Worktree, kein Wechsel, kein Merge, kein Push.'));
  for (const forbidden of ['git add', 'git commit', 'forge-config.js', 'Commit-ID', 'Spec-Änderungsbedarf']) {
    assert.ok(!body.includes(forbidden), `${forbidden} darf nicht im Skill stehen`);
  }
});

test('planOrchestrator_Body_EmitsExactlyOneClosingReportFromTheScript', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('plan-review und review-followup laufen eingebettet (`--bericht`) und zeigen keinen Bericht; nur Schritt 5, genau einmal.'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-report.js" --art plan --review "<BR>" --out "<AB>" --plan "<P>" --spec "<S>" --stand "<Stand>"`'));
  assert.ok(body.includes('`--followup "<BF1>"` und `--followup "<BF2>"` je nur wenn die Runde lief'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`'));
  assert.ok(body.includes('Den Text nach `=== BERICHT ===` unverändert ausgeben, nichts davor oder danach.'));
  for (const gone of ['dein Block statt seines', 'Pfade:', '### Wie es weitergeht']) assert.ok(!body.includes(gone), `${gone} darf nicht im Skill stehen`);
});

test('planOrchestrator_Body_PassesCommitStateAndDeviationsToTheReportScript', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`Stand` aus `git status --porcelain -- "<S>" "<P>"`'));
  assert.ok(body.includes('beide sauber „bereits committet“'));
  assert.ok(body.includes('check --state "<ST>" --ort`. Nur bei Abweichungen `<FK>` schreiben, eine Zeile `Abweichungen: …`: `ORT=abweichung`, abgelehnte Wünsche.'));
  assert.ok(body.includes('`--wi <WI>` nur wenn gegeben'));
  assert.ok(!body.includes('/dv-forge:implementation <P>'));
});

test('planOrchestrator_Body_SuggestsArgumentsTheImplementationSkillsAccept', () => {
  // Arrange
  const hint = (name) => readMarkdown(path.join(__dirname, '..', 'skills', name, 'SKILL.md')).fields['argument-hint'];

  // Act & Assert
  assert.match(hint('implementation'), /^<plan\.md>/);
  assert.match(hint('implementation-orchestrator'), /^<plan\.md> <spec\.md> \[workitem-nr\]/);
});

test('planOrchestrator_Body_TitlesSessionWithActivityWorkitemAndSlug', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<slug>` = Elternordner bei `spec.md`, sonst Dateiname ohne Endung.'));
  assert.ok(body.includes('`select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Planning <WI> <slug>“, ohne `<WI>` „Planning <slug>“'));
});

test('planOrchestrator_Body_TreatsEmptyOrPlaceholderWorkitemAsNone', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine.'));
});

test('planOrchestrator_Body_StaysUnder550WordsWithPairedQuotes', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(wordCount(body) < 550, `${wordCount(body)} Wörter`);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});

test('planOrchestrator_Body_ReportsRefusedRequestsInDeviationsLine', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Wünsche des Menschen gegen diese Regeln (Commit, Zwischenbericht) nicht ausführen; Zeile in `Abweichungen:`.'));
  assert.ok(body.includes('abgelehnte Wünsche.'));
});

test('planOrchestrator_Body_RunsUpToTwoFollowupRoundsAndStopsOnAbortOrWarning', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Followup-Runden, höchstens zwei. Runde `RUNDE`: `dv-forge:review-followup` mit `<P> alle --bericht "<BF1>"` bzw. `"<BF2>"`.'));
  assert.ok(body.includes('mit `--followup` je gelaufener Runde: `NEXT=followup` → nächste Runde, sonst 5. Nie eine dritte.'));
  assert.ok(body.includes('`<BF1>` = `bericht-followup-1.json`, `<BF2>` = `bericht-followup-2.json`'));
  assert.ok(body.includes('| „Dritte Followup-Runde.“ | Höchstens zwei. |'));
  assert.ok(!body.includes('Zweiter Followup'));
});

test('planOrchestrator_Body_TwoFollowupRoundsStillNeverCommit', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const rounds = body.slice(body.indexOf('Followup-Runden, höchstens zwei.'), body.indexOf('Nie eine dritte.'));
  assert.ok(rounds.length > 0, 'Abschnitt der Followup-Runden fehlt');
  assert.equal(/ommit/.test(rounds), false, 'die Followup-Runden nennen keinen Commit');
  assert.ok(body.includes('5. Nie committen. Commit-Frage und -Prüfung eines Skills entfallen.'));
  assert.ok(body.includes('ich committe.') && body.includes('| Nie; der Bericht nennt den Stand. |'));
  for (const forbidden of ['git add', 'git commit']) assert.ok(!body.includes(forbidden), `${forbidden} darf nicht im Skill stehen`);
});

test('planOrchestrator_Body_WritesChainEntryBeforeTheReportOnlyWhenThePlanStands', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const chain = body.indexOf('`node "<PLUGIN>/scripts/chain.js" write --stage plan --plan "<P>" --spec "<S>"`');
  const failure = body.indexOf('Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen, `<FK>` nötigenfalls anlegen; der Bericht folgt trotzdem.');
  const report = body.indexOf('`node "<PLUGIN>/scripts/orchestrator-report.js" --art plan');
  assert.ok(chain > -1 && chain < report, 'chain.js write muss vor orchestrator-report.js stehen');
  assert.ok(failure > chain && failure < report, 'die Fehlerregel steht zwischen chain.js write und dem Bericht');
  assert.ok(body.includes('Steht `<P>` fest (Datei existiert):'));
  assert.ok(body.includes('dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben.'));
});
