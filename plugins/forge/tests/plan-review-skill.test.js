'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'plan-review', 'SKILL.md');
const REVIEWERS = ['coverage', 'feasibility', 'architecture', 'risks', 'buildability'];

test('planReviewSkill_Frontmatter_ManualOnlyWithoutRoundsArgument', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'plan-review');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<plan.md> [spec.md] [--only <reviewer,...>]');
});

test('planReviewSkill_Body_ReadsSharedFlowWithPlaceholders', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
  assert.ok(body.includes('`<SESSION>` = `${CLAUDE_SESSION_ID}`'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" plan-review $ARGUMENTS'));
});

test('planReviewSkill_Body_NamesEveryBuildingBlockOfTheFlow', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const reviewer of REVIEWERS) assert.ok(body.includes(`dv-forge:plan-review-${reviewer}`), `${reviewer} fehlt`);
  for (const heading of ['## Beratend\nKeine.', '## Nacharbeiter\n`dv-forge:plan-rework`', '## Nachprüfer\n`dv-forge:plan-review-verifier`', '## Scout\n`dv-forge:plan-review-scout`']) {
    assert.ok(body.includes(heading), `${heading} fehlt`);
  }
  assert.ok(body.includes('`aktiv` kommt aus `prepare.js`'));
  assert.ok(body.includes('Du startest genau die Reviewer aus `aktiv`'));
  assert.ok(body.includes('Dokument `<DOC>` = `<P>`, Rolle `plan-review`'));
});

test('planReviewSkill_Body_ScriptChecksRunThroughReviewFlow', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('## Skript-Prüfungen\n`node "${CLAUDE_PLUGIN_ROOT}/scripts/review-flow.js" script-checks <FLAGS> --runde <runde>`'));
});

test('planReviewSkill_Body_AnchorFileAndCommandsGoToReviewers', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('die Anker-Datei `A`'));
  assert.ok(body.includes('und je Warnung eine Zeile `WARN` (der Bericht enthält die Hinweise).'));
  assert.equal(body.includes('Hinweise des Orchestrators'), false);
  assert.ok(body.includes('Jeder Reviewer bekommt zusätzlich `Anker: <A>`, wenn es `A` gibt.'));
  assert.ok(body.includes('`Build: <Build>`, `Test: <Test>`, `Lint: <Lint>`'));
});

test('planReviewSkill_Body_NoAnchorRefreshAfterRework', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.doesNotMatch(body, /plan-tasks\.js" anchors/);
  assert.ok(!body.includes('## Nach der Nacharbeit'));
});

test('planReviewSkill_Body_SpecQuestionDoesNotPause', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Eine Spec-Rückfrage hält den Lauf nicht an'));
  assert.ok(body.includes('sie steht im Bericht unter den offenen Fragen'));
  assert.ok(body.includes('den Rest liefert `report`'));
});

test('planReviewSkill_Body_CleanReportHandsOverToImplementation', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.match(body, /Soll ich Spec und Plan jetzt committen\?/);
  assert.ok(body.includes('forge-config.js" get Commit-Konvention'));
  assert.ok(body.includes('git status --porcelain -- "<S>" "<P>"'));
  assert.match(body, /Leere Ausgabe: beide sind committet, keine Frage/);
});

test('planReviewSkill_Body_CommitOutcomesAndOnlyHintInNextStep', () => {
  // Act
  const { body } = readMarkdown(SKILL);
  const next = body.slice(body.indexOf('## Bericht'));

  // Assert
  for (const part of [
    'Nach dem Ja committest du beide Dateien',
    'Bei Nein oder ohne Antwort: kein Commit.',
    'Schlägt der Commit fehl: die Fehlermeldung wörtlich ausgeben.',
  ]) {
    assert.ok(next.includes(part), `${part} fehlt`);
  }
});

test('planReviewSkill_Body_NextStepOffersReviewFollowup', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('den Rest liefert `report`'));
  for (const gone of ['/dv-forge:review-followup', 'Offene 🟡', 'Auswahl: b =']) assert.equal(body.includes(gone), false, gone);
});

test('planReviewSkill_Body_NoRoundCapOrOldStops', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.doesNotMatch(body, /--rounds|Cap erreicht|Stillstand|rework-outcome\.js|Zusatz-Stopps|Abschluss-Scout/);
});

test('planReviewSkill_Body_StaysUnder500Words', () => {
  // Act
  const words = wordCount(readMarkdown(SKILL).body);

  // Assert
  assert.ok(words < 500, `${words} Wörter`);
});
