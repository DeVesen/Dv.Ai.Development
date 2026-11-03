'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { reviewerLabel, isKnownReviewer } = require('../scripts/lib/reviewer-names');

const AGENTS = path.join(__dirname, '..', 'agents');
const NOT_REVIEWERS = new Set(['scout', 'rework', 'verifier']);

test('reviewerLabel_SpecReviewer_ReturnsClearName', () => {
  assert.equal(reviewerLabel('spec-review', 'clarity'), 'Klarheit');
  assert.equal(reviewerLabel('spec-review', 'profiles'), 'Fachbegriffe');
});

test('reviewerLabel_SameShortNameInTwoFlows_FollowsTheFlow', () => {
  assert.equal(reviewerLabel('spec-review', 'feasibility'), 'Machbarkeit');
  assert.equal(reviewerLabel('plan-review', 'feasibility'), 'Reihenfolge und Machbarkeit');
  assert.equal(reviewerLabel('implementation-review', 'risks'), 'Risiken');
});

test('reviewerLabel_ScriptReviewer_ReturnsScriptCheck', () => {
  assert.equal(reviewerLabel('spec-review', 'skript'), 'Skript-Prüfung');
  assert.equal(reviewerLabel('spec-review', 'skript:begriffe'), 'Skript-Prüfung');
});

test('reviewerLabel_UnknownName_ReturnsTheNameItself', () => {
  assert.equal(reviewerLabel('spec-review', 'unbekannt'), 'unbekannt');
});

test('isKnownReviewer_KnownScriptAndUnknown_Distinguishes', () => {
  assert.equal(isKnownReviewer('spec-review', 'clarity'), true);
  assert.equal(isKnownReviewer('spec-review', 'skript:x'), true);
  assert.equal(isKnownReviewer('spec-review', 'coverage'), false);
});

test('reviewerLabel_EveryReviewerAgent_HasAnEntry', () => {
  const flows = ['spec-review', 'plan-review', 'implementation-review'];
  const reviewers = fs.readdirSync(AGENTS).filter((file) => file.endsWith('.md')).map((file) => file.slice(0, -3))
    .map((name) => flows.map((flow) => [flow, name.slice(flow.length + 1)]).find(([flow]) => name.startsWith(`${flow}-`)))
    .filter((pair) => pair && !NOT_REVIEWERS.has(pair[1]));
  assert.ok(reviewers.length >= 15, `nur ${reviewers.length} Reviewer gefunden`);
  for (const [flow, name] of reviewers) assert.equal(isKnownReviewer(flow, name), true, `${flow}-${name}`);
});
