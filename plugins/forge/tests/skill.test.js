'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'spec-review', 'SKILL.md');
const AGENTS = ['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'].map((name) => `dv-forge:spec-review-${name}`);

test('skill_Frontmatter_ManualOnlyWithoutRoundsArgument', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'spec-review');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<spec.md> [quelle.md] [--only <reviewer,...>]');
});

test('skill_Body_DefinesPluginRootSessionAndReadsSharedFlow', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
  assert.ok(body.includes('`<SESSION>` = `${CLAUDE_SESSION_ID}`'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" spec-review $ARGUMENTS'));
  assert.ok(!body.includes('review-loop/loop.md'));
});

test('skill_Body_NamesEveryBuildingBlockOfTheFlow', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const agent of [...AGENTS, 'dv-forge:spec-rework', 'dv-forge:spec-review-verifier', 'dv-forge:spec-review-scout']) assert.ok(body.includes(agent), `${agent} fehlt`);
  for (const heading of ['## Beratend\nKeine.', '## Skript-Prüfungen\nKeine.', '## Nachprüfer\n`dv-forge:spec-review-verifier`', '## Scout\n`dv-forge:spec-review-scout`']) {
    assert.ok(body.includes(heading), `${heading} fehlt`);
  }
  assert.ok(body.includes('Dokument `<DOC>` = `<S>`, Rolle `spec-review`'));
});

test('skill_Body_ProfilesReviewerGetsIndexAndExcerpt', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`Profil-Index: <PI>`'));
  assert.ok(body.includes('`Profil-Auszug: <PA>`'));
});

test('skill_Body_ScoutGetsRepoWhenAnchoredAndProfileIndexWithProfiles', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`dv-forge:spec-review-scout` — `Spec: <S>` und, nur bei `art=verankert`, `Repo: <R>`; bei `profile=ja` zusätzlich `Profil-Index: <PI>`'));
});

test('skill_Body_ReworkGetsRepoOnlyWhenAnchored', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`dv-forge:spec-rework` — `Spec: <S>` und, nur bei `art=verankert`, `Repo: <R>`'));
});

test('skill_Report_DelegatedToScript', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Titel `Spec-Review`, Artefakt `<S>`; den Rest liefert `report` (Ergebnis, Entscheidungen, Offenes, Hinweise, nächste Schritte).'));
  for (const gone of ['- `Fragen offen`:', '- `nicht bereit, …`:', '/dv-forge:plan-writing <S>', 'Offene 🟡', 'Auswahl: b =', 'Spec nicht bereit']) assert.equal(body.includes(gone), false, gone);
});

test('skill_Warnings_LeftToReport', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const part of ['2. Die `WARN`-Zeilen musst du nicht weitergeben; der Bericht enthält die Hinweise.']) assert.ok(body.includes(part), part);
  for (const gone of ['Spec ist bereit. Spec committen', '/dv-forge:review-followup <S> <auswahl>', 'Hinweise des Orchestrators', 'der Lauf stellt sie wieder']) assert.equal(body.includes(gone), false, gone);
});

test('skill_Body_NoRoundCapOrOldStops', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.doesNotMatch(body, /--rounds|Cap erreicht|Stillstand|rework-outcome\.js|Zusatz-Stopps|Abschluss-Scout/);
});

test('skill_Body_StaysUnder500WordsWithPairedQuotes', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(wordCount(body) < 500);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});
