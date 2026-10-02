'use strict';

// Offene Gruppen am Ende eines Laufs: was noch zu tun bleibt und deshalb gesichert und im Bericht genannt wird.

const { ICON, renderGroup } = require('./groups');
const { collapse, placeKey } = require('./places');

const COLOR_OF_ICON = { '🔴': 'red', '🟡': 'yellow', '🟢': 'green' };
const RANK = { red: 0, yellow: 1, green: 2 };
const CONSEQUENCE = /Konsequenz: (.*?) · Begründung:/;

function answeredKeys(answers) {
  return new Set(answers.filter((entry) => entry?.status === 'answered' && typeof entry.location === 'string').map((entry) => placeKey(entry.location)));
}

function verdictMap(two) {
  return new Map((two?.verdicts ?? []).map((verdict) => [placeKey(verdict.location), verdict.verdict]));
}

function fromRated(group) {
  return {
    color: group.color, label: group.label, key: group.key, reviewers: group.reviewers,
    consequence: group.items[0].finding.consequence, scoutKey: `${ICON[group.color]} ${collapse(group.label)}`, block: renderGroup(group),
  };
}

function fromSaved(group) {
  return {
    color: COLOR_OF_ICON[group.severity], label: group.location, key: placeKey(group.location), reviewers: group.reviewers,
    consequence: CONSEQUENCE.exec(group.findings[0] ?? '')?.[1] ?? '', scoutKey: `${group.severity} ${group.location}`,
    block: [`### ${group.severity} ${group.location} (${group.reviewers.join(', ')})`, ...group.findings].join('\n'),
  };
}

// Pro Stelle und Farbe bleibt die letzte Gruppe; rot steht vor gelb.
function dedupe(groups) {
  const byKey = new Map(groups.map((group) => [`${group.color}:${group.key}`, group]));
  return [...byKey.values()].sort((a, b) => RANK[a.color] - RANK[b.color]);
}

function openInRoundOne(group, state) {
  if (group.color === 'green' || state.answered.has(group.key)) return false;
  if (group.color === 'yellow' || !state.verified) return true;
  return state.verdicts.get(group.key) === 'nicht erledigt';
}

// Runde 1: gelbe Hinweise ohne Antwort und 🔴 mit Urteil nicht erledigt; Nachprüfung: alle nicht grünen Gruppen.
// Eine 🔴 ohne Urteil bei vorhandener Nachprüfung hängt an einer offenen Frage und steht dort, nicht hier.
function openFromRounds({ one, two, answered }) {
  const state = { answered, verified: two !== null, verdicts: verdictMap(two) };
  const first = (one?.groups ?? []).filter((group) => openInRoundOne(group, state));
  const second = (two?.groups ?? []).filter((group) => group.color !== 'green');
  return dedupe([...first, ...second].map(fromRated));
}

// Followup: nicht gewählte Gruppen, gewählte ohne bestätigte Umsetzung (dann 🔴) und neue Gruppen der Nachprüfung.
function openFromFollowup({ saved, chosen, two }) {
  const verdicts = verdictMap(two);
  const unchosen = saved.filter((group) => !chosen.has(group.number)).map(fromSaved);
  const notDone = saved
    .filter((group) => chosen.has(group.number) && (two === null || verdicts.get(placeKey(group.location)) === 'nicht erledigt'))
    .map((group) => ({ ...fromSaved(group), color: 'red' }));
  const fresh = (two?.groups ?? []).filter((group) => group.color !== 'green').map(fromRated);
  return dedupe([...unchosen, ...notDone, ...fresh]);
}

module.exports = { answeredKeys, verdictMap, fromSaved, openFromRounds, openFromFollowup };
