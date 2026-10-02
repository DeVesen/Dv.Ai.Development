'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { answeredKeys, verdictMap, fromSaved, openFromRounds, openFromFollowup } = require('../scripts/lib/open-groups');

const rated = (key, label, color, extra = {}) => ({
  key, label, color, reviewers: ['clarity'],
  items: [{ reviewer: 'clarity', category: 'detail', color, place: { key, label }, finding: { quote: 'q', consequence: `Folge ${label}`, rationale: 'g' } }], ...extra,
});
const verdict = (location, value) => ({ location, verdict: value, rationale: 'r', source: 'ki' });

test('answeredKeys_AnsweredAndOpen_ReturnsOnlyAnsweredKeys', () => {
  const keys = answeredKeys([{ location: 'AC-04', status: 'answered' }, { location: 'AC-07', status: 'open' }, null]);
  assert.deepEqual([...keys], ['ac-4']);
});

test('verdictMap_Verdicts_MapsPlaceKeyToVerdict', () => {
  const map = verdictMap({ verdicts: [verdict('AC-04', 'erledigt'), verdict('AC-07', 'nicht erledigt')] });
  assert.equal(map.get('ac-4'), 'erledigt');
  assert.equal(map.get('ac-7'), 'nicht erledigt');
  assert.equal(verdictMap(null).size, 0);
});

test('openFromRounds_DoneRedAnsweredYellowAndGreen_AreNotOpen', () => {
  const one = { groups: [rated('ac-1', 'AC-01', 'red'), rated('ac-4', 'AC-04', 'red'), rated('ac-7', 'AC-07', 'yellow'), rated('ac-8', 'AC-08', 'yellow'), rated('ac-9', 'AC-09', 'green')] };
  const two = { verdicts: [verdict('AC-01', 'erledigt'), verdict('AC-04', 'nicht erledigt')], groups: [] };
  const open = openFromRounds({ one, two, answered: new Set(['ac-8']) });
  assert.deepEqual(open.map((group) => `${group.color}:${group.label}`), ['red:AC-04', 'yellow:AC-07']);
});

test('openFromRounds_RedWithoutVerdictWhileVerified_IsNotOpenBecauseQuestionCoversIt', () => {
  const one = { groups: [rated('ac-4', 'AC-04', 'red')] };
  assert.deepEqual(openFromRounds({ one, two: { verdicts: [], groups: [] }, answered: new Set() }), []);
});

test('openFromRounds_NoVerification_AllRedAndYellowExceptAnsweredAreOpen', () => {
  const one = { groups: [rated('ac-4', 'AC-04', 'red'), rated('ac-7', 'AC-07', 'yellow'), rated('ac-8', 'AC-08', 'red')] };
  const open = openFromRounds({ one, two: null, answered: new Set(['ac-8']) });
  assert.deepEqual(open.map((group) => group.label), ['AC-04', 'AC-07']);
});

test('openFromRounds_RoundTwoGroups_AreOpenAndReplaceSamePlaceFromRoundOne', () => {
  const one = { groups: [rated('ac-7', 'AC-07', 'yellow')] };
  const two = { verdicts: [], groups: [rated('ac-7', 'AC-07', 'yellow', { reviewers: ['nachprüfer'] }), rated('ac-2', 'AC-02', 'red'), rated('ac-3', 'AC-03', 'green')] };
  const open = openFromRounds({ one, two, answered: new Set() });
  assert.deepEqual(open.map((group) => `${group.color}:${group.label}:${group.reviewers}`), ['red:AC-02:clarity', 'yellow:AC-07:nachprüfer']);
});

test('openFromRounds_Group_CarriesBlockScoutKeyAndConsequence', () => {
  const [group] = openFromRounds({ one: { groups: [rated('ac-7', 'AC-07', 'yellow')] }, two: null, answered: new Set() });
  assert.equal(group.scoutKey, '🟡 AC-07');
  assert.equal(group.consequence, 'Folge AC-07');
  assert.match(group.block, /^### 🟡 AC-07 \(clarity\)\n- \[clarity · detail\]/);
});

const saved = (number, severity, location, extra = {}) => ({
  number, severity, location, reviewers: ['clarity'], proposals: ['x'], preferred: 1,
  findings: [`- [clarity · detail] Zitat: \u201Ex\u201C · Konsequenz: Folge ${location} · Begründung: b`], ...extra,
});

test('fromSaved_SavedGroup_BuildsOpenGroupWithConsequenceFromFindingLine', () => {
  const group = fromSaved(saved(2, '🟡', 'AC-07'));
  assert.equal(group.color, 'yellow');
  assert.equal(group.consequence, 'Folge AC-07');
  assert.equal(group.scoutKey, '🟡 AC-07');
  assert.equal(group.block.split('\n')[0], '### 🟡 AC-07 (clarity)');
});

test('openFromFollowup_UnchosenNotDoneAndFresh_AreOpenChosenDoneIsNot', () => {
  const groups = [saved(1, '🔴', 'AC-01'), saved(2, '🟡', 'AC-02'), saved(3, '🟡', 'AC-03'), saved(4, '🟡', 'AC-04')];
  const two = { verdicts: [verdict('AC-01', 'erledigt'), verdict('AC-02', 'nicht erledigt')], groups: [rated('ac-9', 'AC-09', 'red')] };
  const open = openFromFollowup({ saved: groups, chosen: new Set([1, 2]), two });
  assert.deepEqual(open.map((group) => `${group.color}:${group.label}`), ['red:AC-02', 'red:AC-09', 'yellow:AC-03', 'yellow:AC-04']);
  assert.equal(open[0].scoutKey, '🟡 AC-02');
});

test('openFromFollowup_NoVerification_ChosenGroupsStayOpen', () => {
  const open = openFromFollowup({ saved: [saved(1, '🔴', 'AC-01'), saved(2, '🟡', 'AC-02')], chosen: new Set([1]), two: null });
  assert.deepEqual(open.map((group) => group.label), ['AC-01', 'AC-02']);
});
