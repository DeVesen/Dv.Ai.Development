'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');

const DIR = path.join(__dirname, '..', 'skills', 'review-followup');
const SKILL = path.join(DIR, 'SKILL.md');
const FLOW = path.join(DIR, 'references', 'flow.md');

test('reviewFollowupSkill_Frontmatter_ManualOnlyWithArgumentHint', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'review-followup');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<spec.md|plan.md> <auswahl>');
});

test('reviewFollowupSkill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('reviewFollowupSkill_Body_OrchestratesPrepareUmsetzenNachReviewEnde', () => {
  const { body } = readMarkdown(SKILL);
  for (const part of ['${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" review-followup $ARGUMENTS', 'references/flow.md',
    '${CLAUDE_PLUGIN_ROOT}/skills/<original>/SKILL.md', '`original`', '`offen`', 'dv-forge:implementation-implementer', 'dv-forge:implementation-re-reviewer',
    'Nachprüfung, genau eine', 'kein Reviewer läuft', 'shared/review-flow/flow.md', 'scripts/workspace.js" remove <rolle> <slug>', 'scripts/guard-orchestrator.js" release', 'run_in_background: false']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
});

test('reviewFollowupFlow_Reference_SpecAndPlanWithoutReviewerRound', () => {
  const text = readText(FLOW);
  assert.doesNotMatch(text, /--expect <aktiv>|--round 1|plan-tasks.js" anchors/);
});

test('reviewFollowupFlow_Reference_FailedReworkOrVerifierStillReportsWithoutSaveOrDrop', () => {
  const text = readText(FLOW);
  assert.ok(text.includes('Meldet `attempt` für `nacharbeit` oder `nachprüfer` `AUSGEFALLEN`, geht es statt mit dem Abschnitt Ende von `flow.md` mit Schritt 5 der Nachprüfung (`report`) weiter, danach Schritt 6 ohne `save` und ohne `drop`.'));
});

test('reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation', () => {
  assert.ok(fs.existsSync(FLOW));
  const text = readText(FLOW);
  for (const part of ['Vorschläge: <F>', 'Eintrag: R<n>', 'Ergebnis: <W>/nacharbeit/rework.json', '--quelle nacharbeit', 'review-flow.js" snapshot --dir "<W>" --doc "<DOC>"',
    'review-flow.js" rework-check <FLAGS>', 'review-flow.js" checklist <FLAGS>', 'review-flow.js" verify <FLAGS>', 'review-flow.js" report <FLAGS> --titel "Review-Followup (<original>)"',
    'review-flow.js" script-checks <FLAGS> --runde runde-2',
    'Prüfliste: <W>/runde-2/pruefliste.md', 'Kein Reviewer läuft.', 'followup.js" save <rolle> <slug> "<W>/abschluss"', 'followup.js" drop <rolle> <slug>',
    'plan-tasks.js" header "<P>" "<W>"', 'review-package.js" <FIX_BASE> HEAD "<W>"', 'followup.js" drop review <slug>', 'Kein Scout', 'nicht gewählt',
    'bleibt die alte Sicherung', '### Umgesetzt', 'WAHL', 'keine Änderung', 'blockiert', '- `Fragen offen`:', '- `nicht bereit, …`:', '- `unvollständig, …`:']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
});

test('reviewFollowupSkill_Body_ShowsReportFileBeforeCleanupAndKeepsPriority', () => {
  const { body } = readMarkdown(SKILL);
  const show = body.indexOf('scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<W>/abschluss/bericht.md"');
  assert.ok(show > -1, 'show fehlt');
  assert.ok(show < body.indexOf('scripts/workspace.js" remove <rolle> <slug>'), 'show muss vor remove stehen');
  assert.ok(body.includes('Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Bericht.'));
  assert.ok(wordCount(body) < 500);
});

test('reviewFollowupFlow_Report_KeepsPriority', () => {
  const text = readText(FLOW);
  const report = text.slice(text.indexOf('## Bericht'), text.indexOf('## Nächster Schritt'));
  assert.ok(report.includes('Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Bericht.'));
});
